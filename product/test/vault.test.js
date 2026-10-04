import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { substituteArgs, redactResult, loadVault, saveVault } from '../src/vault.js';
import { createProxy } from '../src/proxy.js';
import { readEvents } from '../src/events.js';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js');

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-vault-'));
  return { dir, cleanup: () => { try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* Windows */ } } };
}

// assembled by concatenation: no credential-shaped literal in source (secret-scanner hygiene)
const SECRET = 'sk-live-' + 'DO_NOT_PRINT_zzz42';

// ---- unit level --------------------------------------------------------------

test('substituteArgs: whole-value, embedded, nested; unknown name passes through', () => {
  const vault = { KEY: SECRET, HOST: 'db.prod.internal' };
  const { args, used } = substituteArgs({
    token: '{{VAULT:KEY}}',
    header: 'Bearer {{VAULT:KEY}}',
    nested: { list: ['{{VAULT:HOST}}', 'plain'], n: 5 },
    unknown: '{{VAULT:MISSING}}',
    plain: 'unchanged',
  }, vault);
  assert.equal(args.token, SECRET);
  assert.equal(args.header, `Bearer ${SECRET}`);
  assert.equal(args.nested.list[0], 'db.prod.internal');
  assert.equal(args.nested.list[1], 'plain');
  assert.equal(args.nested.n, 5);
  assert.equal(args.unknown, '{{VAULT:MISSING}}', 'unknown placeholder stays as-is');
  assert.equal(args.plain, 'unchanged');
  assert.deepEqual(used.sort(), ['HOST', 'KEY'], 'used names reported, never values');
});

test('substituteArgs: null/undefined args and no vault are clean passthroughs', () => {
  assert.deepEqual(substituteArgs(undefined, { A: 'x' }), { args: undefined, used: [] });
  assert.deepEqual(substituteArgs({ a: '{{VAULT:A}}' }, null), { args: { a: '{{VAULT:A}}' }, used: [] });
});

test('redactResult: echoed secret becomes placeholder; longest values first', () => {
  const vault = { KEY: SECRET, SHORT: SECRET.slice(0, 8) }; // SHORT is a prefix of KEY
  const { result, redacted } = redactResult({
    content: [{ type: 'text', text: `stored ${SECRET} ok` }],
    nested: { echo: `prefix-${SECRET}-suffix` },
  }, vault);
  assert.equal(result.content[0].text, 'stored {{VAULT:KEY}} ok');
  assert.equal(result.nested.echo, 'prefix-{{VAULT:KEY}}-suffix');
  assert.ok(redacted.includes('KEY'));
  assert.ok(!JSON.stringify(result).includes(SECRET), 'no cleartext secret in redacted result');
});

// ---- stdio proxy integration ---------------------------------------------------

function makeStreams() {
  return {
    clientIn: new PassThrough(),
    server: { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), on: () => {} },
  };
}

function harness({ cwd, config = {} }) {
  const streams = makeStreams();
  const out = [];
  const serverSide = [];
  streams.server.stdin.on('data', (d) => serverSide.push(d.toString()));
  createProxy({ name: 'svc', streams, mode: 'observe', config, cwd, writeOut: (s) => out.push(s), writeErr: () => {} });
  return { streams, out, serverSide };
}

test('stdio proxy: server receives the REAL value, model receives placeholders, logs stay clean', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    saveVault({ KEY: SECRET }, dir);
    const { streams, out, serverSide } = harness({ cwd: dir, config: { logCallArgs: true } });

    // client -> proxy -> server: placeholder goes in
    streams.clientIn.write(JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'deploy', arguments: { token: '{{VAULT:KEY}}' } } }) + '\n');

    const wire = serverSide.join('');
    const wireMsg = JSON.parse(wire.trim().split('\n')[0]);
    assert.equal(wireMsg.params.arguments.token, SECRET, 'server must receive the real value');
    assert.ok(!wire.includes('{{VAULT:KEY}}'), 'no placeholder reaches the server');

    // server -> proxy -> client: echoed secret is scrubbed BEFORE the model
    streams.server.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 5, result: { content: [{ type: 'text', text: `deployed with ${SECRET}` }] } }) + '\n');
    const back = JSON.parse(out[0]);
    assert.equal(back.result.content[0].text, 'deployed with {{VAULT:KEY}}');
    assert.ok(!out.join('').includes(SECRET), 'secret must never reach the client side');

    // events: substitution/redaction recorded as NAMES only
    const events = readEvents(dir);
    const sub = events.find((e) => e.kind === 'vault-substitute');
    const red = events.find((e) => e.kind === 'vault-redact');
    assert.ok(sub && red, 'vault events present');
    assert.deepEqual(sub.names, ['KEY']);
    assert.deepEqual(red.names, ['KEY']);
    assert.ok(!JSON.stringify(events).includes(SECRET), 'events must never contain the value');
    // the call log (logCallArgs: true) captured the PLACEHOLDER form
    const call = events.find((e) => e.kind === 'call');
    assert.equal(call.args.token, '{{VAULT:KEY}}');
  } finally {
    cleanup();
  }
});

test('stdio proxy: no vault file -> traffic passes through untouched', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const { streams, serverSide } = harness({ cwd: dir });
    streams.clientIn.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'x', arguments: { token: 'plain-value' } } }) + '\n');
    const wireMsg = JSON.parse(serverSide.join('').trim());
    assert.equal(wireMsg.params.arguments.token, 'plain-value');
  } finally {
    cleanup();
  }
});

// ---- CLI ------------------------------------------------------------------------

function runCli(cwd, args) {
  return new Promise((resolve) => {
    execFile('node', [CLI, ...args], { cwd, timeout: 60000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

test('CLI vault: set/get/list/rm roundtrip; get of unknown is exit 2', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const set = await runCli(dir, ['vault', 'set', 'KEY', SECRET]);
    assert.equal(set.code, 0, set.stderr);
    assert.match(set.stdout, /vault: KEY set \(.* chars\)/);
    assert.ok(!set.stdout.includes(SECRET.slice(8)), 'set output shows length, not the value');

    const get = await runCli(dir, ['vault', 'get', 'KEY']);
    assert.equal(get.stdout.trim(), SECRET);

    const list = await runCli(dir, ['vault', 'list']);
    assert.match(list.stdout, /KEY: \d+ chars/);
    assert.ok(!list.stdout.includes(SECRET));

    // vault file exists inside .rugsnare and round-trips through loadVault
    assert.ok(fs.existsSync(path.join(dir, '.rugsnare', 'vault.json')));
    assert.equal(loadVault(dir).KEY, SECRET);

    const rm = await runCli(dir, ['vault', 'rm', 'KEY']);
    assert.equal(rm.code, 0);
    assert.equal(loadVault(dir), null, 'empty vault reads as null (passthrough)');

    const missing = await runCli(dir, ['vault', 'get', 'KEY']);
    assert.equal(missing.code, 2);
  } finally {
    cleanup();
  }
});

test('CLI vault: set without value and without TTY fails cleanly (exit 2)', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const r = await runCli(dir, ['vault', 'set', 'KEY']);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /TTY/);
  } finally {
    cleanup();
  }
});
