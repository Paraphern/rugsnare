import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { PassThrough } from 'node:stream';
import { createProxy } from '../src/proxy.js';
import { createHttpProxy } from '../src/proxy-http.js';
import { saveVault } from '../src/vault.js';
import { readEvents } from '../src/events.js';
import { readTraces } from '../src/canary.js';
import { ensureKeys, signPinsFile, verifyPinsFile, readReceipts } from '../src/receipts.js';
import { loadPolicies, validate, evaluateCall } from '../src/policies.js';
import { redactResult } from '../src/vault.js';

// Review 28 regressions: P0 (canary leak via HTTP), P1-1 (error scrubbing),
// P1-2 (committed verification key works in CI), P1-3 (loud policies
// degradation), P2 guards (regex, short-value scrub, corrupt receipts).

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-r28-'));
  return { dir, cleanup: () => { try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* Windows */ } } };
}

const SECRET = 'sk-live-' + 'R28secretNeverPrint42';

// ---- P0: canary trace must hold PLACEHOLDERS on the HTTP transport ---------

function mockRemoteEcho() {
  const state = { lastBody: null };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const msg = JSON.parse(body);
      state.lastBody = msg;
      if (msg.method === 'initialize') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'm', version: '1' } } }));
      } else if (msg.method === 'tools/call') {
        // echo the AUTH TOKEN BACK in an ERROR message — covers P1-1 too
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: `auth failed for token ${msg.params.arguments.token}` } }));
      } else {
        res.writeHead(202); res.end();
      }
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, state })));
}

let seq = 0;
function rpc(port, method, params) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method: 'POST', headers: { 'content-type': 'application/json' } }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end(JSON.stringify({ jsonrpc: '2.0', id: ++seq, method, params: params ?? {} }));
  });
}

test('P0+P1-1 (HTTP): canary holds placeholders, error responses are scrubbed', async () => {
  const { dir, cleanup } = tmpCwd();
  const remote = await mockRemoteEcho();
  try {
    saveVault({ TOKEN: SECRET }, dir);
    const proxy = createHttpProxy({
      name: 'svc', targetUrl: `http://127.0.0.1:${remote.port}`, mode: 'observe',
      config: { canaryRecord: true }, cwd: dir,
    });
    const port = await new Promise((resolve) => proxy.server.listen(0, '127.0.0.1', () => resolve(proxy.server.address().port)));
    const origWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = () => true; // silence expected advisories
    try {
      await rpc(port, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
      const res = await rpc(port, 'tools/call', { name: 'deploy', arguments: { token: '{{VAULT:TOKEN}}' } });

      // the SERVER received the real secret…
      assert.equal(remote.state.lastBody.params.arguments.token, SECRET);
      // …the MODEL received a scrubbed error (P1-1), never the cleartext
      assert.ok(res.error, 'mock answers with an error');
      assert.ok(!JSON.stringify(res).includes(SECRET), 'secret must not reach the client');
      assert.match(res.error.message, /\{\{VAULT:TOKEN\}\}/);

      // …and the canary corpus holds the PLACEHOLDER args (P0)
      const traces = readTraces(dir);
      const trace = traces.find((t) => t.kind === 'call-trace');
      assert.ok(trace, 'call-trace written');
      assert.equal(trace.args.token, '{{VAULT:TOKEN}}', 'canary args must be the placeholder form');
      assert.ok(!JSON.stringify(traces).includes(SECRET), 'canary corpus must never hold the secret');
      // error payload in the trace is scrubbed too
      assert.ok(!JSON.stringify(trace.error ?? {}).includes(SECRET));
    } finally {
      process.stderr.write = origWrite;
      await new Promise((r) => proxy.server.close(r));
    }
  } finally {
    cleanup();
    await new Promise((r) => remote.server.close(r));
  }
});

// ---- P1-1 (stdio): error scrubbing in the stdio proxy ------------------------

test('P1-1 (stdio): server error echoing the secret is scrubbed before the client', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    saveVault({ TOKEN: SECRET }, dir);
    const streams = {
      clientIn: new PassThrough(),
      server: { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), on: () => {} },
    };
    const out = [];
    createProxy({ name: 'svc', streams, mode: 'observe', config: {}, cwd: dir, writeOut: (s) => out.push(s), writeErr: () => {} });
    streams.clientIn.write(JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'deploy', arguments: { token: '{{VAULT:TOKEN}}' } } }) + '\n');
    streams.server.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 7, error: { code: -32000, message: `bad token ${SECRET}` } }) + '\n');
    const back = JSON.parse(out.find((s) => s.includes('"error"')));
    assert.ok(!out.join('').includes(SECRET), 'no cleartext secret to the client');
    assert.match(back.error.message, /\{\{VAULT:TOKEN\}\}/);
  } finally {
    cleanup();
  }
});

