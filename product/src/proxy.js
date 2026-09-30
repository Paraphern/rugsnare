import readline from 'node:readline';
import { toolHash, short } from './hash.js';
import { loadPins, pinTool, savePins, ensureServer, detectShadows } from './pins.js';
import { logEvent } from './events.js';
import { sendAlert } from './alerts.js';
import { evaluateCall, DEFAULT_POLICIES, validate as validatePolicies } from './policies.js';
import { readJsonFile } from './jsonfile.js';
import fs from 'node:fs';
import path from 'node:path';

function loadPoliciesForProxy(cwd) {
  const policyFile = path.join(cwd, '.rugsnare', 'policies.json');
  try {
    const raw = readJsonFile(policyFile);
    return validatePolicies(raw);
  } catch {
    return DEFAULT_POLICIES; // file missing → use built-in defaults
  }
}

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

  const alert = async (status, tool, extra = {}) => {
    const payload = { kind: 'rugsnare.alert', status, server: name, tool, mode, ...extra };
    writeErr(`[rugsnare] ${status}: ${name}/${tool}${extra.oldHash ? ` ${short(extra.oldHash)} -> ${short(extra.hash)}` : ''}`);
    logEvent(payload, cwd);
    await sendAlert(config, payload);
  };

  // ---- client -> server: log tool calls + evaluate policies + fail-open ----
  const clientIn = readline.createInterface({ input: streams.clientIn });
  clientIn.on('line', (line) => {
    let shouldForward = true;
    try {
      const msg = JSON.parse(line);
      if (msg.method === 'tools/call' && msg.params) {
        const call = {
          kind: 'call',
          server: name,
          tool: msg.params.name,
          hasArgs: Boolean(msg.params.arguments && Object.keys(msg.params.arguments).length),
        };
        if (config.logCallArgs) call.args = msg.params.arguments;
        logEvent(call, cwd);

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
      }
    } catch (proxyErr) {
      // Fail-open: proxy internal error → forward anyway, log the failure
      logEvent({ kind: 'proxy-fail-open', server: name, reason: String(proxyErr).slice(0, 200) }, cwd);
      writeErr(`[rugsnare] proxy error (fail-open, forwarding): ${String(proxyErr).slice(0, 100)}`);
    }
    if (shouldForward) {
      try {
        streams.server.stdin.write(line + '\n');
      } catch (writeErr) {
        // Server pipe broken → fail-open: log and let the client handle reconnection
        logEvent({ kind: 'proxy-write-fail', server: name, reason: String(writeErr).slice(0, 200) }, cwd);
      }
    }
  });

  // ---- server -> client: integrity gate ----
  const serverOut = readline.createInterface({ input: streams.server.stdout });
  serverOut.on('line', (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      writeOut(line);
      return;
    }

    const tools = msg?.result?.tools;
    if (Array.isArray(tools) && tools.length > 0) {
      const verdicts = tools.map((tool) => {
        const hash = toolHash(tool);
        const pin = serverPin.tools[tool.name];
        return { tool, hash, pin, status: !pin ? 'NEW' : pin.hash !== hash ? 'DRIFT' : 'UNCHANGED' };
      });

      for (const v of verdicts) {
        if (v.status === 'NEW' && !v.pin) {
          pinTool(serverPin, v.tool, v.hash, { approved: false });
          pinsDirty = true;
          alert('NEW', v.tool.name, { hash: v.hash }); // alert in every mode: enforce quarantines, but the human must still hear it
        } else if (v.status === 'DRIFT') {
          alert('DRIFT', v.tool.name, { oldHash: v.pin.hash, hash: v.hash, oldDescription: v.pin.description, newDescription: v.tool.description });
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
    logEvent({ kind: 'server-exit', server: name, code }, cwd);
    process.exit(code ?? 0);
  };
  streams.server.on?.('exit', onExit);
  streams.server.on?.('error', onExit);
  return { onExit };
}
