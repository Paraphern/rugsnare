import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  stableStringify, buildIdentity, compareIdentity, policyVersionFor,
  savePins, loadPins, pinTool, ensureServer,
} from '../src/pins.js';

/**
 * PIN-SPEC v1.1 acceptance (publicly promised 2026-10-13 in autogen#7353
 * and snyk#482): identity block + identityHash, policyVersion stamp,
 * IDENTITY/POLICY drift classes, byte-stable pins.json serialization.
 */

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, '..', 'src', 'cli.js');
const FIX_A = path.join(HERE, 'fixtures', 'identity-a.mjs');
const FIX_B = path.join(HERE, 'fixtures', 'identity-b.mjs');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rs-v11-'));
}

const RM = { recursive: true, force: true, maxRetries: 5, retryDelay: 150 };
// best-effort cleanup: on Windows the just-exited CLI child can hold the
// dir handle a beat longer than any retry budget - a leftover tmp dir is
// harmless, a failed TEST because of cleanup is not
const cleanup = (dir) => { try { fs.rmSync(dir, RM); } catch { /* handle race */ } };

// ---- stableStringify ---------------------------------------------------------

test('v1.1: stableStringify is key-order independent (JCS-hashable)', () => {
  const a = { version: 1, servers: { x: { url: 'u', tools: {} } }, skills: {} };
  const b = { skills: {}, servers: { x: { tools: {}, url: 'u' } }, version: 1 };
  assert.equal(stableStringify(a, 2), stableStringify(b, 2), 'same data, different insertion order -> same bytes');
  assert.equal(stableStringify(a, 0), stableStringify(b, 0), 'compact form also stable');
  // arrays keep order (sequences, not maps)
  assert.notEqual(stableStringify({ list: [1, 2] }, 0), stableStringify({ list: [2, 1] }, 0));
  // compact form really is compact
  assert.ok(!stableStringify(a, 0).includes('\n'));
  assert.ok(!stableStringify(a, 0).includes(' '));
});

// ---- identity block ----------------------------------------------------------

test('v1.1: buildIdentity reads package/version/entry/url from all cmd shapes', () => {
  const npx = buildIdentity({ command: 'npx', args: ['-y', 'some-package@1.2.3'] });
  assert.equal(npx.package, 'some-package');
  assert.equal(npx.resolvedVersion, '1.2.3');
  assert.equal(npx.entryPath, null);
  assert.equal(npx.url, null);
  assert.match(npx.identityHash, /^sha256:[0-9a-f]{64}$/);

  const local = buildIdentity({ command: 'node', args: ['node_modules/@scope/pkg/dist/transports/stdio.js'] });
  assert.equal(local.package, '@scope/pkg');
  assert.equal(local.entryPath, 'dist/transports/stdio.js', 'entry normalized relative to the package root');

  const remote = buildIdentity({ url: 'https://example.com/mcp' });
  assert.equal(remote.url, 'https://example.com/mcp');
  assert.equal(remote.package, null);

  // deterministic: identical input -> identical hash; entry move -> new hash
  const npx2 = buildIdentity({ command: 'npx', args: ['-y', 'some-package@1.2.3'] });
  assert.equal(npx.identityHash, npx2.identityHash);
  const moved = buildIdentity({ command: 'node', args: ['node_modules/@scope/pkg/dist/cli.js'] });
  assert.notEqual(local.identityHash, moved.identityHash, 'supabase-style entry move changes the identityHash');
});

test('v1.1: compareIdentity reports the moved fields, null when unchanged', () => {
  const a = buildIdentity({ command: 'node', args: ['node_modules/@scope/pkg/dist/transports/stdio.js'] });
  const b = buildIdentity({ command: 'node', args: ['node_modules/@scope/pkg/dist/cli.js'] });
  const same = buildIdentity({ command: 'node', args: ['node_modules/@scope/pkg/dist/transports/stdio.js'] });
  assert.equal(compareIdentity(a, same), null);
  const diff = compareIdentity(a, b);
  assert.ok(diff, 'entry move is a diff');
  assert.deepEqual(diff.entryPath, { from: 'dist/transports/stdio.js', to: 'dist/cli.js' });
});

// ---- policy stamp ------------------------------------------------------------

test('v1.1: policyVersionFor is derived from the running binary', () => {
  assert.match(policyVersionFor(), /^rugsnare-\d+\.\d+\.\d+/);
});

// ---- byte-stable pins.json ---------------------------------------------------

