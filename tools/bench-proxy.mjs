// Measures what the RugSnare live proxy actually costs as a background process:
//   1. per-call round-trip overhead vs a direct connection to the same server
//   2. resident memory of the proxy machinery itself (deltas on the Node heap)
// Portable: paths resolved from this file's location. Run: node tools/bench-proxy.mjs
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(here, '..', 'product', 'test', 'fixtures', 'canary-v1.cjs');
const { createProxy } = await import(pathToFileURL(path.join(here, '..', 'product', 'src', 'proxy.js')).href);

const callMsg = (id) => JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'search_events', arguments: { q: 'x'.repeat(400) } } });

function makeChild() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [FIXTURE], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let buf = '';
    const send = (line) => child.stdin.write(line + '\n');
    const waiters = new Map();
    child.stdout.on('data', (c) => {
      buf += c;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (waiters.has(msg.id)) { waiters.get(msg.id)(msg); waiters.delete(msg.id); }
        } catch { /* noise */ }
      }
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'bench', version: '1' } } }) + '\n');
    child.stdout.once('data', () => resolve({ child, send, waiters }));
    setTimeout(() => reject(new Error('spawn timeout')), 5000);
  });
}

async function benchDirect(n) {
  const { child, send, waiters } = await makeChild();
  const call = (id) => new Promise((ok) => { waiters.set(id, ok); send(callMsg(id)); });
  await call(1); // warmup
  const t = [];
  for (let i = 2; i < n + 2; i++) { const t0 = performance.now(); await call(i); t.push(performance.now() - t0); }
  child.kill();
  return t;
}

async function benchProxied(n, opts = {}) {
  const server = await makeChild();
  const clientIn = new PassThrough();
  const pending = new Map();
  // event-driven capture: resolve the waiter directly from writeOut — no polling
  const writeOut = (s) => {
    try {
      const m = JSON.parse(s);
      if (m.id !== undefined && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    } catch { /* non-JSON */ }
  };
  createProxy({
    name: 'bench',
    streams: { clientIn, server: { stdin: server.child.stdin, stdout: server.child.stdout, stderr: server.child.stderr } }, // no .on: bench must survive child kill (the real proxy exits with its server — correct in prod, fatal for a bench)
    mode: 'observe',
    config: opts,
    cwd: path.join(here, '..', 'tmp-bench'), // scratch dir for pins/events
    writeOut,
    writeErr: () => {},
  });
  const call = (id) => new Promise((ok) => { pending.set(id, ok); clientIn.write(callMsg(id) + '\n'); });
  await new Promise((r) => setTimeout(r, 50));
  await call(1); // warmup
  const t = [];
  for (let i = 2; i < n + 2; i++) { const t0 = performance.now(); await call(i); t.push(performance.now() - t0); }
  server.child.kill();
  return t;
}

const stats = (t) => {
  const s = [...t].sort((a, b) => a - b);
  return { p50: s[Math.floor(s.length / 2)].toFixed(2), avg: (s.reduce((a, b) => a + b, 0) / s.length).toFixed(2), p95: s[Math.floor(s.length * 0.95)].toFixed(2) };
};

const N = 200;
const direct = stats(await benchDirect(N));
const proxied = stats(await benchProxied(N, {}));
const proxiedAll = stats(await benchProxied(N, { logCallArgs: true, canaryRecord: true }));

// memory: proxy machinery in-process
import fs from 'node:fs';
import os from 'node:os';
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-mem-'));
global.gc?.();
const before = process.memoryUsage().rss;
{
  const clientIn = new PassThrough();
  const child = await makeChild();
  const out = [];
  createProxy({ name: 'mem', streams: { clientIn, server: { stdin: child.child.stdin, stdout: child.child.stdout, stderr: child.child.stderr } }, mode: 'observe', config: {}, cwd: scratch, writeOut: (s) => out.push(s), writeErr: () => {} });
  for (let i = 0; i < 2000; i++) {
    clientIn.write(callMsg(1000 + i) + '\n');
  }
  await new Promise((r) => setTimeout(r, 300));
  child.child.kill();
}
const after = process.memoryUsage().rss;
fs.rmSync(scratch, { recursive: true, force: true });

console.log(`calls: ${N} round-trips each`);
console.log('direct connection :', JSON.stringify(direct), 'ms');
console.log('through rugsnare   :', JSON.stringify(proxied), 'ms  (observe mode, defaults)');
console.log('all extras ON      :', JSON.stringify(proxiedAll), 'ms  (logCallArgs + canaryRecord)');
console.log(`memory: proxy machinery + 2000 calls delta = ${((after - before) / 1024 / 1024).toFixed(1)} MB (node baseline excluded)`);
