import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import http from 'node:http';
import { createProxy } from '../src/proxy.js';
import { createHttpProxy } from '../src/proxy-http.js';
import { readEvents } from '../src/events.js';

// Undeclared tool detection (v1.0.x): tools that appear in tools/call but were
// NEVER listed in tools/list. Progressive-discovery servers hide their real
// surface behind discover()/meta-tools — the agent calls tools the user never
// saw or approved. The proxy catches this gap.

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-undeclared-'));
  return { dir, cleanup: () => { try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* Windows */ } } };
}

// ---- stdio proxy -----------------------------------------------------------

function stdioHarness({ cwd, mode = 'observe' }) {
  const streams = {
    clientIn: new PassThrough(),
    server: { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), on: () => {} },
  };
  const out = [];
  const err = [];
  const serverSide = [];
  streams.server.stdin.on('data', (d) => serverSide.push(d.toString()));
  createProxy({ name: 'svc', streams, mode, config: {}, cwd, writeOut: (s) => out.push(s), writeErr: (s) => err.push(s) });
  const toolsList = (tools) => streams.server.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { tools } }) + '\n');
  const call = (id, tool) => streams.clientIn.write(JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: tool, arguments: {} } }) + '\n');
  return { streams, out, err, serverSide, toolsList, call };
}

test('stdio observe: undeclared tool alerts once, declared tool is silent', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const h = stdioHarness({ cwd: dir, mode: 'observe' });
    // tools/list declares only meta-tools (progressive discovery pattern)
    h.toolsList([
      { name: 'discover', description: 'Discover tools.', inputSchema: { type: 'object' } },
      { name: 'raw', description: 'Raw API call.', inputSchema: { type: 'object' } },
    ]);

    // Agent calls a tool that was never in tools/list
    h.call(1, 'withdraw');
    h.call(2, 'withdraw'); // second call — should NOT re-alert
    h.call(3, 'transfer_funds'); // different undeclared tool — SHOULD alert

    const errors = h.err.join('\n');
    const undeclaredCount = (errors.match(/UNDECLARED TOOL/g) ?? []).length;
    assert.equal(undeclaredCount, 2, 'exactly 2 advisories (one per undeclared tool, not per call)');
    assert.ok(errors.includes('withdraw'), 'withdraw flagged');
    assert.ok(errors.includes('transfer_funds'), 'transfer_funds flagged');
    assert.ok(errors.includes('progressive'), 'message explains progressive discovery');

    // Agent calls a DECLARED tool — no alert
    h.call(4, 'discover');
    assert.equal((h.err.join('\n').match(/UNDECLARED/g) ?? []).length, 2, 'declared tool does not trigger');
    assert.ok(h.serverSide.join('').includes('discover'), 'declared tool forwarded');

    // events: undeclared-tool (not block)
    const events = readEvents(dir);
    assert.ok(events.some((e) => e.kind === 'undeclared-tool' && e.tool === 'withdraw'));
    assert.ok(!events.some((e) => e.kind === 'undeclared-tool-block'), 'observe does not block');
  } finally {
    cleanup();
  }
});

test('stdio enforce: undeclared tool blocked, declared tool passes', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const h = stdioHarness({ cwd: dir, mode: 'enforce' });
    h.toolsList([{ name: 'discover', description: 'D.', inputSchema: { type: 'object' } }]);

    // undeclared tool: blocked
    h.call(1, 'hidden_tool');
    assert.equal(h.serverSide.join('').includes('hidden_tool'), false, 'undeclared tool NOT forwarded');
    const resp = JSON.parse(h.out.find((s) => s.includes('"error"')));
    assert.match(resp.error.message, /never listed in tools\/list/);

    // declared tool (even unapproved NEW): passes through to the standard NEW flow
    // (the NEW gate handles it; undeclared is a separate, earlier check)
    assert.ok(h.err.join('\n').includes('UNDECLARED TOOL'), 'stderr says UNDECLARED');
    assert.ok(readEvents(dir).some((e) => e.kind === 'undeclared-tool-block'));
  } finally {
    cleanup();
  }
});

