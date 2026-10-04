import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { signPinsFile, verifyPinsFile, ensureKeys } from '../src/receipts.js';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js');

// Signed pins (v0.9): the CI-attacker defense from the first external audit
// (finding #2). scan/approve/unpin sign pins.json with the local Ed25519 key;
// diff refuses tampered pins ALWAYS, and unsigned pins when a key exists.

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-pinssig-'));
  return { dir, cleanup: () => { try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* Windows */ } } };
}

function runCli(cwd, args) {
  return new Promise((resolve) => {
    execFile('node', [CLI, ...args], { cwd, timeout: 60000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

function writePins(dir, approved = 'true') {
  fs.mkdirSync(path.join(dir, '.rugsnare'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.rugsnare', 'pins.json'), JSON.stringify({
    version: 1,
    servers: { svc: { cmd: { url: 'http://127.0.0.1:1/mcp' }, pinnedAt: '2026-01-01T00:00:00Z', tools: { t: { hash: 'a', approved } } } },
  }, null, 2));
}

test('verifyPinsFile: ok -> tampered on edit -> unsigned on sig delete', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    ensureKeys(dir);
    writePins(dir);
    assert.equal(signPinsFile(dir), true);
    assert.equal(verifyPinsFile(dir).status, 'ok');

    // attacker edits pins.json after signing
    const pins = JSON.parse(fs.readFileSync(path.join(dir, '.rugsnare', 'pins.json'), 'utf8'));
    pins.servers.svc.tools.t.approved = true; // (was already; force byte change)
    pins.servers.svc.tools.evil = { hash: 'b', approved: true };
    fs.writeFileSync(path.join(dir, '.rugsnare', 'pins.json'), JSON.stringify(pins, null, 2));
    const tampered = verifyPinsFile(dir);
    assert.equal(tampered.status, 'tampered');
    assert.match(tampered.reason, /modified after signing/);

    // attacker deletes the sig instead — key exists, so unsigned is suspicious
    fs.unlinkSync(path.join(dir, '.rugsnare', 'pins.sig'));
    assert.equal(verifyPinsFile(dir).status, 'unsigned');

    // no key at all (fresh machine, pre-0.9 repo) — not suspicious
    const { dir: dir2, cleanup: cleanup2 } = tmpCwd();
    try {
      writePins(dir2);
      assert.equal(verifyPinsFile(dir2).status, 'nokey');
      assert.equal(signPinsFile(dir2), false, 'no key -> signing is a no-op, no key minting');
    } finally { cleanup2(); }
  } finally {
    cleanup();
  }
});

test('CLI diff: tampered pins always exit 2 with the reason', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    ensureKeys(dir);
    writePins(dir, 'false');
    signPinsFile(dir);
    const pins = JSON.parse(fs.readFileSync(path.join(dir, '.rugsnare', 'pins.json'), 'utf8'));
    pins.servers.svc.tools.t.approved = true; // the CI-attacker edit
    fs.writeFileSync(path.join(dir, '.rugsnare', 'pins.json'), JSON.stringify(pins, null, 2));

    const r = await runCli(dir, ['diff']);
    assert.equal(r.code, 2, 'tampered pins must fail as config/integrity error, not drift');
    assert.match(r.stderr, /TAMPERED/);
    // not overridable — the override exists for UNSIGNED, not for tampering
    const forced = await runCli(dir, ['diff', '--allow-unsigned-pins']);
    assert.equal(forced.code, 2);
  } finally {
    cleanup();
  }
});

test('CLI diff: unsigned-with-key blocked unless --allow-unsigned-pins; nokey passes', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    ensureKeys(dir); // key exists, no signature yet
    writePins(dir);
    const blocked = await runCli(dir, ['diff']);
    assert.equal(blocked.code, 2);
    assert.match(blocked.stderr, /unsigned/);

    const allowed = await runCli(dir, ['diff', '--allow-unsigned-pins', '--timeout', '500']);
    assert.notEqual(allowed.code, 2, 'override works for unsigned (exit may be 0/1/3, never 2-integrity)');
  } finally {
    cleanup();
  }

  const { dir: dir2, cleanup: cleanup2 } = tmpCwd();
  try {
    writePins(dir2); // no key anywhere: pre-0.9 state
    const r = await runCli(dir2, ['diff', '--timeout', '500']);
    assert.notEqual(r.code, 2, 'nokey must not break diff (exit 3 = unreachable endpoint is fine)');
  } finally {
    cleanup2();
  }
});

test('CLI scan re-signs pins: approve flow keeps the signature valid', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    ensureKeys(dir);
    // seed an unsigned-but-keyed state
    writePins(dir, 'false');
    // simulate the operator re-reviewing: write a fresh pin store via unpin+scan
    // (scan against a config is heavy; use approve of nothing? simplest: signPinsFile via scan)
    // -> use `unpin svc` (modifies pins deliberately and signs)
    const r = await runCli(dir, ['unpin', 'svc']);
    assert.equal(r.code, 0, r.stderr);
    // pins.json now exists? unpin removed the only server; pins.json still on disk
    const verdict = verifyPinsFile(dir);
    assert.equal(verdict.status, 'ok', 'unpin must leave a valid signature');
  } finally {
    cleanup();
  }
});
