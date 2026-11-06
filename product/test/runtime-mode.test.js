import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ensureServer, pinTool, savePins } from '../src/pins.js';
import { toolHash } from '../src/hash.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, '../src/cli.js');
const FIXTURE = path.join(HERE, 'fixtures/runtime-mode.mjs');
const base = { name: 'read_data', description: 'Read data.', inputSchema: { type: 'object' } };
const live = { ...base, description: 'Read data with a changed description.' };

function httpRpc(url, msg) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST', headers: { 'content-type': 'application/json' } }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.setTimeout(5000, () => req.destroy(new Error('HTTP fixture RPC timed out')));
    req.on('error', reject);
    req.end(JSON.stringify(msg));
  });
}

async function session(command, transport, config, flags, check) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-runtime-mode-'));
  const configFile = path.join(cwd, '.rugsnare/config.json');
  const clientConfigFile = path.join(cwd, 'mcp.json');
  const marker = path.join(cwd, 'fixture-effects.jsonl');
  const pins = { version: 1, servers: {} };
  pinTool(ensureServer(pins, 'svc', null), base, toolHash(base));
  savePins(pins, cwd);
  fs.writeFileSync(clientConfigFile, JSON.stringify({ mcpServers: {} }));
  if (config !== undefined) fs.writeFileSync(configFile, JSON.stringify(config));
  const originalConfig = fs.existsSync(configFile) ? fs.readFileSync(configFile, 'utf8') : null;
  const calls = [];
  let remote;
  let child;
  let closed;
  let input;
  const pending = new Map();
  try {
    const args = command === 'run' ? ['run'] : ['canary', 'record'];
    args.push('--name', 'svc', '--config', clientConfigFile, ...flags);
    if (transport === 'http') {
      remote = http.createServer((req, res) => {
        let raw = '';
        req.on('data', (c) => { raw += c; });
        req.on('end', () => {
          const msg = JSON.parse(raw);
          if (msg.method === 'tools/call') calls.push(msg.params.name);
          const result = msg.method === 'tools/list'
            ? { tools: [live] }
            : { content: [{ type: 'text', text: 'fixture called' }] };
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }));
        });
      });
      await new Promise((resolve) => remote.listen(0, '127.0.0.1', resolve));
      args.push('--url', `http://127.0.0.1:${remote.address().port}/mcp`, '--port', '0');
    } else args.push('--', process.execPath, FIXTURE, marker);
    const fixtureEnv = { ...process.env };
    delete fixtureEnv.MCP_AUTH_TOKEN;
    child = spawn(process.execPath, [CLI, ...args], { cwd, env: fixtureEnv, stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.on('error', () => {}); // an invalid mode exits before a client can write
    let stderr = '';
    let resolveStart;
    const started = new Promise((resolve) => { resolveStart = resolve; });
    const timer = setTimeout(() => resolveStart({ kind: 'timeout' }), 10000);
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      if (/proxying .* mode|recording .*Ctrl\+C|HTTP proxy .*listening/.test(stderr)) {
        clearTimeout(timer);
        resolveStart({ kind: 'ready', url: stderr.match(/http:\/\/127\.0\.0\.1:\d+\/mcp/)?.[0] });
      }
    });
    closed = new Promise((resolve) => child.once('close', (code, signal) => {
      clearTimeout(timer);
      resolveStart({ kind: 'exit', code, signal });
      for (const waiter of pending.values()) waiter.reject(new Error(`CLI exited (${code}): ${stderr}`));
      pending.clear();
      resolve({ code, signal });
    }));
    input = readline.createInterface({ input: child.stdout });
    input.on('line', (line) => {
      const msg = JSON.parse(line);
      const waiter = pending.get(msg.id);
      if (waiter) { pending.delete(msg.id); waiter.resolve(msg); }
    });
    let seq = 0;
    const start = await started;
    const rpc = (method, params = {}) => {
      const msg = { jsonrpc: '2.0', id: ++seq, method, params };
      if (transport === 'http') return httpRpc(start.url, msg);
      return new Promise((resolve, reject) => {
        const deadline = setTimeout(() => { pending.delete(msg.id); reject(new Error(`No response to ${method}: ${stderr}`)); }, 5000);
        pending.set(msg.id, {
          resolve: (response) => { clearTimeout(deadline); resolve(response); },
          reject: (error) => { clearTimeout(deadline); reject(error); },
        });
        child.stdin.write(JSON.stringify(msg) + '\n');
      });
    };
    const effects = () => transport === 'http' ? calls : (
      fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').trim().split('\n').map(JSON.parse).filter((e) => e.kind === 'call').map((e) => e.name) : []
    );
    await check({ start, rpc, effects, cwd, marker, stderr: () => stderr });
    assert.equal(fs.existsSync(configFile) ? fs.readFileSync(configFile, 'utf8') : null, originalConfig, 'session overrides never modify config.json');
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      if (transport === 'stdio') child.stdin.end(JSON.stringify({ jsonrpc: '2.0', method: 'fixture/stop' }) + '\n');
      else child.kill();
      const force = setTimeout(() => child.kill('SIGKILL'), 2000);
      await closed;
      clearTimeout(force);
    } else if (closed) await closed;
    input?.close();
    if (remote) await new Promise((resolve) => remote.close(resolve));
    fs.rmSync(cwd, { recursive: true, force: true, maxRetries: 3 });
  }
}