test('v1.1: re-scan of the same version writes byte-identical pins.json', async () => {
  const dir = tmp();
  try {
    const tool = { name: 't', description: 'd', inputSchema: { type: 'object' } };
    const cmd = { command: 'node', args: ['node_modules/svc/dist/index.js'] };
    // first scan: fresh store
    const pins = { version: 1, servers: {} };
    pinTool(ensureServer(pins, 'svc', cmd), tool, 'h1', { reason: 'scan' });
    savePins(pins, dir);
    const first = fs.readFileSync(path.join(dir, '.rugsnare', 'pins.json'), 'utf8');
    assert.ok(first.includes('"policyVersion"'), 'policy stamp present');
    // second scan: the REAL path - load the existing store, re-ensure, re-pin
    const reloaded = loadPins(dir);
    pinTool(ensureServer(reloaded, 'svc', cmd), tool, 'h1', { reason: 'scan' });
    savePins(reloaded, dir);
    const second = fs.readFileSync(path.join(dir, '.rugsnare', 'pins.json'), 'utf8');
    assert.equal(first, second, 'identical re-scan -> identical bytes');
    // pinTool must not churn pinnedAt when the contract is unchanged
    const sp = { tools: {} };
    const p1 = pinTool(sp, tool, 'h1', { reason: 'scan' });
    const at = p1.pinnedAt;
    const p2 = pinTool(sp, tool, 'h1', { reason: 'scan' });
    assert.equal(p2.pinnedAt, at, 'unchanged contract keeps its pinnedAt');
    const p3 = pinTool(sp, { ...tool, description: 'changed' }, 'h2', { reason: 'scan' });
    // same-ms runs are legitimate; give the clock a beat before asserting
    if (p3.pinnedAt === at) {
      await new Promise((r) => setTimeout(r, 5));
      const p4 = pinTool(sp, { ...tool, description: 'changed again' }, 'h3', { reason: 'scan' });
      assert.notEqual(p4.pinnedAt, at, 'changed contract refreshes');
    }
  } finally {
    cleanup(dir);
  }
});

// ---- acceptance e2e: IDENTITY and POLICY through the real CLI ----------------

test('v1.1 acceptance: entry move with intact tool hashes -> IDENTITY, exit 1', async () => {
  const dir = tmp();
  try {
    const cfg = path.join(dir, 'mcp.json');
    fs.writeFileSync(cfg, JSON.stringify({ mcpServers: { svc: { command: 'node', args: [FIX_A] } } }));
    await run(process.execPath, [CLI, 'scan', '--config', cfg, '--yes'], { cwd: dir, timeout: 60000 });
    // re-scan of the SAME state must be byte-identical through the real CLI
    const before = fs.readFileSync(path.join(dir, '.rugsnare', 'pins.json'), 'utf8');
    await run(process.execPath, [CLI, 'scan', '--config', cfg, '--yes'], { cwd: dir, timeout: 60000 });
    const after = fs.readFileSync(path.join(dir, '.rugsnare', 'pins.json'), 'utf8');
    assert.equal(before, after, 're-scan of the same version: byte-identical');
    // same contracts, different launch path (the supabase shape)
    fs.writeFileSync(cfg, JSON.stringify({ mcpServers: { svc: { command: 'node', args: [FIX_B] } } }));
    const r = await run(process.execPath, [CLI, 'diff', '--config', cfg], { cwd: dir, timeout: 60000 }).catch((e) => e);
    const out = String((r.stdout ?? '') + (r.stderr ?? '') + (r.message ?? ''));
    assert.match(out, /IDENTITY/);
    assert.match(out, /different build\/path/);
    assert.equal(r.code ?? r.exitCode, 1, 'IDENTITY is drift: exit 1');
  } finally {
    cleanup(dir);
  }
});

