import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { PassThrough } from 'node:stream';
import { createProxy } from '../src/proxy.js';
import { createHttpProxy } from '../src/proxy-http.js';
import { loadPins, savePins, ensureServer, pinTool } from '../src/pins.js';
import { toolHash } from '../src/hash.js';
import { readEvents } from '../src/events.js';
import { validate } from '../src/policies.js';

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-budget-'));
  return { dir, cleanup: () => { try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* Windows */ } } };
}

const TOOL = { name: 'deploy', description: 'Deploy.', inputSchema: { type: 'object' } };

function writePolicies(dir, policies) {
  fs.mkdirSync(path.join(dir, '.rugsnare'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.rugsnare', 'policies.json'), JSON.stringify({ version: 1, rules: [], ...policies }, null, 2));
}

function approveTool(dir, tool = TOOL) {
  const pins = loadPins(dir);
  const sp = ensureServer(pins, 'svc', null);
  pinTool(sp, tool, toolHash(tool), { approved: true });
  savePins(pins, dir);
}

// ---- stdio -------------------------------------------------------------------

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
  const call = (id) => streams.clientIn.write(JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'deploy', arguments: {} } }) + '\n');
  const forwarded = () => serverSide.join('').split('\n').filter(Boolean).length;
  return { streams, out, err, call, forwarded };
}

test('budgets (stdio, enforce): calls past the cap are blocked with JSON-RPC error', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    writePolicies(dir, { budgets: { deploy: 2 } });
    approveTool(dir);
    const h = stdioHarness({ cwd: dir, mode: 'enforce' });
    h.call(1); h.call(2); h.call(3); h.call(4);
    assert.equal(h.forwarded(), 2, 'only the first cap=2 calls reach the server');
    assert.ok(h.err.join('\n').includes('BUDGET EXCEEDED'));
    const errors = h.out.map((s) => JSON.parse(s)).filter((m) => m.error);
    assert.equal(errors.length, 2, 'calls 3 and 4 answered with errors');
    assert.match(errors[0].error.message, /cap 2 per session/);
    assert.equal(errors[0].id, 3);
    const events = readEvents(dir);
    assert.ok(events.some((e) => e.kind === 'budget-block' && e.cap === 2 && e.call === 3));
  } finally {
    cleanup();
  }
});

test('budgets (stdio, observe): calls forwarded, one-time advisory', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    writePolicies(dir, { budgets: { deploy: 1 } });
    approveTool(dir);
    const h = stdioHarness({ cwd: dir, mode: 'observe' });
    h.call(1); h.call(2); h.call(3);
    assert.equal(h.forwarded(), 3, 'observe forwards everything');
    const advisories = h.err.join('\n').match(/BUDGET EXCEEDED \(observe\)/g) ?? [];
    assert.equal(advisories.length, 1, 'one advisory per tool, not per call');
  } finally {
    cleanup();
  }
});

test('kill-switch (stdio): disabled tool blocked in BOTH modes and hidden in enforce tools/list', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    writePolicies(dir, { disabled: ['deploy'] });
    approveTool(dir);
    // observe: call blocked even in observe — an operator kill-switch is not advisory
    const obs = stdioHarness({ cwd: dir, mode: 'observe' });
    obs.call(1);
    assert.equal(obs.forwarded(), 0, 'kill-switch blocks in observe too');
    assert.match(JSON.parse(obs.out[0]).error.message, /disabled/);

    // enforce: tools/list hides the disabled tool
    const en = stdioHarness({ cwd: dir, mode: 'enforce' });
    en.streams.server.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 9, result: { tools: [TOOL] } }) + '\n');
    const listBack = JSON.parse(en.out.find((s) => s.includes('tools')));
    const names = listBack.result.tools.map((t) => t.name);
    assert.ok(!names.includes('deploy'), 'disabled tool hidden from the contract');
    assert.ok(names.includes('rugsnare_alert'));
    assert.match(listBack.result.tools.find((t) => t.name === 'rugsnare_alert').description, /deploy \(DISABLED\)/);
  } finally {
    cleanup();
  }
});

// ---- HTTP --------------------------------------------------------------------

function mockRemote() {
  const state = { calls: 0 };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const msg = JSON.parse(body);
      if (msg.method === 'initialize') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'm', version: '1' } } }));
      } else if (msg.method === 'tools/list') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools: [TOOL] } }));
      } else if (msg.method === 'tools/call') {
        state.calls += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'ok' }] } }));
      } else {
        res.writeHead(202); res.end();
      }
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, state })));
}

const close = (s) => new Promise((r) => s.close(r));

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

test('budgets + kill-switch (HTTP proxy): parity with stdio', async () => {
  const { dir, cleanup } = tmpCwd();
  const remote = await mockRemote();
  try {
    writePolicies(dir, { budgets: { deploy: 1 }, disabled: ['danger_tool'] });
    const proxy = createHttpProxy({ name: 'svc', targetUrl: `http://127.0.0.1:${remote.port}`, mode: 'enforce', cwd: dir });
    const port = await new Promise((resolve) => proxy.server.listen(0, '127.0.0.1', () => resolve(proxy.server.address().port)));
    try {
      await rpc(port, 'tools/list'); // pin + approve baseline
      proxy.serverPin.tools.deploy.approved = true;

      const r1 = await rpc(port, 'tools/call', { name: 'deploy', arguments: {} });
      const r2 = await rpc(port, 'tools/call', { name: 'deploy', arguments: {} });
      assert.ok(r1.result, 'first call passes (cap=1)');
      assert.match(r2.error.message, /budget exceeded/i);
      assert.equal(remote.state.calls, 1, 'only the budgeted call hit the remote');

      const r3 = await rpc(port, 'tools/call', { name: 'danger_tool', arguments: {} });
      assert.match(r3.error.message, /disabled/i);
      assert.equal(remote.state.calls, 1, 'kill-switched tool never reaches the remote');
    } finally {
      await close(proxy.server);
    }
  } finally {
    cleanup();
    await close(remote.server);
  }
});

// ---- validation ----------------------------------------------------------------

test('policies.validate: budgets/disabled schema enforced, garbage rejected', () => {
  const ok = validate({ version: 1, rules: [], budgets: { deploy: 3 }, disabled: ['x'] });
  assert.deepEqual(ok.budgets, { deploy: 3 });
  assert.throws(() => validate({ version: 1, rules: [], budgets: { deploy: -1 } }), /non-negative/);
  assert.throws(() => validate({ version: 1, rules: [], budgets: [1, 2] }), /must be an object/);
  assert.throws(() => validate({ version: 1, rules: [], disabled: 'deploy' }), /array of tool names/);
  assert.throws(() => validate({ version: 1, rules: [], disabled: [42] }), /array of tool names/);
});