// ---- HTTP proxy ---------------------------------------------------------------

function mockRemote() {
  const state = { declaredTools: [], callsReceived: [] };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const msg = JSON.parse(body);
      if (msg.method === 'initialize') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'm', version: '1' } } }));
      } else if (msg.method === 'tools/list') {
        state.declaredTools = ['discover', 'raw']; // progressive discovery pattern
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools: [
          { name: 'discover', description: 'Discover.', inputSchema: { type: 'object' } },
          { name: 'raw', description: 'Raw call.', inputSchema: { type: 'object' } },
        ] } }));
      } else if (msg.method === 'tools/call') {
        state.callsReceived.push(msg.params.name);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'ok' }] } }));
      } else {
        res.writeHead(202); res.end();
      }
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, state })));
}

let httpSeq = 0;
function rpc(port, method, params) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method: 'POST', headers: { 'content-type': 'application/json' } }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end(JSON.stringify({ jsonrpc: '2.0', id: ++httpSeq, method, params: params ?? {} }));
  });
}

test('HTTP observe: undeclared tool forwarded with one-time advisory', async () => {
  const { dir, cleanup } = tmpCwd();
  const remote = await mockRemote();
  try {
    const proxy = createHttpProxy({ name: 'svc', targetUrl: `http://127.0.0.1:${remote.port}`, mode: 'observe', cwd: dir });
    const port = await new Promise((resolve) => proxy.server.listen(0, '127.0.0.1', () => resolve(proxy.server.address().port)));
    const origWrite = process.stderr.write.bind(process.stderr);
    let captured = '';
    process.stderr.write = (c) => { captured += String(c); return true; };
    try {
      await rpc(port, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
      await rpc(port, 'tools/list'); // declares discover + raw

      // call an undeclared tool
      const r1 = await rpc(port, 'tools/call', { name: 'secret_withdraw', arguments: {} });
      assert.ok(r1.result, 'observe forwards undeclared calls');
      assert.ok(remote.state.callsReceived.includes('secret_withdraw'), 'remote received the call');

      // declared tool: no advisory
      const r2 = await rpc(port, 'tools/call', { name: 'discover', arguments: {} });
      assert.ok(r2.result);

      assert.match(captured, /UNDECLARED TOOL.*secret_withdraw/);
      assert.ok(!captured.includes('UNDECLARED TOOL.*discover'), 'declared tool does not trigger');
      assert.ok(readEvents(dir).some((e) => e.kind === 'undeclared-tool' && e.tool === 'secret_withdraw'));
    } finally {
      process.stderr.write = origWrite;
      await new Promise((r) => proxy.server.close(r));
    }
  } finally {
    cleanup();
    await new Promise((r) => remote.server.close(r));
  }
});

test('HTTP enforce: undeclared tool blocked, error returned', async () => {
  const { dir, cleanup } = tmpCwd();
  const remote = await mockRemote();
  try {
    const proxy = createHttpProxy({ name: 'svc', targetUrl: `http://127.0.0.1:${remote.port}`, mode: 'enforce', cwd: dir });
    const port = await new Promise((resolve) => proxy.server.listen(0, '127.0.0.1', () => resolve(proxy.server.address().port)));
    const origWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = () => true;
    try {
      await rpc(port, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
      await rpc(port, 'tools/list');

      const r = await rpc(port, 'tools/call', { name: 'hidden_order', arguments: {} });
      assert.ok(r.error, 'enforce blocks undeclared tools');
      assert.match(r.error.message, /never listed in tools\/list/);
      assert.ok(!remote.state.callsReceived.includes('hidden_order'), 'remote never sees the blocked call');
      assert.ok(readEvents(dir).some((e) => e.kind === 'undeclared-tool-block'));
    } finally {
      process.stderr.write = origWrite;
      await new Promise((r) => proxy.server.close(r));
    }
  } finally {
    cleanup();
    await new Promise((r) => remote.server.close(r));
  }
});
