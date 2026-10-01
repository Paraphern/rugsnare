import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchTools } from '../src/rpc.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(__dirname, '..', 'src', 'mcp-server.js');

// rpc.js fetchTools only returns tools; for tools/call we drive the server
// through the same client by speaking JSON-RPC over its stdio here.
import { spawn } from 'node:child_process';

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-mcp-'));
  // Windows: a just-killed child may hold the dir for a moment — retry, never fail the test on cleanup
  const cleanup = () => {
    for (let i = 0; i < 5; i++) {
      try { fs.rmSync(dir, { recursive: true, force: true }); return; } catch { /* locked */ }
      fs.rmSync; // no-op to keep linters calm
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100); // sleep 100ms without busy loop
    }
  };
  return { dir, cleanup };
}

function callTool(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [SERVER], { cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let buf = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('timeout')); }, 15000);
    child.stdout.on('data', (c) => {
      buf += c;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id === 2) { clearTimeout(timer); child.kill(); resolve(msg); return; }
        } catch { /* noise */ }
      }
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } }) + '\n');
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: args }) + '\n');
  });
}

test('mcp server: handshake + tools/list exposes exactly the two read-only tools', async () => {
  const { tools } = await fetchTools({ command: 'node', args: [SERVER], cwd: process.cwd(), timeoutMs: 15000 });
  assert.equal(tools.length, 2);
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, ['drift_feed_status', 'pins_report']);
  // descriptions must be clean of agent-instructions (we are the anti-poisoning tool)
  for (const t of tools) {
    assert.ok(!/IMPORTANT|NOTE:|ignore|you must|system prompt/i.test(t.description), `description must stay factual: ${t.name}`);
  }
});

test('mcp server: pins_report reads the local pin store of the working dir', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    fs.mkdirSync(path.join(dir, '.rugsnare'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.rugsnare', 'pins.json'), JSON.stringify({
      version: 1,
      servers: {
        flights: { tools: { search: { hash: 'a', approved: true }, book: { hash: 'b', approved: false } } },
      },
    }));
    const res = await callTool({ name: 'pins_report', arguments: {} }, dir);
    assert.ok(!res.error, JSON.stringify(res.error));
    const text = res.result.content[0].text;
    assert.match(text, /flights: 2 tool\(s\) pinned, 1 approved, 1 awaiting review/);
  } finally {
    cleanup();
  }
});

test('mcp server: pins_report without a pin store gives a helpful answer, not an error', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const res = await callTool({ name: 'pins_report', arguments: {} }, dir);
    assert.ok(!res.error);
    assert.match(res.result.content[0].text, /No pin store/);
  } finally {
    cleanup();
  }
});

test('mcp server: unknown tool answers with a JSON-RPC error', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const res = await callTool({ name: 'definitely_not_a_tool', arguments: {} }, dir);
    assert.ok(res.error);
    assert.match(res.error.message, /unknown tool/);
  } finally {
    cleanup();
  }
});