// ---- P1-2: committed pins.pub.pem makes verification work in CI --------------

test('P1-2: committed key verifies in a foreign directory (no local keys)', () => {
  const { dir, cleanup } = tmpCwd();
  const ci = tmpCwd(); // simulates a CI checkout: only tracked files present
  try {
    ensureKeys(dir);
    fs.mkdirSync(path.join(dir, '.rugsnare'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.rugsnare', 'pins.json'), JSON.stringify({ version: 1, servers: { s: { cmd: null, tools: {} } } }));
    assert.equal(signPinsFile(dir), true);

    // "commit": copy exactly what git would carry into the CI dir
    fs.mkdirSync(path.join(ci.dir, '.rugsnare'), { recursive: true });
    for (const f of ['pins.json', 'pins.sig', 'pins.pub.pem']) {
      fs.copyFileSync(path.join(dir, '.rugsnare', f), path.join(ci.dir, '.rugsnare', f));
    }
    const v = verifyPinsFile(ci.dir);
    assert.equal(v.status, 'ok', `CI checkout must verify via the committed key, got ${JSON.stringify(v)}`);
    assert.equal(v.keySource, 'committed');

    // attacker deletes pins.sig in CI: unsigned-with-key -> blocked (was: silent nokey)
    fs.unlinkSync(path.join(ci.dir, '.rugsnare', 'pins.sig'));
    assert.equal(verifyPinsFile(ci.dir).status, 'unsigned');
  } finally {
    cleanup();
    ci.cleanup();
  }
});

// ---- P1-3: loud policies degradation -----------------------------------------

test('P1-3: broken policies.json degrades LOUDLY to defaults', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const write = (s) => fs.writeFileSync(path.join(dir, '.rugsnare', 'policies.json'), s);
    fs.mkdirSync(path.join(dir, '.rugsnare'), { recursive: true });
    const origWrite = process.stderr.write.bind(process.stderr);
    let captured = '';
    process.stderr.write = (c) => { captured += String(c); return true; };
    try {
      write('{ not json');
      const p1 = loadPolicies(dir);
      assert.ok(Array.isArray(p1.rules) && p1.rules.length > 0, 'defaults apply (deny rules active)');
      write(JSON.stringify({ version: 1, budgets: { x: 2 } })); // no rules array
      const p2 = loadPolicies(dir);
      assert.ok(p2.rules.length > 0, 'defaults apply when rules array missing');
      assert.match(captured, /POLICIES DEGRADED/);
      assert.match(captured, /missing "rules" array/);
      // valid file: custom rules load, no degradation noise for THIS load
      const before = captured;
      write(JSON.stringify({ version: 1, rules: [{ name: 'r', action: 'deny', match: { argument: 'session', argumentType: 'object' }, reason: 'x' }] }));
      const p3 = loadPolicies(dir);
      assert.equal(p3.rules.length, 1);
      assert.equal(captured, before, 'valid policies produce no warning');
      assert.ok(readEvents(dir).some((e) => e.kind === 'policies-degraded'));
    } finally {
      process.stderr.write = origWrite;
    }
  } finally {
    cleanup();
  }
});

// ---- P2 guards -----------------------------------------------------------------

test('P2: invalid regex rule rejected at load; guarded at runtime (never throws)', () => {
  assert.throws(() => validate({ version: 1, rules: [{ name: 'bad', action: 'deny', match: { toolName: '*invalid(' } }] }), /not a valid regex/);
  // even if an invalid pattern slips through to evaluateCall, it cannot throw
  const res = evaluateCall(
    { toolName: 'x', arguments: {}, description: '' },
    { version: 1, rules: [{ name: 'bad', action: 'deny', match: { toolName: '*invalid(' }, reason: 'r' }] },
  );
  assert.equal(res.allowed, true, 'broken rule is skipped, call proceeds');
});

test('P2: scrub skips vault values shorter than 4 chars (no text mangling)', () => {
  const vault = { TINY: 'ab', KEY: SECRET };
  const { result, redacted } = redactResult({ text: `abracadabra with ${SECRET}` }, vault);
  assert.ok(result.text.includes('abracadabra'), '2-char value must not be scrubbed everywhere');
  assert.match(result.text, /\{\{VAULT:KEY\}\}/);
  assert.deepEqual(redacted, ['KEY']);
});

test('P2: corrupt receipts.jsonl reported, not masquerading as empty', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    fs.mkdirSync(path.join(dir, '.rugsnare'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.rugsnare', 'receipts.jsonl'), '{"seq":1,"prevHash":"0","entryHash":"aa","sig":"bb","event":{}}\nTHIS IS NOT JSON\n');
    const receipts = readReceipts(dir);
    assert.equal(receipts.length, 1, 'parseable line still read');
    assert.equal(receipts.corrupt, 1, 'corrupt line counted, not swallowed');
  } finally {
    cleanup();
  }
});
