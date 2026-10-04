import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js');

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-doctor-'));
  return { dir, cleanup: () => { try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* Windows: best-effort */ } } };
}

function runCli(cwd, args) {
  return new Promise((resolve) => {
    execFile('node', [CLI, ...args], { cwd, timeout: 60000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

test('doctor: empty setup is OK with actionable warnings', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const r = await runCli(dir, ['doctor']);
    assert.equal(r.code, 0);
    assert.match(r.stdout, /doctor: OK/);
    assert.match(r.stdout, /nothing pinned/);
    assert.match(r.stdout, /receipts: no signing key/);
  } finally {
    cleanup();
  }
});

test('doctor: unapproved pins are listed for review', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    fs.mkdirSync(path.join(dir, '.rugsnare'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.rugsnare', 'pins.json'), JSON.stringify({
      version: 1,
      servers: {
        myserver: {
          cmd: { url: 'https://example.com/mcp' },
          pinnedAt: '2026-01-01T00:00:00Z',
          tools: {
            good: { hash: 'a', approved: true },
            sketchy: { hash: 'b', approved: false },
          },
        },
      },
    }));
    const r = await runCli(dir, ['doctor']);
    assert.equal(r.code, 0, 'unapproved pins warn, they do not fail');
    assert.match(r.stdout, /NEVER APPROVED/);
    assert.match(r.stdout, /myserver\/sketchy/);
    assert.doesNotMatch(r.stdout, /myserver\/good/);
    assert.match(r.stdout, /rugsnare approve <server>/);
  } finally {
    cleanup();
  }
});

test('doctor: intact receipts chain passes; tampered chain is a PROBLEM (exit 2)', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    // produce events, then sign them
    fs.mkdirSync(path.join(dir, '.rugsnare'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.rugsnare', 'events.jsonl'),
      ['{"kind":"scan","server":"a","ts":"2026-01-01T00:00:00Z"}', '{"kind":"scan","server":"b","ts":"2026-01-01T00:01:00Z"}'].join('\n') + '\n');
    const sign = await runCli(dir, ['receipts', 'sign']);
    assert.equal(sign.code, 0, sign.stderr);

    const ok = await runCli(dir, ['doctor']);
    assert.equal(ok.code, 0);
    assert.match(ok.stdout, /chain intact/);

    // tamper: rewrite the first receipt's event after signing
    const receiptsFile = path.join(dir, '.rugsnare', 'receipts.jsonl');
    const lines = fs.readFileSync(receiptsFile, 'utf8').split('\n').filter(Boolean);
    const first = JSON.parse(lines[0]);
    first.event.server = 'rewritten';
    lines[0] = JSON.stringify(first);
    fs.writeFileSync(receiptsFile, lines.join('\n') + '\n');

    const bad = await runCli(dir, ['doctor']);
    assert.equal(bad.code, 2, 'tampered audit trail must fail the doctor');
    assert.match(bad.stderr, /receipts chain BROKEN/);
    assert.match(bad.stderr, /doctor: NOT OK/);
  } finally {
    cleanup();
  }
});
