import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { replayCorpus } from '../src/canary-replay.js';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js');

// Canary over HTTP: record through the HTTP reverse proxy, replay against a
// remote endpoint. Same corpus format as stdio — the replay engine's transport
// is the only thing that changed.

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-canary-http-'));
  return { dir, cleanup: () => { try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* Windows */ } } };
}

function mockRemote() {
  const state = {
    tools: [{ name: 'search', description: 'Search.', inputSchema: { type: 'object' } }],
    callsReceived: [],
    resultText: '3 rows',
  };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const msg = JSON.parse(body);
      if (msg.method === 'initialize') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'mock', version: '2.0' } } }));
      } else if (msg.method === 'tools/list') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools: state.tools } }));
      } else if (msg.method === 'tools/call') {
        state.callsReceived.push(msg.params.name);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: state.resultText }] } }));
      } else {
        res.writeHead(202); res.end();
      }
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, state })));
}

const close = (server) => new Promise((resolve) => server.close(resolve));

function freePort() {
  const probe = http.createServer();
  return new Promise((resolve) => probe.listen(0, '127.0.0.1', () => { const p = probe.address().port; probe.close(() => resolve(p)); }));
}

let mcpSeq = 0;
function mcpRpc(port, method, params) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method: 'POST', headers: { 'content-type': 'application/json' } }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end(JSON.stringify({ jsonrpc: '2.0', id: ++mcpSeq, method, params: params ?? {} }));
  });
}

test('canary record over HTTP: client calls land in calls.jsonl with results', async () => {
  const { dir, cleanup } = tmpCwd();
  const remote = await mockRemote();
  const proxyPort = await freePort();
  const child = spawn('node', [CLI, 'canary', 'record', '--name', 'svc', '--url', `http://127.0.0.1:${remote.port}/mcp`, '--port', String(proxyPort)], { cwd: dir });
  try {
    const announced = new Promise((resolve, reject) => {
      let buf = '';
      const timer = setTimeout(() => reject(new Error(`no announcement: ${buf}`)), 15000);
      child.stderr.on('data', (c) => { buf += c; if (buf.includes('recording')) { clearTimeout(timer); resolve(); } });
      child.on('exit', (c) => { clearTimeout(timer); reject(new Error(`exited ${c}: ${buf}`)); });
    });
    await announced;

    await mcpRpc(proxyPort, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
    await mcpRpc(proxyPort, 'tools/list');
    const call = await mcpRpc(proxyPort, 'tools/call', { name: 'search', arguments: { q: 'x' } });
    assert.equal(call.result.content[0].text, '3 rows');

    const tracesFile = path.join(dir, '.rugsnare', 'canary', 'calls.jsonl');
    // appendTrace writes synchronously — after the response reached the
    // client, the trace must already be on disk
    const traces = fs.readFileSync(tracesFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const info = traces.find((t) => t.kind === 'server-info');
    assert.ok(info, 'server-info captured');
    assert.equal(info.serverInfo.name, 'mock');
    const trace = traces.find((t) => t.kind === 'call-trace');
    assert.ok(trace, 'call-trace captured');
    assert.equal(trace.tool, 'search');
    assert.equal(trace.ok, true);
    assert.equal(trace.result.content[0].text, '3 rows');
  } finally {
    child.kill();
    await new Promise((resolve) => child.on('exit', resolve));
    cleanup();
    await close(remote.server);
  }
});

test('canary replay over HTTP: read-like call replayed, write-class skipped and NOT sent', async () => {
  const { dir, cleanup } = tmpCwd();
  const remote = await mockRemote();
  try {
    const corpus = [
      { kind: 'call-trace', server: 'svc', tool: 'search', args: { q: 'x' }, ok: true, result: { content: [{ type: 'text', text: '3 rows' }] } },
      { kind: 'call-trace', server: 'svc', tool: 'update_records', args: { id: 1 }, ok: true, result: { content: [{ type: 'text', text: 'ok' }] } },
    ];
    const result = await replayCorpus({ url: `http://127.0.0.1:${remote.port}/mcp`, corpus, timeoutMs: 10000 });
    assert.ok(!result.error, result.error);
    assert.equal(result.serverInfo.name, 'mock');
    assert.equal(result.tools.length, 1);

    assert.equal(result.calls[0].skipped, undefined, 'read-like call must replay');
    assert.equal(result.calls[0].live.result.content[0].text, '3 rows');
    assert.equal(result.calls[1].skipped, 'skip-write', 'write-class call must skip');
    // safety: the skipped write was NEVER sent to the remote
    assert.deepEqual(remote.state.callsReceived, ['search']);
  } finally {
    cleanup();
    await close(remote.server);
  }
});

test('canary replay --url via CLI against pinned HTTP server (end to end)', async () => {
  const { dir, cleanup } = tmpCwd();
  const remote = await mockRemote();
  try {
    // pin the HTTP server so replay can fall back to pins for transport
    await new Promise((resolve) => {
      execFile('node', [CLI, 'scan', '--server', 'svc', '--url', `http://127.0.0.1:${remote.port}/mcp`], { cwd: dir, timeout: 60000 }, () => resolve());
    });
    // seed a recorded corpus (one read call)
    fs.mkdirSync(path.join(dir, '.rugsnare', 'canary'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.rugsnare', 'canary', 'calls.jsonl'),
      JSON.stringify({ kind: 'call-trace', server: 'svc', tool: 'search', args: { q: 'x' }, ok: true, result: { content: [{ type: 'text', text: '3 rows' }] } }) + '\n');

    const r = await new Promise((resolve) => {
      execFile('node', [CLI, 'canary', 'replay', '--name', 'svc'], { cwd: dir, timeout: 60000 }, (err, stdout, stderr) => {
        resolve({ code: err ? err.code : 0, stdout, stderr });
      });
    });
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /1\/1 call\(s\) replayed with identical shape/);
    assert.match(r.stdout, /verdict: SAFE/);
    assert.deepEqual(remote.state.callsReceived, ['search'], 'pinned url transport used, exactly one call');
  } finally {
    cleanup();
    await close(remote.server);
  }
});
