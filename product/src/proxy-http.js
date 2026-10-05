import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import { URL } from 'node:url';
import { toolHash, stable } from './hash.js';
import { loadPins, savePins, ensureServer, pinTool, compareTools } from './pins.js';
import { logEvent } from './events.js';
import { scanResult } from './results.js';
import { resolveAuth } from './auth.js';
import { canaryEnabled, appendTrace, capPayload } from './canary.js';
import { evaluateCall, loadPolicies } from './policies.js';
import { loadVault, substituteArgs, redactResult } from './vault.js';

/**
 * HTTP-based live proxy: sits between an MCP client and a remote HTTP MCP
 * server, inspecting all traffic in both directions.
 *
 *   Client → RugSnare proxy (localhost) → Remote MCP server
 *
 * Same integrity gate as the stdio proxy, on the shared persistent pin
 * store (.rugsnare/pins.json): pins and approvals survive proxy restarts,
 * and `rugsnare diff` / `rugsnare approve` see the same data.
 *
 * Usage: `rugsnare run --name myserver --url https://remote.example.com/mcp`
 * The proxy listens on a local port; point your MCP client at it.
 */

export function createHttpProxy({ name, targetUrl, authConfig = {}, mode = 'observe', config, cwd = process.cwd() }) {
  const pins = loadPins(cwd);
  const serverPin = ensureServer(pins, name, { url: targetUrl });
  let pinsDirty = false;

  // Parity with the stdio proxy: same policies loader, same loop detector
  const activePolicies = loadPolicies(cwd);
  const LOOP_THRESHOLD = Number.isInteger(config?.loopThreshold) ? config.loopThreshold : 5;
  let loopRun = { fingerprint: null, count: 0, alerted: false };

  // Per-session budgets + kill-switch (policies.budgets / policies.disabled, v0.8)
  const budgets = activePolicies?.budgets ?? null;
  const disabled = Array.isArray(activePolicies?.disabled) ? activePolicies.disabled : [];
  const callCounts = new Map();
  const budgetAlerted = new Set();

  // Secret vault (v0.7): see src/vault.js — placeholders out, secrets scrubbed back
  const vault = loadVault(cwd);

  // Canary capture (opt-in): HTTP is one request per POST, so correlation is
  // trivial — no pending-id map like the stdio proxy needs.
  const canary = canaryEnabled(config);

  // Undeclared tool detection (same as stdio proxy): tools called but never
  // listed in tools/list = progressive-discovery surface outside user approval.
  // Activated only after the first tools/list response.
  const declaredTools = new Set();
  const undeclaredAlerted = new Set();
  let hasSeenToolsList = false;

  const targetHeaders = resolveAuth(authConfig ?? {});
  let sessionId = null;

  const alert = (status, tool, extra = {}) => {
    const msg = `[rugsnare] ${status}: ${name}/${tool}${extra.driftType ? ` (${extra.driftType})` : ''}`;
    process.stderr.write(msg + '\n');
    logEvent({ kind: 'rugsnare.alert', status, server: name, tool, mode, ...extra }, cwd);
  };

  /**
   * Forward a request to the remote MCP server.
   */
  function forward(body, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
      const u = new URL(targetUrl);
      const mod = u.protocol === 'https:' ? https : http;
      const reqHeaders = {
        'content-type': 'application/json',
        'accept': 'application/json, text/event-stream',
        'mcp-protocol-version': '2025-06-18',
        ...targetHeaders,
        ...extraHeaders,
      };
      if (sessionId) reqHeaders['mcp-session-id'] = sessionId;

      const req = mod.request(u, { method: 'POST', headers: reqHeaders, timeout: 30000 }, (res) => {
        const sid = res.headers['mcp-session-id'];
        if (sid) sessionId = sid;
        let raw = '';
        let settled = false;
        const settle = (fn, value) => { if (!settled) { settled = true; fn(value); } };
        res.on('data', (c) => { raw += c; if (raw.length > 5 * 1024 * 1024) { req.destroy(); settle(reject, new Error('response exceeds 5MB limit')); } });
        res.on('aborted', () => settle(reject, new Error('response aborted')));
        res.on('end', () => {
          try {
            const contentType = res.headers['content-type'] || '';
            if (contentType.includes('text/event-stream')) {
              // SSE: a stream may carry several events; take the one whose id
              // matches the request we sent (correlation, not "last line wins")
              const lines = raw.split('\n').filter((l) => l.startsWith('data:'));
              const wantId = body?.id;
              let fallback = null;
              for (const line of lines) {
                const json = line.slice(5).trim();
                if (!json) continue;
                const parsed = JSON.parse(json);
                if (parsed.id === wantId) return settle(resolve, parsed);
                if (fallback === null) fallback = parsed;
              }
              if (fallback !== null) return settle(resolve, fallback);
              return settle(reject, new Error('SSE: no data lines'));
            }
            settle(resolve, JSON.parse(raw));
          } catch (e) { settle(reject, e); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('forward timeout')); });
      req.write(JSON.stringify(body));
      req.end();
    });
  }

  /**
   * Run the integrity gate over a tools/list result using the SHARED verdict
   * logic (compareTools): NEW pinned unapproved, DRIFT classified
   * BREAKING/COSMETIC/ANNOTATION through spec-default annotation semantics.
   */
  function inspectToolsList(tools) {
    const verdicts = compareTools(serverPin, tools, toolHash);
    for (const v of verdicts) {
      if (v.status === 'NEW') {
        const tool = tools.find((t) => t.name === v.tool);
        pinTool(serverPin, tool, v.hash, { approved: false });
        pinsDirty = true;
        alert('NEW', v.tool, { hash: v.hash }); // alert in every mode: enforce quarantines, but the human must still hear it
      } else if (v.status === 'DRIFT') {
        alert('DRIFT', v.tool, {
          driftType: v.driftType,
          oldHash: v.oldHash,
          hash: v.hash,
          oldDescription: v.oldDescription,
          newDescription: v.newDescription,
          schemaChanges: v.schemaChanges ?? [],
        });
      } else if (v.status === 'REMOVED') {
        alert('REMOVED', v.tool, { note: 'pinned tool vanished from tools/list' });
      }
    }
    if (pinsDirty) {
      savePins(pins, cwd);
      pinsDirty = false;
    }
    return verdicts;
  }

  /**
   * Create the local HTTP server that the MCP client connects to.
   */
  const server = http.createServer((clientReq, clientRes) => {
    if (clientReq.method === 'GET') {
      // Health check / SSE endpoint — just 200
      clientRes.writeHead(200, { 'content-type': 'text/event-stream' });
      clientRes.write('data: {"jsonrpc":"2.0","method":"notifications/initialized"}\n\n');
      return;
    }

    let body = '';
    clientReq.on('data', (c) => { body += c; if (body.length > 5 * 1024 * 1024) { clientReq.destroy(); clientRes.writeHead(413); clientRes.end(); } });
    clientReq.on('end', async () => {
      try {
        const msg = JSON.parse(body);

        // Call policies + loop detector — same enforcement as the stdio proxy.
        // A blocked call is answered directly to the client; the remote never sees it.
        if (msg.method === 'tools/call' && msg.params) {
          if (LOOP_THRESHOLD > 0) {
            const fingerprint = crypto.createHash('sha256')
              .update(msg.params.name + '|' + JSON.stringify(stable(msg.params.arguments ?? {})))
              .digest('hex').slice(0, 16);
            if (fingerprint === loopRun.fingerprint) {
              loopRun.count += 1;
              if (loopRun.count >= LOOP_THRESHOLD && !loopRun.alerted) {
                loopRun.alerted = true; // one alert per stuck run, not per call
                process.stderr.write(`[rugsnare] LOOP-SUSPECTED: ${name}/${msg.params.name} called ${loopRun.count}x with identical arguments and no other tool in between\n`);
                logEvent({ kind: 'loop-suspected', server: name, tool: msg.params.name, count: loopRun.count, threshold: LOOP_THRESHOLD }, cwd);
              }
            } else {
              loopRun = { fingerprint, count: 1, alerted: false };
            }
          }

          const toolPin = serverPin.tools[msg.params.name];
          const policyResult = evaluateCall(
            { toolName: msg.params.name, arguments: msg.params.arguments, description: toolPin?.description ?? '' },
            activePolicies
          );
          const approvalNeeded = policyResult.requiresApproval.length > 0 && mode === 'enforce';
          if (!policyResult.allowed || approvalNeeded) {
            const reasons = [...policyResult.blocked, ...(approvalNeeded ? policyResult.requiresApproval : [])].map((b) => b.reason).join('; ');
            process.stderr.write(`[rugsnare] POLICY BLOCK: ${name}/${msg.params.name} — ${reasons}\n`);
            logEvent({ kind: 'policy-block', server: name, tool: msg.params.name, blocked: policyResult.blocked, approval: policyResult.requiresApproval }, cwd);
            clientRes.writeHead(200, { 'content-type': 'application/json' });
            clientRes.end(JSON.stringify({
              jsonrpc: '2.0', id: msg.id,
              error: { code: -32603, message: `[RUGSNARE] Tool call blocked by policy: ${reasons}. Update .rugsnare/policies.json if this is a false positive` },
            }));
            return;
          }
          if (policyResult.pii) {
            logEvent({ kind: 'pii-detected', server: name, tool: msg.params.name, hits: policyResult.pii.hits }, cwd);
          }

          // kill-switch: disabled tools never run, in ANY mode
          if (disabled.includes(msg.params.name)) {
            process.stderr.write(`[rugsnare] KILL-SWITCH: ${name}/${msg.params.name} is disabled in policies.json — call blocked\n`);
            logEvent({ kind: 'kill-switch-block', server: name, tool: msg.params.name }, cwd);
            clientRes.writeHead(200, { 'content-type': 'application/json' });
            clientRes.end(JSON.stringify({
              jsonrpc: '2.0', id: msg.id,
              error: { code: -32603, message: `[RUGSNARE] Tool "${msg.params.name}" is disabled by the operator (policies.json kill-switch).` },
            }));
            return;
          }

          // Undeclared tool detection: the tool was never in tools/list but the
          // agent is calling it — progressive-discovery surface. Runs AFTER
          // kill-switch and policies (those have more specific messages).
          if (hasSeenToolsList && !declaredTools.has(msg.params.name)) {
            if (mode === 'enforce') {
              process.stderr.write(`[rugsnare] UNDECLARED TOOL: ${name}/${msg.params.name} — never in tools/list; blocked (enforce)\n`);
              logEvent({ kind: 'undeclared-tool-block', server: name, tool: msg.params.name, note: 'tool not in tools/list; progressive-discovery surface' }, cwd);
              clientRes.writeHead(200, { 'content-type': 'application/json' });
              clientRes.end(JSON.stringify({
                jsonrpc: '2.0', id: msg.id,
                error: { code: -32603, message: `[RUGSNARE] Tool "${msg.params.name}" was never listed in tools/list. The server exposes it through progressive discovery — the user never approved this tool.` },
              }));
              return;
            }
            if (!undeclaredAlerted.has(msg.params.name)) {
              undeclaredAlerted.add(msg.params.name);
              process.stderr.write(`[rugsnare] UNDECLARED TOOL (observe): ${name}/${msg.params.name} — not in tools/list, progressive-discovery surface; forwarded\n`);
              logEvent({ kind: 'undeclared-tool', server: name, tool: msg.params.name, note: 'progressive-discovery surface' }, cwd);
            }
          }

          // per-session budget: observe warns once past the cap, enforce blocks
          if (budgets && Number.isInteger(budgets[msg.params.name])) {
            const cap = budgets[msg.params.name];
            const n = (callCounts.get(msg.params.name) ?? 0) + 1;
            callCounts.set(msg.params.name, n);
            if (n > cap) {
              if (mode === 'enforce') {
                process.stderr.write(`[rugsnare] BUDGET EXCEEDED: ${name}/${msg.params.name} — cap ${cap} call(s) per session, this is #${n}. Blocked.\n`);
                logEvent({ kind: 'budget-block', server: name, tool: msg.params.name, cap, call: n }, cwd);
                clientRes.writeHead(200, { 'content-type': 'application/json' });
                clientRes.end(JSON.stringify({
                  jsonrpc: '2.0', id: msg.id,
                  error: { code: -32603, message: `[RUGSNARE] Call budget exceeded for "${msg.params.name}": cap ${cap} per session (this is #${n}).` },
                }));
                return;
              }
              if (!budgetAlerted.has(msg.params.name)) {
                budgetAlerted.add(msg.params.name);
                process.stderr.write(`[rugsnare] BUDGET EXCEEDED (observe): ${name}/${msg.params.name} past cap ${cap} — call #${n} forwarded; switch to enforce to block\n`);
                logEvent({ kind: 'budget-exceeded', server: name, tool: msg.params.name, cap, call: n }, cwd);
              }
            }
          }
        }

        // Canary snapshot of the PLACEHOLDER args (P0 fix, review 28): taken
        // BEFORE vault substitution — the corpus must never hold real secrets.
        // The stdio proxy does the same by capturing at the top of the branch.
        const canaryArgs = canary && msg.method === 'tools/call' && msg.params
          ? structuredClone(msg.params.arguments ?? null)
          : null;

        // Vault substitution is the LAST step before the wire (policy and
        // loop detection above saw the placeholder form)
        if (vault && msg.method === 'tools/call' && msg.params) {
          const { args, used } = substituteArgs(msg.params.arguments, vault);
          if (used.length > 0) {
            msg.params.arguments = args;
            logEvent({ kind: 'vault-substitute', server: name, tool: msg.params.name, names: used }, cwd); // names, never values
          }
        }

        const t0 = canary && msg.method === 'tools/call' ? Date.now() : 0;
        const response = await forward(msg);

        // Vault redaction BEFORE canary capture and result inspection — and
        // errors are scrubbed too: a server echoing the secret in an error
        // message must not leak it into the corpus or the model (review 28, P1)
        if (vault && msg.method === 'tools/call') {
          if (response?.result) {
            const { result: scrubbed, redacted } = redactResult(response.result, vault);
            if (redacted.length > 0) {
              response.result = scrubbed;
              logEvent({ kind: 'vault-redact', server: name, requestId: msg.id, names: redacted }, cwd);
            }
          }
          if (response?.error) {
            const { result: scrubbedErr, redacted } = redactResult(response.error, vault);
            if (redacted.length > 0) {
              response.error = scrubbedErr;
              logEvent({ kind: 'vault-redact', server: name, requestId: msg.id, names: redacted, in: 'error' }, cwd);
            }
          }
        }
        const tools = response?.result?.tools;

        // Populate declared surface from tools/list responses (same as stdio proxy)
        if (Array.isArray(tools)) {
          hasSeenToolsList = true;
          for (const t of tools) if (t?.name) declaredTools.add(t.name);
        }

        // Canary capture (opt-in): server identity from the handshake, and
        // every tools/call id-correlated with ITS response (same POST).
        // args come from the pre-substitution snapshot — placeholders only.
        if (canary) {
          if (msg.method === 'initialize' && response?.result?.serverInfo) {
            appendTrace({ kind: 'server-info', server: name, serverInfo: response.result.serverInfo }, cwd);
          }
          if (msg.method === 'tools/call' && msg.id !== undefined) {
            const ok = !response?.error;
            const { payload, truncated } = capPayload(ok ? response?.result : response?.error);
            appendTrace(
              { kind: 'call-trace', server: name, tool: msg.params?.name, args: canaryArgs, ok, [ok ? 'result' : 'error']: payload, truncated, ms: t0 ? Date.now() - t0 : 0 },
              cwd
            );
          }
        }

        if (Array.isArray(tools)) {
          const verdicts = inspectToolsList(tools);
          if (mode === 'enforce') {
            const allowed = new Set(
              verdicts
                .filter((v) => v.status === 'UNCHANGED' || (v.status === 'NEW' && serverPin.tools[v.tool]?.approved))
                .map((v) => v.tool)
            );
            const blocked = verdicts.filter((v) => tools.some((t) => t.name === v.tool) && !allowed.has(v.tool));
            // kill-switch: disabled tools are hidden from the contract too
            for (const t of tools) {
              if (allowed.has(t.name) && disabled.includes(t.name)) {
                allowed.delete(t.name);
                blocked.push({ tool: t.name, status: 'DISABLED' });
              }
            }
            if (blocked.length > 0) {
              response.result.tools = [
                ...tools.filter((t) => allowed.has(t.name)),
                {
                  name: 'rugsnare_alert',
                  description:
                    `[RUGSNARE] ${blocked.length} tool(s) quarantined on this server: ` +
                    blocked.map((v) => `${v.tool} (${v.status}${v.driftType ? `/${v.driftType}` : ''})`).join(', ') +
                    `. A tool contract changed after approval (rug pull) or appeared without approval. ` +
                    `Run \`rugsnare diff\` to inspect, \`rugsnare approve ${name}\` after review.`,
                  inputSchema: { type: 'object', properties: {} },
                },
              ];
              logEvent({ kind: 'quarantine', server: name, blocked: blocked.map((v) => ({ tool: v.tool, status: v.status })) }, cwd);
            }
          }
        }

        // Result inspection on tool-call responses (advisory-only: log + alert, never block)
        if (response?.result && msg.method === 'tools/call') {
          const resultScan = scanResult(response.result, { threshold: config?.resultThreshold });
          if (resultScan.advisory) {
            process.stderr.write(`[rugsnare] RESULT-INJECTION-SUSPECTED: response to ${msg.method} scored ${resultScan.score} (${resultScan.signals.map((s) => s.id).join(',')})\n`);
            logEvent({ kind: 'result-advisory', server: name, tool: msg.params?.name, score: resultScan.score, signals: resultScan.signals.map((s) => s.id) }, cwd);
          }
        }

        clientRes.writeHead(200, { 'content-type': 'application/json' });
        clientRes.end(JSON.stringify(response));
      } catch (err) {
        process.stderr.write(`[rugsnare] proxy error: ${String(err).slice(0, 200)}\n`);
        clientRes.writeHead(502, { 'content-type': 'application/json' });
        clientRes.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message: `[RUGSNARE] ${String(err).slice(0, 200)}` } }));
      }
    });
  });

  return { server, forward, serverPin };
}

/**
 * Start the HTTP proxy. opts.port pins the listen port (wrap mode needs a
 * deterministic port written into the client config); default 0 = random.
 */
export function startHttpProxy(opts) {
  const port = Number.isInteger(opts.port) ? opts.port : 0;
  return new Promise((resolve, reject) => {
    const { server } = createHttpProxy(opts);
    const onError = (e) => reject(new Error(
      e.code === 'EADDRINUSE'
        ? `port ${port} is already in use — another RugSnare proxy (or app) holds it. Re-run wrap to pick a fresh port.`
        : String(e?.message ?? e)
    ));
    server.once('error', onError);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', onError);
      const actual = server.address().port;
      resolve({ server, port: actual, url: `http://127.0.0.1:${actual}/mcp` });
    });
  });
}
