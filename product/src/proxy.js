import readline from 'node:readline';
import crypto from 'node:crypto';
import { toolHash, schemaHash as computeSchemaHash, short, stable } from './hash.js';
import { loadPins, pinTool, savePins, ensureServer, detectShadows, annotationsEqual } from './pins.js';
import { logEvent } from './events.js';
import { sendAlert, queueAlert } from './alerts.js';
import { evaluateCall, loadPolicies as loadPoliciesForProxy } from './policies.js';
import { canaryEnabled, appendTrace, capPayload, MAX_PENDING } from './canary.js';
import { scanResult, resultSummary } from './results.js';
import { loadVault, substituteArgs, redactResult } from './vault.js';

/**
 * The RugSnare live proxy (v0.2): the integrity gate between an MCP client
 * and one stdio server. Process spawning is deliberately NOT done here —
 * the proxy receives already-created stdio streams ({ stdin, stdout,
 * stderr, onExit }) from the caller. See `rugsnare run` in cli.js.
 *
 * Behavior on a tools/list response:
 *  - observe mode: pass through untouched; alert on DRIFT and NEW
 *  - enforce mode: DRIFT and unapproved NEW tools are stripped from the
 *    response and replaced by a `rugsnare_alert` tool explaining why
 * Every tools/call is logged (tool name + timestamp; args only if opted in).
 */

