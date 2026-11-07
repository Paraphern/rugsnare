import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PassThrough } from 'node:stream';
import { createProxy } from '../src/proxy.js';
import { createHttpProxy } from '../src/proxy-http.js';
import { ensureKeys, signPinsFile, verifyPinsFile } from '../src/receipts.js';

const CLI = fileURLToPath(new URL('../src/cli.js', import.meta.url));

function fixture(t, { signed = true, keys = true } = {}) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-runtime-integrity-'));
  // Windows: a just-exited spawn can hold the temp dir past any retry budget
  // (EPERM on rm) - cleanup is best-effort, a leftover tmp dir is harmless
  // while a failed TEST because of cleanup is not (patterns: pinv11.test.js
  // RM, mcp-server.test.js tmpCwd)
  t.after(() => {
    try { fs.rmSync(cwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* dir still held - harmless */ }
  });
  const state = path.join(cwd, '.rugsnare');
  fs.mkdirSync(state, { recursive: true });
  const pinsFile = path.join(state, 'pins.json');
  fs.writeFileSync(pinsFile, JSON.stringify({
    version: 1,
    servers: { svc: { tools: { read: { hash: 'original', approved: true } } } },
  }));
  if (keys) ensureKeys(cwd);
  if (signed) assert.equal(signPinsFile(cwd), true);
  return { cwd, state, pinsFile };
}

function tamperPins(pinsFile) {
  const pins = JSON.parse(fs.readFileSync(pinsFile, 'utf8'));
  pins.servers.svc.tools.read.hash = 'attacker-approved';
  fs.writeFileSync(pinsFile, JSON.stringify(pins));
}

function runCli(cwd, args) {
  return new Promise((resolve) => {
    const child = execFile(process.execPath, [CLI, ...args], { cwd, timeout: 10000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
    child.stdin.end();
  });
}

// Only starts a local listener; no requests are sent to the loopback target.
function runUntilListening(cwd, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let ready = false;
    const timer = setTimeout(() => child.kill(), 10000);
    child.stdout.resume();
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      if (/(?:listening on|HTTP proxy on)/.test(stderr)) {
        ready = true;
        child.kill();
      }
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      resolve({ code, ready, stderr });
    });
  });
}

function markerChild(cwd) {
  const marker = path.join(cwd, 'child-started');
  const script = path.join(cwd, 'marker.cjs');
  fs.writeFileSync(script, `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'started');\n`);
  return { marker, script };
}

function recordCorpus(state) {
  fs.mkdirSync(path.join(state, 'canary'), { recursive: true });
  fs.writeFileSync(path.join(state, 'canary', 'calls.jsonl'), JSON.stringify({
    kind: 'call-trace', server: 'svc', tool: 'read', args: {}, ok: true, result: { content: [] },
  }) + '\n');
}

function runtime(t, transport, opts) {
  if (transport === 'http') {
    const proxy = createHttpProxy({ name: 'svc', targetUrl: 'http://127.0.0.1:1/mcp', ...opts });
    t.after(() => proxy.server.close());
    return proxy;
  }
  const streams = {
    clientIn: new PassThrough(),
    server: { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), on() {} },
  };
  t.after(() => {
    streams.clientIn.destroy();
    for (const stream of [streams.server.stdin, streams.server.stdout, streams.server.stderr]) stream.destroy();
  });
  return createProxy({ name: 'svc', streams, writeOut() {}, writeErr() {}, ...opts });
}

for (const transport of ['stdio', 'http']) {
  for (const mode of ['observe', 'enforce']) {
    for (const failMode of ['open', 'closed']) {
      test(`${transport} refuses tampered signed pins before startup (${mode}, fail-${failMode})`, (t) => {
        const { cwd, pinsFile } = fixture(t);
        tamperPins(pinsFile);
        assert.equal(verifyPinsFile(cwd).status, 'tampered');
        assert.throws(() => runtime(t, transport, { cwd, mode, config: { failMode } }), /TAMPERED/);
      });
    }
  }
}

for (const transport of ['stdio', 'http']) {
  for (const source of ['committed', 'local']) {
    test(`${transport} accepts a valid signature with the ${source} verification key`, (t) => {
      const { cwd, state } = fixture(t);
      if (source === 'committed') fs.rmSync(path.join(state, 'keys'), { recursive: true });
      else fs.unlinkSync(path.join(state, 'pins.pub.pem'));
      assert.equal(verifyPinsFile(cwd).status, 'ok');
      assert.doesNotThrow(() => runtime(t, transport, { cwd, mode: 'enforce' }));
    });
  }

  test(`${transport} preserves first-run and never-signed compatibility`, (t) => {
    const { cwd, pinsFile } = fixture(t, { signed: false, keys: false });
    assert.doesNotThrow(() => runtime(t, transport, { cwd }));
    fs.unlinkSync(pinsFile);
    assert.doesNotThrow(() => runtime(t, transport, { cwd }));
  });

  test(`${transport} requires an explicit unsigned override, never a config bypass`, (t) => {
    const { cwd } = fixture(t, { signed: false });
    assert.equal(verifyPinsFile(cwd).status, 'unsigned');
    assert.throws(() => runtime(t, transport, { cwd, config: { allowUnsignedPins: true } }), /unsigned/i);
    assert.doesNotThrow(() => runtime(t, transport, { cwd, allowUnsignedPins: true }));
  });

  test(`${transport} cannot override tampering or a signed store with a missing key`, (t) => {
    const { cwd, state, pinsFile } = fixture(t);
    tamperPins(pinsFile);
    assert.throws(() => runtime(t, transport, { cwd, allowUnsignedPins: true }), /TAMPERED/);
    fs.unlinkSync(path.join(state, 'pins.pub.pem'));
    fs.rmSync(path.join(state, 'keys'), { recursive: true });
    assert.throws(() => runtime(t, transport, { cwd, allowUnsignedPins: true }), /TAMPERED/);
  });
}

