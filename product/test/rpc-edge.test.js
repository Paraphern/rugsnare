import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchTools } from '../src/rpc.js';
import { toolHash } from '../src/hash.js';

const fixture = (name) => path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', name);

test('edge: non-JSON noise on stdout is skipped, unicode descriptions hashed stably', async () => {
  const { tools } = await fetchTools({ command: 'node', args: [fixture('edge-garbage.js')], timeoutMs: 15000 });
  assert.equal(tools.length, 2, 'must see through boot/debug/progress noise');
  assert.equal(tools[0].name, 'héllo_wörld');
  // stable hash across two runs (unicode determinism)
  const first = toolHash(tools[0]);
  const { tools: again } = await fetchTools({ command: 'node', args: [fixture('edge-garbage.js')], timeoutMs: 15000 });
  assert.equal(toolHash(again[0]), first, 'unicode descriptions must hash identically across runs');
});

test('edge: 120 tools pinned and hashed fast', async () => {
  const t0 = Date.now();
  const { tools } = await fetchTools({ command: 'node', args: [fixture('edge-many.js')], timeoutMs: 15000 });
  const elapsed = Date.now() - t0;
  assert.equal(tools.length, 120);
  for (const t of tools) toolHash(t);
  assert.ok(elapsed < 15000, `round-trip should be well under the timeout (took ${elapsed}ms)`);
});

test('edge: server exiting right after initialize rejects with a clear error', async () => {
  await assert.rejects(
    fetchTools({ command: 'node', args: [fixture('edge-crash.js')], timeoutMs: 15000 }),
    /exited early|No response|timed out/i
  );
});

test('edge: silent server (no tools/list response) hits the RPC timeout and rejects', async () => {
  await assert.rejects(
    fetchTools({ command: 'node', args: [fixture('edge-hang.js')], timeoutMs: 2000 }),
    /timed out|No response/i
  );
});

test('edge: paginated tools/list (nextCursor) is followed to the last page', async () => {
  const { tools } = await fetchTools({ command: 'node', args: [fixture('edge-paged.js')], timeoutMs: 15000 });
  assert.deepEqual(
    tools.map((t) => t.name),
    ['page_one_a', 'page_one_b', 'page_two_a', 'page_two_b'],
    'both pages must be collected — a missing page would silently weaken the baseline'
  );
});

test('edge: UTF-8 BOM in config files (Windows Notepad) does not break parsing', async () => {
  const { execFile } = await import('node:child_process');
  const os = await import('node:os');
  const fs = (await import('node:fs')).default;
  const path = (await import('node:path')).default;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-bom-'));
  try {
    const cfg = path.join(dir, 'mcp.json');
    const json = JSON.stringify({ mcpServers: { paged: { command: 'node', args: [fixture('edge-paged.js')] } } });
    fs.writeFileSync(cfg, '\uFEFF' + json, 'utf8'); // with BOM
    const out = await new Promise((resolve, reject) => {
      execFile('node', [path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js'), 'scan', '--config', cfg], { cwd: dir, timeout: 60000 }, (err, stdout) => err ? reject(err) : resolve(stdout));
    });
    assert.match(out, /pinned paged: 4 tool/, 'BOM-prefixed config must scan fine and see all paginated tools');
  } finally {
    // Windows: freshly-killed children can hold dir handles — never fail the
    // test on cleanup (the test verifies BOM parsing, not temp dir hygiene)
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* best-effort */ }
  }
});