export function createProxy({ name, server, streams, mode = 'observe', config, cwd = process.cwd(), writeOut = (s) => process.stdout.write(s + '\n'), writeErr = (s) => process.stderr.write(s + '\n') }) {
  const pins = loadPins(cwd);
  const serverPin = ensureServer(pins, name, null);
  const activePolicies = loadPoliciesForProxy(cwd);
  let pinsDirty = false;

  // Canary capture (opt-in, see src/canary.js): id-correlated request/response
  // pairs + serverInfo sniffed from the initialize handshake.
  const canary = canaryEnabled(config);
  const pendingCalls = canary ? new Map() : null; // id -> { tool, args, t0 }
  let serverInfoSeen = false;

  // Per-session call budgets + kill-switch (policies.budgets / policies.disabled,
  // v0.8): a runaway agent burns the budget and gets blocked (enforce) or
  // flagged once (observe); a disabled tool NEVER runs in any mode.
  const budgets = activePolicies?.budgets ?? null;
  const disabled = Array.isArray(activePolicies?.disabled) ? activePolicies.disabled : [];
  const callCounts = new Map(); // tool -> calls this session
  const budgetAlerted = new Set();

  // Loop/stuck detector (advisory only — never blocks): N identical calls
  // (same tool + same args fingerprint) in a row with no other tool between.
  const LOOP_THRESHOLD = Number.isInteger(config?.loopThreshold) ? config.loopThreshold : 5;
  let loopRun = { fingerprint: null, count: 0, alerted: false };

  // Secret vault (v0.7): placeholders go out, secrets come back scrubbed.
  // The model writes {{VAULT:name}}; logging/canary/policies all operate on
  // the PLACEHOLDER form — only the bytes on the wire to the server change.
  const vault = loadVault(cwd);
  let lineToSend = null; // set when vault substitution rewrote the message

  const alert = async (status, tool, extra = {}) => {
    const payload = { kind: 'rugsnare.alert', status, server: name, tool, mode, ...extra };
    // Propagate driftType for debounced summary classification
    if (extra.driftType) payload.driftType = extra.driftType;
    writeErr(`[rugsnare] ${status}: ${name}/${tool}${extra.driftType ? ` (${extra.driftType})` : ''}${extra.oldHash ? ` ${short(extra.oldHash)} -> ${short(extra.hash)}` : ''}`);
    logEvent(payload, cwd);
    queueAlert(config, payload, cwd);
  };

  // ---- client -> server: log tool calls + evaluate policies + fail-open ----
  const clientIn = readline.createInterface({ input: streams.clientIn });
  clientIn.on('line', (line) => {
    let shouldForward = true;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      // Non-JSON line from the client (protocol noise) — forward untouched, same as server->client.
      // Not a proxy failure: don't pollute the event log with proxy-fail-open entries.
      logEvent({ kind: 'client-nonjson', server: name, len: line.length }, cwd);
      try {
        streams.server.stdin.write(line + '\n');
      } catch (writeErr) {
        logEvent({ kind: 'proxy-write-fail', server: name, reason: String(writeErr).slice(0, 200) }, cwd);
      }
      return;
    }
    try {
      if (msg.method === 'tools/call' && msg.params) {
        const call = {
          kind: 'call',
          server: name,
          tool: msg.params.name,
          hasArgs: Boolean(msg.params.arguments && Object.keys(msg.params.arguments).length),
        };
        if (config.logCallArgs) call.args = msg.params.arguments;
        logEvent(call, cwd);

        // loop/stuck signal: same tool + same arguments, repeatedly, nothing else between
        if (LOOP_THRESHOLD > 0) {
          const fingerprint = crypto.createHash('sha256')
            .update(msg.params.name + '|' + JSON.stringify(stable(msg.params.arguments ?? {})))
            .digest('hex').slice(0, 16);
          if (fingerprint === loopRun.fingerprint) {
            loopRun.count += 1;
            if (loopRun.count >= LOOP_THRESHOLD && !loopRun.alerted) {
              loopRun.alerted = true; // one alert per stuck run, not per call
              writeErr(`[rugsnare] LOOP-SUSPECTED: ${name}/${msg.params.name} called ${loopRun.count}x with identical arguments and no other tool in between`);
              logEvent({ kind: 'loop-suspected', server: name, tool: msg.params.name, count: loopRun.count, threshold: LOOP_THRESHOLD }, cwd);
            }
          } else {
            loopRun = { fingerprint, count: 1, alerted: false };
          }
        }

        if (canary && msg.id !== undefined) {
          if (pendingCalls.size >= MAX_PENDING) {
            const oldest = pendingCalls.keys().next().value;
            pendingCalls.delete(oldest); // safety valve: never grow unbounded
          }
          pendingCalls.set(msg.id, { tool: msg.params.name, args: msg.params.arguments ?? null, t0: Date.now() });
        }

        // Policy evaluation: check arguments against rules
        const toolPin = serverPin.tools[msg.params.name];
        const policyResult = evaluateCall(
          { toolName: msg.params.name, arguments: msg.params.arguments, description: toolPin?.description ?? '' },
          activePolicies
        );

        if (!policyResult.allowed) {
          shouldForward = false;
          const reasons = policyResult.blocked.map((b) => b.reason).join('; ');
          writeErr(`[rugsnare] POLICY BLOCK: ${name}/${msg.params.name} — ${reasons}`);
          logEvent({ kind: 'policy-block', server: name, tool: msg.params.name, blocked: policyResult.blocked, pii: policyResult.pii?.hits ?? [] }, cwd);

          // Send a JSON-RPC error response back to the client (don't leave it hanging)
          const errorResponse = {
            jsonrpc: '2.0',
            id: msg.id,
            error: {
              code: -32603,
              message: `[RUGSNARE] Tool call blocked by policy: ${reasons}. If this is a false positive, update .rugsnare/policies.json`,
            },
          };
          writeOut(JSON.stringify(errorResponse));
        } else if (policyResult.requiresApproval.length > 0 && mode === 'enforce') {
          // In enforce mode, require-approval rules also block (human must approve)
          shouldForward = false;
          const reasons = policyResult.requiresApproval.map((r) => r.reason).join('; ');
          writeErr(`[rugsnare] POLICY APPROVAL REQUIRED: ${name}/${msg.params.name} — ${reasons}`);
          logEvent({ kind: 'policy-approval-required', server: name, tool: msg.params.name, rules: policyResult.requiresApproval }, cwd);
          const errorResponse = {
            jsonrpc: '2.0',
            id: msg.id,
            error: {
              code: -32603,
              message: `[RUGSNARE] This tool requires human approval: ${reasons}. Run with --mode observe to allow with alert only.`,
            },
          };
          writeOut(JSON.stringify(errorResponse));
        } else if (policyResult.pii) {
          // PII detected but no deny rule matched — log it
          logEvent({ kind: 'pii-detected', server: name, tool: msg.params.name, hits: policyResult.pii.hits }, cwd);
        }

        // kill-switch: a disabled tool never runs, in ANY mode
        if (shouldForward && disabled.includes(msg.params.name)) {
          shouldForward = false;
          writeErr(`[rugsnare] KILL-SWITCH: ${name}/${msg.params.name} is disabled in policies.json — call blocked`);
          logEvent({ kind: 'kill-switch-block', server: name, tool: msg.params.name }, cwd);
          writeOut(JSON.stringify({
            jsonrpc: '2.0', id: msg.id,
            error: { code: -32603, message: `[RUGSNARE] Tool "${msg.params.name}" is disabled by the operator (policies.json kill-switch).` },
          }));
        }

        // per-session budget: observe warns once past the cap, enforce blocks
        if (shouldForward && budgets && Number.isInteger(budgets[msg.params.name])) {
          const cap = budgets[msg.params.name];
          const n = (callCounts.get(msg.params.name) ?? 0) + 1;
          callCounts.set(msg.params.name, n);
          if (n > cap) {
            if (mode === 'enforce') {
              shouldForward = false;
              writeErr(`[rugsnare] BUDGET EXCEEDED: ${name}/${msg.params.name} — cap ${cap} call(s) per session, this is #${n}. Blocked.`);
              logEvent({ kind: 'budget-block', server: name, tool: msg.params.name, cap, call: n }, cwd);
              writeOut(JSON.stringify({
                jsonrpc: '2.0', id: msg.id,
                error: { code: -32603, message: `[RUGSNARE] Call budget exceeded for "${msg.params.name}": cap ${cap} per session (this is #${n}).` },
              }));
            } else if (!budgetAlerted.has(msg.params.name)) {
              budgetAlerted.add(msg.params.name);
              writeErr(`[rugsnare] BUDGET EXCEEDED (observe): ${name}/${msg.params.name} past cap ${cap} — call #${n} forwarded; switch to enforce to block`);
              logEvent({ kind: 'budget-exceeded', server: name, tool: msg.params.name, cap, call: n }, cwd);
            }
          }
        }
      }
    } catch (proxyErr) {
      if (config?.failMode === 'closed') {
        // Fail-closed: proxy internal error → BLOCK the message (integrity over availability)
        shouldForward = false;
        logEvent({ kind: 'proxy-fail-closed', server: name, reason: String(proxyErr).slice(0, 200) }, cwd);
        writeErr(`[rugsnare] proxy error (fail-closed, BLOCKED): ${String(proxyErr).slice(0, 100)}`);
        if (msg && msg.id !== undefined) {
          writeOut(JSON.stringify({
            jsonrpc: '2.0',
            id: msg.id,
            error: { code: -32603, message: '[RUGSNARE] Blocked in fail-closed mode: proxy internal error. Set "failMode": "open" in .rugsnare/config.json to forward on error.' },
          }));
        }
      } else {
        // Fail-open (default): proxy internal error → forward anyway, log the failure
        logEvent({ kind: 'proxy-fail-open', server: name, reason: String(proxyErr).slice(0, 200) }, cwd);
        writeErr(`[rugsnare] proxy error (fail-open, forwarding): ${String(proxyErr).slice(0, 100)}`);
      }
    }
    if (shouldForward) {
      // Vault substitution is the LAST step before the wire: everything above
      // (logging, canary, loop fingerprint, policies) saw the placeholder form
      if (vault && msg?.method === 'tools/call' && msg.params) {
        const { args, used } = substituteArgs(msg.params.arguments, vault);
        if (used.length > 0) {
          msg.params.arguments = args;
          lineToSend = JSON.stringify(msg);
          logEvent({ kind: 'vault-substitute', server: name, tool: msg.params.name, names: used }, cwd); // names, never values
        }
      }
      const out = lineToSend ?? line;
      try {
        streams.server.stdin.write(out + '\n');
      } catch (writeErr) {
        // Server pipe broken → fail-open: log and let the client handle reconnection
        logEvent({ kind: 'proxy-write-fail', server: name, reason: String(writeErr).slice(0, 200) }, cwd);
      }
      lineToSend = null;
    }
  });

  // ---- server -> client: integrity gate ----
  const serverOut = readline.createInterface({ input: streams.server.stdout });
  serverOut.on('line', (rawLine) => {
    let line = rawLine;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      writeOut(line);
      return;
    }

    // Vault redaction runs BEFORE canary capture and result inspection: the
    // corpus and the signals must see the placeholder form, and a server
    // echoing a secret back — in a result OR an error message — must never
    // reach the model in cleartext (review 28, P1: errors were not scrubbed).
    if (vault && msg?.id !== undefined && (msg.result || msg.error)) {
      if (msg.result) {
        const { result: scrubbed, redacted } = redactResult(msg.result, vault);
        if (redacted.length > 0) {
          msg.result = scrubbed;
          line = JSON.stringify(msg);
          logEvent({ kind: 'vault-redact', server: name, requestId: msg.id, names: redacted }, cwd); // names, never values
        }
      }
      if (msg.error) {
        const { result: scrubbedErr, redacted } = redactResult(msg.error, vault);
        if (redacted.length > 0) {
          msg.error = scrubbedErr;
          line = JSON.stringify(msg);
          logEvent({ kind: 'vault-redact', server: name, requestId: msg.id, names: redacted, in: 'error' }, cwd);
        }
      }
    }

    const tools = msg?.result?.tools;

    // Canary capture: sniff server identity, then close any pending call by id.
    if (canary) {
      if (!serverInfoSeen && msg?.result?.serverInfo) {
        serverInfoSeen = true;
        appendTrace({ kind: 'server-info', server: name, serverInfo: msg.result.serverInfo }, cwd);
      }
      if (msg?.id !== undefined && pendingCalls.has(msg.id)) {
        const { tool, args, t0 } = pendingCalls.get(msg.id);
        pendingCalls.delete(msg.id);
        const ok = !msg.error;
        const { payload, truncated } = capPayload(ok ? msg.result : msg.error);
        appendTrace(
          { kind: 'call-trace', server: name, tool, args, ok, [ok ? 'result' : 'error']: payload, truncated, ms: Date.now() - t0 },
          cwd
        );
      }
    }

    // Result inspection: scan every tool-call response for injection indicators
    // (GhostSplice class: poisoned result carries the payload the description hinted at)
    if (msg?.id !== undefined && msg.result && !tools) {
      const resultScan = scanResult(msg.result, { threshold: config?.resultThreshold });
      if (resultScan.advisory) {
        writeErr(`[rugsnare] RESULT-INJECTION-SUSPECTED: response to #${msg.id} scored ${resultScan.score}: ${resultSummary(resultScan.signals)}`);
        logEvent({ kind: 'result-advisory', server: name, requestId: msg.id, score: resultScan.score, signals: resultScan.signals.map((s) => s.id) }, cwd);
        // advisory-only: the result is still forwarded (blocking would hide data)
      }
    }

    if (Array.isArray(tools) && tools.length > 0) {
      const verdicts = tools.map((tool) => {
        const hash = toolHash(tool);
        const pin = serverPin.tools[tool.name];
        // annotation flip with an identical hash: text+schema unchanged, but the
        // behavioral hints changed (e.g. readOnlyHint:true -> destructive) — still drift
        const annFlip = Boolean(pin) && pin.hash === hash && pin.annotations !== undefined && !annotationsEqual(pin.annotations, tool.annotations);
        return { tool, hash, pin, annFlip, status: !pin ? 'NEW' : pin.hash !== hash ? 'DRIFT' : annFlip ? 'DRIFT' : 'UNCHANGED' };
      });

      for (const v of verdicts) {
        if (v.status === 'NEW' && !v.pin) {
          pinTool(serverPin, v.tool, v.hash, { approved: false });
          pinsDirty = true;
          alert('NEW', v.tool.name, { hash: v.hash }); // alert in every mode: enforce quarantines, but the human must still hear it
        } else if (v.status === 'DRIFT') {
          if (v.annFlip) {
            alert('DRIFT', v.tool.name, { driftType: 'ANNOTATION', oldHash: v.pin.hash, hash: v.hash, oldAnnotations: v.pin.annotations ?? null, newAnnotations: v.tool.annotations ?? null });
          } else {
            const liveSchemaHash = computeSchemaHash(v.tool);
            const driftType = v.pin.schemaHash !== liveSchemaHash ? 'BREAKING' : 'COSMETIC';
            alert('DRIFT', v.tool.name, { driftType, oldHash: v.pin.hash, hash: v.hash, oldDescription: v.pin.description, newDescription: v.tool.description });
          }
        }
        // Cross-server shadow: tool name also pinned under a different server
        const otherServer = Object.keys(pins.servers ?? {}).find(
          (other) => other !== name && pins.servers[other]?.tools?.[v.tool.name]
        );
        if (otherServer) {
          alert('SHADOW', v.tool.name, { alsoIn: otherServer, note: 'client resolution order decides which implementation runs' });
        }
      }
      if (pinsDirty) {
        savePins(pins, cwd);
        pinsDirty = false;
      }

      if (mode === 'enforce') {
        const allowed = new Set(
          verdicts
            .filter((v) => v.status === 'UNCHANGED' || (v.status === 'NEW' && v.pin?.approved))
            .map((v) => v.tool.name)
        );
        const blocked = verdicts.filter((v) => !allowed.has(v.tool.name));
        // kill-switch: a disabled tool is hidden from the contract in enforce
        for (const v of verdicts) {
          if (allowed.has(v.tool.name) && disabled.includes(v.tool.name)) {
            allowed.delete(v.tool.name);
            blocked.push({ ...v, status: 'DISABLED' });
          }
        }
        if (blocked.length > 0) {
          msg.result.tools = [
            ...verdicts.filter((v) => allowed.has(v.tool.name)).map((v) => v.tool),
            {
              name: 'rugsnare_alert',
              description:
                `[RUGSNARE] ${blocked.length} tool(s) quarantined on this server: ` +
                blocked.map((v) => `${v.tool.name} (${v.status})`).join(', ') +
                `. A tool description changed after approval (rug pull) or appeared without approval. ` +
                `Run \`rugsnare diff\` to inspect, \`rugsnare approve ${name}\` after review.`,
              inputSchema: { type: 'object', properties: {} },
            },
          ];
          logEvent({ kind: 'quarantine', server: name, blocked: blocked.map((v) => ({ tool: v.tool.name, status: v.status })) }, cwd);
        }
      }
      writeOut(JSON.stringify(msg));
      return;
    }

    writeOut(line);
  });

  streams.server.stderr?.on('data', (chunk) => process.stderr.write(`[server] ${chunk}`));
  const onExit = (code) => {
    if (pinsDirty) savePins(pins, cwd);
    if (canary) {
      // Calls that never got a response before the server died — record as
      // ok:false, error:'no-response' so the corpus stays honest.
      for (const { tool, args, t0 } of pendingCalls.values()) {
        appendTrace({ kind: 'call-trace', server: name, tool, args, ok: false, error: 'no-response', truncated: false, ms: Date.now() - t0 }, cwd);
      }
      pendingCalls.clear();
    }
    logEvent({ kind: 'server-exit', server: name, code }, cwd);
    process.exit(code ?? 0);
  };
  streams.server.on?.('exit', onExit);
  streams.server.on?.('error', onExit);
  return { onExit };
}