for (const command of [['run'], ['canary', 'record'], ['canary', 'replay']]) {
  for (const override of [false, true]) {
    test(`CLI ${command.join(' ')} refuses tampered pins before spawning (override=${override})`, async (t) => {
      const { cwd, state, pinsFile } = fixture(t);
      const { marker, script } = markerChild(cwd);
      const pins = JSON.parse(fs.readFileSync(pinsFile, 'utf8'));
      pins.servers.svc.cmd = { command: process.execPath, args: [script] };
      fs.writeFileSync(pinsFile, JSON.stringify(pins));
      signPinsFile(cwd);
      tamperPins(pinsFile);
      recordCorpus(state);
      const flags = override ? ['--allow-unsigned-pins'] : [];
      const args = [...command, '--name', 'svc', ...flags];
      // Replay must also gate the command loaded from the untrusted pin store.
      if (!command.includes('replay')) args.push('--mode', 'enforce', '--fail-closed', '--', process.execPath, script);
      const result = await runCli(cwd, args);
      assert.equal(result.code, 2, result.stderr);
      assert.match(result.stderr, /TAMPERED/);
      assert.equal(fs.existsSync(marker), false, 'the server process must never start');
    });
  }

  test(`CLI ${command.join(' ')} refuses tampered pins before HTTP activity`, async (t) => {
    const { cwd, state, pinsFile } = fixture(t);
    tamperPins(pinsFile);
    recordCorpus(state);
    const result = await runCli(cwd, [...command, '--name', 'svc', '--url', 'http://127.0.0.1:1/mcp']);
    assert.equal(result.code, 2, result.stderr);
    assert.match(result.stderr, /TAMPERED/);
    assert.doesNotMatch(result.stderr, /(?:listening on|HTTP proxy on|replay failed)/);
  });
}

for (const command of [['run'], ['canary', 'record']]) {
  test(`CLI ${command.join(' ')} passes only the explicit unsigned override to the stdio constructor`, async (t) => {
    const { cwd } = fixture(t, { signed: false });
    const { marker, script } = markerChild(cwd);
    const args = [...command, '--name', 'svc'];
    const blocked = await runCli(cwd, [...args, '--', process.execPath, script]);
    assert.equal(blocked.code, 2, blocked.stderr);
    assert.match(blocked.stderr, /unsigned/i);
    assert.equal(fs.existsSync(marker), false);
    const allowed = await runCli(cwd, [...args, '--allow-unsigned-pins', '--', process.execPath, script]);
    assert.equal(allowed.code, 0, allowed.stderr);
    assert.equal(fs.existsSync(marker), true);
  });

  test(`CLI ${command.join(' ')} passes the explicit unsigned override to the HTTP constructor`, async (t) => {
    const { cwd } = fixture(t, { signed: false });
    const args = [...command, '--name', 'svc', '--url', 'http://127.0.0.1:1/mcp'];
    const blocked = await runCli(cwd, args);
    assert.equal(blocked.code, 2, blocked.stderr);
    assert.match(blocked.stderr, /unsigned/i);
    const allowed = await runUntilListening(cwd, [...args, '--allow-unsigned-pins']);
    assert.equal(allowed.ready, true, allowed.stderr);
  });
}

test('CLI canary replay accepts the explicit unsigned override before executing the replay server', async (t) => {
  const { cwd, state } = fixture(t, { signed: false });
  const { marker, script } = markerChild(cwd);
  fs.appendFileSync(script, `
    const rl = require('node:readline').createInterface({ input: process.stdin });
    rl.on('line', (line) => {
      const msg = JSON.parse(line);
      if (msg.id === undefined) return;
      const result = msg.method === 'initialize'
        ? { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'fixture', version: '1' } }
        : msg.method === 'tools/list' ? { tools: [] } : { content: [] };
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\\n');
    });
  `);
  recordCorpus(state);
  const args = ['canary', 'replay', '--name', 'svc', '--timeout', '1000'];
  const blocked = await runCli(cwd, [...args, '--', process.execPath, script]);
  assert.equal(blocked.code, 2, blocked.stderr);
  assert.equal(fs.existsSync(marker), false);
  const allowed = await runCli(cwd, [...args, '--allow-unsigned-pins', '--', process.execPath, script]);
  assert.equal(allowed.code, 1, allowed.stderr); // the pinned tool is absent from the fixture's list
  assert.equal(fs.existsSync(marker), true);
  assert.match(allowed.stdout, /verdict:/);
});
