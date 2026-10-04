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

  // Canary capture (opt-in): HTTP is one request per POST, so correlation is
  // trivial — no pending-id map like the stdio proxy needs.
  const canary = canaryEnabled(config);

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
        }

        const t0 = canary && msg.method === 'tools/call' ? Date.now() : 0;
        const response = await forward(msg);
        const tools = response?.result?.tools;

        // Canary capture (opt-in): server identity from the handshake, and
        // every tools/call id-correlated with ITS response (same POST)
        if (canary) {
          if (msg.method === 'initialize' && response?.result?.serverInfo) {
            appendTrace({ kind: 'server-info', server: name, serverInfo: response.result.serverInfo }, cwd);
          }
          if (msg.method === 'tools/call' && msg.id !== undefined) {
            const ok = !response?.error;
            const { payload, truncated } = capPayload(ok ? response?.result : response?.error);
            appendTrace(
              { kind: 'call-trace', server: name, tool: msg.params?.name, args: msg.params?.arguments ?? null, ok, [ok ? 'result' : 'error']: payload, truncated, ms: t0 ? Date.now() - t0 : 0 },
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
