import { spawn } from 'node:child_process';

/**
 * One-shot MCP stdio conversation: spawn the server, run
 * initialize -> notifications/initialized -> tools/list, return tools.
 * Used by `scan` / `diff` / `approve`. The long-lived proxy lives in proxy.js.
 */

export function fetchTools({ command, args = [], env = {}, cwd, timeoutMs = 15000 }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let buffer = '';
    let settled = false;
    const pending = new Map(); // id -> {resolve}
    const timers = new Set(); // per-request timeout handles — all cleared at finish

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const t of timers) clearTimeout(t);
      timers.clear();
      try { child.stdin.end(); } catch { /* already closed */ }
      try { child.kill(); } catch { /* already gone */ }
      fn(value);
    };

    const timer = setTimeout(
      () => finish(reject, new Error(`MCP server timed out after ${timeoutMs}ms`)),
      timeoutMs
    );

    const send = (msg) => child.stdin.write(JSON.stringify(msg) + '\n');

    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (!line) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue; // server noise on stdout — forward nothing, stay strict
        }
        if (msg.id !== undefined && pending.has(msg.id)) {
          const { resolve: ok, timer: t } = pending.get(msg.id);
          pending.delete(msg.id);
          clearTimeout(t);
          ok(msg);
        }
      }
    });

    child.on('error', (err) => finish(reject, err));
    child.on('exit', (code) => {
      if (!settled && pending.size > 0) {
        finish(reject, new Error(`MCP server exited early (code ${code})`));
      }
    });

    const request = (method, params) =>
      new Promise((ok, fail) => {
        const id = request.seq = (request.seq ?? 0) + 1;
        const t = setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            fail(new Error(`No response to ${method}`));
          }
        }, timeoutMs);
        timers.add(t);
        pending.set(id, { resolve: ok, timer: t });
        send({ jsonrpc: '2.0', id, method, params });
      });
    request.seq = 0;

    (async () => {
      const init = await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'rugsnare', version: '0.1.0' } });
      if (init.error) throw new Error(`initialize failed: ${JSON.stringify(init.error)}`);
      send({ jsonrpc: '2.0', method: 'notifications/initialized' });
      const list = await request('tools/list', {});
      if (list.error) throw new Error(`tools/list failed: ${JSON.stringify(list.error)}`);
      const tools = list.result?.tools ?? [];
      finish(resolve, tools);
    })().catch((err) => finish(reject, err));
  });
}
