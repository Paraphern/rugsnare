import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// T-039 F-4: the runId guard in publish-status.sh. A re-run of an OLD CI run
// finishes with a NEWER wall-clock timestamp than the status already on the
// branch - the timestamp guard alone would let it overwrite a newer run's
// verdict. runId is the authoritative recency signal: existing >= ours -> skip.
//
// The simulation builds a local bare "origin" with a rugsnare/status branch
// (runId 200, verdict drift), then runs the real script as runId 100 - the
// skip path exits 0 BEFORE any push, so no network is touched.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, '..', '..', '.github', 'actions', 'diff', 'publish-status.sh');

function git(cwd, args) {
  return execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8', windowsHide: true });
}

function runScript(args, env, cwd) {
  try {
    const out = execFileSync('bash', [SCRIPT, ...args], { cwd, encoding: 'utf8', timeout: 60000, env: { ...process.env, ...env }, windowsHide: true });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') };
  }
}

test('T-039 F-4: stale re-run (older runId) never overwrites a newer status', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-pubstatus-'));
  try {
    const bare = path.join(root, 'remote.git');
    const work = path.join(root, 'work');
    git(root, ['init', '--bare', bare]);
    git(root, ['clone', bare, work]);

    // seed a commit on the default branch
    fs.writeFileSync(path.join(work, 'seed.txt'), 'seed');
    git(work, ['add', '.']);
    git(work, ['commit', '-m', 'seed']);
    const mainBranch = git(work, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();

    // create rugsnare/status holding runId 200 (drift) with an OLD timestamp
    git(work, ['checkout', '--orphan', 'rugsnare/status']);
    git(work, ['rm', '-rf', '--quiet', '.']);
    fs.writeFileSync(path.join(work, 'status.json'), JSON.stringify({
      verdict: 'drift', findings: 3, config: '.mcp.json', timestamp: '2026-11-01T00:00:00Z',
      runId: '200', repo: 'x/y', branch: mainBranch, summary: 'DRIFT DETECTED: 3 finding(s)',
    }));
    git(work, ['add', 'status.json']);
    git(work, ['commit', '-m', 'status seed']);
    git(work, ['push', 'origin', 'rugsnare/status']);
    git(work, ['checkout', mainBranch]);

    // act: the script runs as re-run of runId 100 (older), fresh timestamp,
    // different verdict (clean) so the unchanged-dedup cannot fire first
    const older = runScript(['clean', '0', '.mcp.json'], { GITHUB_RUN_ID: '100', GITHUB_REPOSITORY: 'x/y', GITHUB_REF_NAME: mainBranch }, work);
    assert.equal(older.code, 0, `script must exit 0 on the skip path\n${older.out}`);
    assert.match(older.out, /run 200 >= our 100/, 'runId guard fires for the stale re-run');

    // the status branch is untouched
    const still = JSON.parse(git(work, ['show', 'origin/rugsnare/status:status.json']));
    assert.equal(still.runId, '200', 'status branch still holds run 200');
    assert.equal(still.verdict, 'drift', 'drift verdict NOT overwritten by the stale clean re-run');

    // same-run re-execution is also a skip (>=, not >)
    const same = runScript(['clean', '0', '.mcp.json'], { GITHUB_RUN_ID: '200', GITHUB_REPOSITORY: 'x/y', GITHUB_REF_NAME: mainBranch }, work);
    assert.equal(same.code, 0);
    assert.match(same.out, /run 200 >= our 200/, 'same runId skipped too');
  } finally {
    try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* Windows */ }
  }
});
