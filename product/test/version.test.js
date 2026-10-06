import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getVersion, compareVersions, fetchLatestVersion } from '../src/version.js';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js');

test('getVersion: matches package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(getVersion(), pkg.version);
});

test('compareVersions: semver ordering incl. prerelease rules', () => {
  assert.equal(compareVersions('1.0.0', '1.0.1'), -1);
  assert.equal(compareVersions('1.1.0', '1.0.99'), 1);
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.equal(compareVersions('1.1.0-native.1', '1.1.0-native.2'), -1);
  assert.equal(compareVersions('2.0.0', '1.99.99'), 1);
  // different lengths pad with zeros
  assert.equal(compareVersions('1.0', '1.0.0'), 0);
  // semver: a prerelease is LOWER than the plain release (review 32)
  assert.equal(compareVersions('1.1.0-native.2', '1.1.0'), -1);
  assert.equal(compareVersions('1.1.0', '1.1.0-native.2'), 1);
  // no NaN poisoning from non-numeric prerelease fields
  assert.equal(compareVersions('1.1.0-native.2', '1.1.0-alpha.1'), 1);
});

test('fetchLatestVersion: parses registry response (injectable URL)', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ version: '9.9.9' }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const v = await fetchLatestVersion({ registry: `http://127.0.0.1:${server.address().port}/latest` });
    assert.equal(v, '9.9.9');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('fetchLatestVersion: offline/broken registry returns null, never throws', async () => {
  assert.equal(await fetchLatestVersion({ registry: 'http://127.0.0.1:1/none', timeoutMs: 500 }), null);
});

test('CLI: `rugsnare version` prints the running version', async () => {
  const r = await new Promise((resolve) => {
    execFile('node', [CLI, 'version'], { timeout: 30000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /^rugsnare \d+\.\d+\.\d+/);
});

test('doctor: update check section appears (offline-safe wording)', async () => {
  const r = await new Promise((resolve) => {
    execFile('node', [CLI, 'doctor'], { timeout: 60000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
  // doctor exit code depends on local setup; the version line must exist regardless
  assert.match(r.stdout + r.stderr, /version: \d+\.\d+\.\d+/);
});