const cases = [
  ['configured enforce', { mode: 'enforce' }, [], true],
  ['explicit observe overrides configured enforce', { mode: 'enforce' }, ['--mode', 'observe'], false],
  ['explicit enforce overrides configured observe', { mode: 'observe' }, ['--mode', 'enforce'], true],
  ['default observe without config', undefined, [], false],
];
for (const command of ['run', 'record']) for (const transport of ['stdio', 'http']) {
  for (const [label, config, flags, blocked] of cases) {
    test(`runtime mode ${command}/${transport}: ${label}`, async () => {
      await session(command, transport, config, flags, async ({ start, rpc, effects, cwd, stderr }) => {
        assert.equal(start.kind, 'ready', stderr());
        const list = await rpc('tools/list');
        assert.equal(list.result.tools.some((tool) => tool.name === base.name), !blocked, 'drifted tool visibility follows the selected mode');
        assert.equal(list.result.tools.some((tool) => tool.name === 'rugsnare_alert'), blocked);
        const result = await rpc('tools/call', { name: base.name, arguments: {} });
        if (blocked) {
          assert.match(result.error?.message ?? '', /quarantined/);
          assert.deepEqual(effects(), [], 'quarantined calls never reach the upstream tool');
        } else {
          assert.equal(result.result.content[0].text, 'fixture called');
          assert.deepEqual(effects(), [base.name], 'observe forwards the actual tool call');
          const corpus = path.join(cwd, '.rugsnare/canary/calls.jsonl');
          assert.equal(fs.existsSync(corpus), command === 'record', 'canary record remains a session-only option');
          if (command === 'record') {
            const traces = fs.readFileSync(corpus, 'utf8').trim().split('\n').map(JSON.parse);
            assert.ok(traces.some((trace) => trace.kind === 'call-trace' && trace.tool === base.name && trace.ok));
          }
        }
      });
    });
  }

  for (const [label, config, flags] of [
    ['invalid config mode', { mode: 'enfroce' }, []],
    ['invalid CLI mode', { mode: 'enforce' }, ['--mode', 'enfroce']],
  ]) {
    test(`runtime mode ${command}/${transport}: rejects ${label} before startup`, async () => {
      await session(command, transport, config, flags, async ({ start, marker, stderr }) => {
        assert.equal(start.kind, 'exit', `invalid mode started a proxy: ${stderr()}`);
        assert.equal(start.code, 2);
        assert.match(stderr(), /mode.*observe.*enforce/i);
        assert.equal(fs.existsSync(marker), false, 'the upstream command was never spawned');
        assert.doesNotMatch(stderr(), /listening on|HTTP proxy on/);
      });
    });
  }
}

for (const [label, config, flags, blocked] of [
  ['default fail-open', { failMode: 'open' }, [], false],
  ['configured fail-closed', { failMode: 'closed' }, [], true],
  ['explicit fail-closed overrides configured open', { failMode: 'open' }, ['--fail-closed'], true],
]) {
  test(`canary record/stdio: ${label} survives runtime option resolution`, async () => {
    await session('record', 'stdio', config, flags, async ({ start, rpc, effects, stderr }) => {
      assert.equal(start.kind, 'ready', stderr());
      // A non-string name deterministically throws in the existing policy
      // evaluator. Only this isolated inert fixture receives the malformed RPC.
      const result = await rpc('tools/call', { name: 17, arguments: {} });
      if (blocked) {
        assert.match(result.error?.message ?? '', /fail-closed/);
        assert.deepEqual(effects(), []);
      } else {
        assert.equal(result.result.content[0].text, 'fixture called');
        assert.deepEqual(effects(), [17]);
      }
    });
  });
}
