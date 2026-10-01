import readline from 'node:readline';
import { compareTools } from './pins.js';
import { toolHash } from './hash.js';

/**
 * Canary replay engine (Phase A, PR-2 — see extensions-verdict.md).
 *
 * Replays a corpus of recorded tool calls (`.rugsnare/canary/calls.jsonl`,
 * written by the proxy with `canaryRecord: true`) against a server command —
 * typically a NEWER version of the same server — and classifies every
 * difference deterministically. No LLM, no network beyond the server process
 * itself, no heuristics that could cry wolf: a finding is either a structural
 * fact (schema changed, response shape changed, ok became error) or it is
 * silence.
 *
 * Shape comparison ignores leaf VALUES (timestamps, prices, ids differ between
 * runs) and compares only structure: key sets, nesting, types. That is what
 * "same behavior" means for an agent consuming the response.
 */

// ---- structural fingerprint -------------------------------------------------

export function shape(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return v.length ? [shape(v[0])] : [];
  if (typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = shape(v[k]);
    return out;
  }
  return typeof v;
}

export function shapesEqual(a, b) {
  return JSON.stringify(shape(a)) === JSON.stringify(shape(b));
}

// ---- replay driver ----------------------------------------------------------

/**
 * Spawn the server, run the MCP handshake, then replay every corpus call.
 * Process spawning lives in spawn-server.js (the only place it is allowed).
 * Returns { serverInfo, tools, calls } — never throws on tool errors; a call
 * that errors or times out is DATA for the classifier, not a failure.
 */
export function replayCorpus({ command, args = [], env = {}, cwd, corpus, timeoutMs = 15000 }) {
  return new Promise((resolve) => {
    let spawnServerFn;
    import('./spawn-server.js')
      .then((m) => { spawnServerFn = m.spawnServer; start(m.spawnServer); })
      .catch(() => resolve({ error: 'spawn-server.js missing — see README "What\'s inside"' }));

    function start(spawnServer) {
      let child;
      try {
        child = spawnServer({ command, args, env, cwd, onStdout: () => {}, onStderr: () => {}, onExit: () => {} });
      } catch (err) {
        resolve({ error: String(err) });
        return;
      }

      const pending = new Map(); // id -> {resolve, timer}
      const timers = new Set();
      let settled = false;
      const calls = [];
      let serverInfo = null;
      let tools = [];

      const finish = (value) => {
        if (settled) return;
        settled = true;
        for (const t of timers) clearTimeout(t);
        timers.clear();
        try { child.stdin.end(); } catch { /* gone */ }
        try { child.kill(); } catch { /* gone */ }
        resolve(value);
      };
      const fail = (msg) => finish({ error: msg });

      const timer = setTimeout(() => fail(`server timed out after ${timeoutMs}ms`), timeoutMs);
      timers.add(timer);

      const rl = readline.createInterface({ input: child.stdout });
      rl.on('line', (line) => {
        let msg;
        try { msg = JSON.parse(line); } catch { return; }
        if (msg.id !== undefined && pending.has(msg.id)) {
          const { resolve: ok, timer: t } = pending.get(msg.id);
          pending.delete(msg.id);
          clearTimeout(t);
          ok(msg);
        }
      });

      const request = (method, params) =>
        new Promise((ok, failReq) => {
          const id = request.seq = (request.seq ?? 0) + 1;
          const t = setTimeout(() => {
            if (pending.has(id)) { pending.delete(id); failReq(new Error(`no response to ${method}`)); }
          }, timeoutMs);
          timers.add(t);
          pending.set(id, { resolve: ok, timer: t });
          try {
            child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
          } catch (err) {
            failReq(err);
          }
        });
      request.seq = 0;

      (async () => {
        const init = await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'rugsnare-canary', version: '1' } });
        if (init.error) return fail(`initialize failed: ${JSON.stringify(init.error)}`);
        serverInfo = init.result?.serverInfo ?? null;
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

        // tools/list with pagination (same discipline as rpc.js)
        let cursor;
        let pages = 0;
        do {
          const list = await request('tools/list', cursor === undefined ? {} : { cursor });
          if (list.error) return fail(`tools/list failed: ${JSON.stringify(list.error)}`);
          const r = list.result ?? {};
          if (Array.isArray(r.tools)) tools.push(...r.tools);
          cursor = typeof r.nextCursor === 'string' && r.nextCursor ? r.nextCursor : undefined;
        } while (cursor !== undefined && ++pages < 100);

        for (const entry of corpus) {
          try {
            const live = await request('tools/call', { name: entry.tool, arguments: entry.args ?? {} });
            calls.push({ entry, live });
          } catch (err) {
            calls.push({ entry, live: null, note: String(err) });
          }
        }
        finish({ serverInfo, tools, calls });
      })().catch((err) => fail(String(err)));
    }
  });
}

// ---- classification ---------------------------------------------------------

/**
 * Deterministic verdicts. BREAKING fails CI (exit 1); COSMETIC/NEW/FIXED are
 * reported but never fail — cosmetic text changes and new tools are not a
 * reason to block an upgrade.
 */
export function classifyReplay({ serverPin, liveTools, replayCalls }) {
  const findings = [];

  // Contract side: reuse the split-hash machinery from scan/diff.
  for (const v of compareTools(serverPin, liveTools, toolHash)) {
    if (v.status === 'REMOVED') findings.push({ severity: 'BREAKING', where: 'tools/list', tool: v.tool, reason: 'tool removed' });
    else if (v.status === 'DRIFT') findings.push({ severity: v.driftType, where: 'tools/list', tool: v.tool, reason: v.schemaChanged ? 'schema changed' : 'description changed only' });
    else if (v.status === 'NEW') findings.push({ severity: 'NEW', where: 'tools/list', tool: v.tool, reason: 'new tool appeared' });
  }

  // Behavior side: recorded vs live, structure only.
  let ok = 0;
  for (const { entry, live, note } of replayCalls) {
    if (entry.truncated) { findings.push({ severity: 'SKIPPED', where: 'call', tool: entry.tool, reason: 'recorded entry was truncated — cannot compare' }); continue; }
    if (!live) { findings.push({ severity: 'BREAKING', where: 'call', tool: entry.tool, reason: `no response: ${note ?? 'connection lost'}` }); continue; }

    const wasOk = entry.ok;
    const isOk = !live.error;
    if (wasOk && !isOk) findings.push({ severity: 'BREAKING', where: 'call', tool: entry.tool, reason: `was ok, now error: ${live.error?.message ?? 'unknown'}` });
    else if (!wasOk && isOk) findings.push({ severity: 'FIXED', where: 'call', tool: entry.tool, reason: 'was error, now ok' });
    else if (wasOk && isOk) {
      if (shapesEqual(entry.result, live.result)) ok += 1;
      else findings.push({ severity: 'BREAKING', where: 'call', tool: entry.tool, reason: 'response shape changed' });
    } else ok += 1; // error before and after — no regression
  }

  const breaking = findings.filter((f) => f.severity === 'BREAKING').length;
  const cosmetic = findings.filter((f) => f.severity === 'COSMETIC').length;
  const verdict = breaking > 0 ? 'DO NOT UPGRADE' : cosmetic > 0 ? 'SAFE WITH NOTES' : 'SAFE';
  return { findings, ok, breaking, cosmetic, verdict };
}
