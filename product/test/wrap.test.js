import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanToolDescription } from '../src/advisory.js';
import { wrapServer, unwrapServer } from '../src/wrap.js';

// ---- A18: ANSI escape sequences ----------------------------------------------

test('A18: ANSI escape in description forces advisory; clean text stays silent', () => {
  const dirty = 'Search files.\x1b[31m\x1b[8mHidden instructions here\x1b[0m';
  const r = scanToolDescription(dirty);
  assert.ok(r.signals.some((s) => s.id === 'A18'), 'ANSI escape must trigger A18');
  assert.equal(r.advisory, true, 'A18 alone forces advisory');
  assert.equal(scanToolDescription('Search files normally.').signals.length, 0);
});

// ---- wrap/unwrap ----------------------------------------------------------------

function tmpConfig(serverName, entry) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-wrap-'));
  const file = path.join(dir, '.mcp.json');
  fs.writeFileSync(file, JSON.stringify({ mcpServers: { [serverName]: entry } }, null, 2));
  return { dir, file, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('wrap: inserts proxy command, preserves original, creates backup', () => {
  const { dir, file, cleanup } = tmpConfig('myserver', { command: 'node', args: ['server.js', '--port', '3000'] });
  try {
    // make cwd point to tmp so findConfigFile finds it
    const origCwd = process.cwd();
    process.chdir(dir);
    try {
      const r = wrapServer('myserver');
      assert.ok(!r.error, r.error);
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      const entry = json.mcpServers.myserver;
      assert.equal(entry.command, 'npx');
      assert.deepEqual(entry.args, ['-y', 'rugsnare', 'run', '--name', 'myserver', '--', 'node', 'server.js', '--port', '3000']);
      assert.deepEqual(entry.__rugsnare_original_command, { command: 'node', args: ['server.js', '--port', '3000'] });
      assert.ok(fs.existsSync(file + '.rugsnare.bak'), 'backup must exist');
    } finally { process.chdir(origCwd); }
  } finally { cleanup(); }
});

test('wrap twice: rejects; unwrap: restores original and removes backup', () => {
  const { dir, file, cleanup } = tmpConfig('svc', { command: 'python', args: ['server.py'] });
  try {
    const origCwd = process.cwd();
    process.chdir(dir);
    try {
      wrapServer('svc');
      const again = wrapServer('svc');
      assert.ok(again.error, 'second wrap must fail');
      assert.match(again.error, /already wrapped/);

      const unwrapped = unwrapServer('svc');
      assert.ok(!unwrapped.error, unwrapped.error);
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      const entry = json.mcpServers.svc;
      assert.equal(entry.command, 'python');
      assert.deepEqual(entry.args, ['server.py']);
      assert.equal(entry.__rugsnare_original_command, undefined);
      assert.ok(!fs.existsSync(file + '.rugsnare.bak'), 'backup removed when no servers wrapped');
    } finally { process.chdir(origCwd); }
  } finally { cleanup(); }
});

test('wrap: HTTP server rejected with clear message', () => {
  const { dir, cleanup } = tmpConfig('remote', { type: 'http', url: 'https://example.com/mcp' });
  try {
    const origCwd = process.cwd();
    process.chdir(dir);
    try {
      const r = wrapServer('remote');
      assert.ok(r.error);
      assert.match(r.error, /HTTP transport/);
    } finally { process.chdir(origCwd); }
  } finally { cleanup(); }
});