// autoclav-67 defect: the byte-stability skip swallowed the approval flip -
// a first-sight proxy entry (approved:false) could never become approved
// through scan/approve until its contract changed ("NEVER APPROVED" in
// doctor, forever). The skip now only guards ALREADY-APPROVED entries.
test('v1.1: unchanged contract still flips approved:false -> true (autoclav-67)', async () => {
  const tool = { name: 't', description: 'd', inputSchema: { type: 'object' } };
  const sp = { tools: {} };
  // first sight through the proxy: unapproved
  const p1 = pinTool(sp, tool, 'h1', { approved: false });
  assert.equal(p1.approved, false);
  const unapprovedAt = p1.pinnedAt;
  await new Promise((r) => setTimeout(r, 5));
  // human approves; contract UNCHANGED - the flip must land
  const p2 = pinTool(sp, tool, 'h1', { approved: true, reason: 'approve' });
  assert.equal(p2.approved, true, 'approve flips the first-sight entry');
  assert.notEqual(p2.pinnedAt, unapprovedAt, 'the deliberate act refreshes pinnedAt');
  // steady state: approved + unchanged ROUTINE SCAN -> byte-stable skip (no churn)
  const p3 = pinTool(sp, tool, 'h1', { approved: true, reason: 'scan' });
  assert.equal(p3, p2, 'approved unchanged entry is returned as-is');
  // but an explicit approve of an unchanged approved entry is a deliberate
  // re-approval act and refreshes its timestamp (autoclav-68 nuance)
  await new Promise((r) => setTimeout(r, 5));
  const p2b = pinTool(sp, tool, 'h1', { approved: true, reason: 'approve' });
  assert.notEqual(p2b.pinnedAt, p2.pinnedAt, 'approve refreshes even when nothing changed');
  assert.equal(p2b.firstSeen, p1.firstSeen, 'firstSeen never changes');
  // annotation change with identical hash must still refresh (hints are
  // pinned but not part of toolHash)
  const hinted = { ...tool, annotations: { readOnlyHint: true } };
  const p4 = pinTool(sp, hinted, 'h1', { approved: true, reason: 'scan' });
  assert.deepEqual(p4.annotations, { readOnlyHint: true });
  // key-order independence (the P0-2 trap, caught live on hubspot): stored
  // annotations read back from the file with SORTED keys, the live object
  // arrives in wire order - the guard must compare canonically, or every
  // multi-key annotation set breaks byte-stability on each re-scan
  const wireOrder = { title: 'Get X', readOnlyHint: true, destructiveHint: false };
  const p5 = pinTool(sp, { ...tool, annotations: wireOrder }, 'h1', { approved: true, reason: 'scan' });
  assert.ok(p5.pinnedAt, 'annotation-bearing entry written');
  const storedOrder = JSON.parse(JSON.stringify({ destructiveHint: false, readOnlyHint: true, title: 'Get X' })); // file order = sorted
  const sp2 = { tools: { t: { ...JSON.parse(JSON.stringify(p5)) } } };
  sp2.tools.t.annotations = storedOrder;
  const p6 = pinTool(sp2, { ...tool, annotations: wireOrder }, 'h1', { approved: true, reason: 'scan' });
  assert.equal(p6, sp2.tools.t, 'same annotations in a different key order still skips');
});

test('v1.1 acceptance: pins from an older policy -> POLICY, not a silent re-grade', async () => {
  const dir = tmp();
  try {
    const cfg = path.join(dir, 'mcp.json');
    fs.writeFileSync(cfg, JSON.stringify({ mcpServers: { svc: { command: 'node', args: [FIX_A] } } }));
    await run(process.execPath, [CLI, 'scan', '--config', cfg, '--yes'], { cwd: dir, timeout: 60000 });
    // forge an older policy stamp (no signing key in the isolated HOME)
    const pinsFile = path.join(dir, '.rugsnare', 'pins.json');
    const pins = JSON.parse(fs.readFileSync(pinsFile, 'utf8'));
    pins.policyVersion = 'rugsnare-1.2.0';
    fs.writeFileSync(pinsFile, JSON.stringify(pins, null, 2) + '\n');
    const r = await run(process.execPath, [CLI, 'diff', '--config', cfg], { cwd: dir, timeout: 60000 }).catch((e) => e);
    const out = String((r.stdout ?? '') + (r.stderr ?? '') + (r.message ?? ''));
    assert.match(out, /POLICY/);
    assert.match(out, /re-graded under a newer verifier policy/);
    assert.equal(r.code ?? r.exitCode, 1, 'POLICY is a finding: exit 1');
  } finally {
    cleanup(dir);
  }
});

// §7 for prompts/resources: re-scan of the same server must not touch
// prompt or resource entries whose hash is unchanged. Before this fix,
// firstSeen churned on every scan (cli.js:342/348 always wrote now()).
test('v1.1: re-scan of server with prompts/resources = byte-identical pins.json', async () => {
  const FIXTURE = path.join(HERE, 'fixtures', 'prompts-stable.mjs');
  const dir = tmp();
  try {
    const cfg = path.join(dir, 'mcp.json');
    fs.writeFileSync(cfg, JSON.stringify({ mcpServers: { pr: { command: 'node', args: [FIXTURE] } } }));
    await run(process.execPath, [CLI, 'scan', '--config', cfg, '--yes'], { cwd: dir, timeout: 60000 });
    const before = fs.readFileSync(path.join(dir, '.rugsnare', 'pins.json'), 'utf8');
    // verify prompts and resources were actually pinned (not empty)
    const pins = JSON.parse(before);
    assert.ok(Object.keys(pins.servers.pr.prompts ?? {}).length > 0, 'prompts pinned');
    assert.ok(Object.keys(pins.servers.pr.resources ?? {}).length > 0, 'resources pinned');
    // give the clock a beat so timestamps WOULD differ if churned
    await new Promise((r) => setTimeout(r, 50));
    await run(process.execPath, [CLI, 'scan', '--config', cfg, '--yes'], { cwd: dir, timeout: 60000 });
    const after = fs.readFileSync(path.join(dir, '.rugsnare', 'pins.json'), 'utf8');
    assert.equal(before, after, 're-scan with unchanged prompts/resources must be byte-identical');
  } finally {
    cleanup(dir);
  }
});
