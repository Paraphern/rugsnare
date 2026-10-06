// Tests for the worker-side static history core. Pure functions, Node runs
// them fine; the same code executes inside the Cloudflare Worker.

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTar, extractContracts, diffContracts, validPackageName, sortVersions, packageSlug, parseScanCommit } from '../../worker/history-core.js';

/** Build a minimal ustar archive from {path, data} entries. */
function buildTar(entries) {
  const enc = new TextEncoder();
  const blocks = [];
  for (const e of entries) {
    const name = enc.encode(e.path);
    const data = enc.encode(e.data);
    const header = new Uint8Array(512);
    header.set(name.subarray(0, 100), 0);
    header.set(enc.encode(data.length.toString(8).padStart(11, '0') + '\0'), 124);
    header[156] = 48; // regular file
    header.set(enc.encode('ustar\0'), 257);
    header.set(enc.encode('00'), 263);
    // checksum: spaces while computing
    header.set(enc.encode(' '.repeat(8)), 148);
    let sum = 0;
    for (const b of header) sum += b;
    header.set(enc.encode(sum.toString(8).padStart(6, '0') + '\0 '), 148);
    blocks.push(header, data, new Uint8Array((512 - (data.length % 512)) % 512));
  }
  blocks.push(new Uint8Array(1024)); // end of archive
  const total = blocks.reduce((n, b) => n + b.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const b of blocks) { out.set(b, o); o += b.length; }
  return out;
}

const dec = (u8) => new TextDecoder().decode(u8);

test('parseTar: reads ustar members with sizes and names', () => {
  const tar = buildTar([
    { path: 'package/package.json', data: '{"name":"x"}' },
    { path: 'package/dist/index.js', data: 'console.log(1)' },
  ]);
  const files = parseTar(tar);
  assert.equal(files.length, 2);
  assert.equal(files[0].path, 'package/package.json');
  assert.equal(dec(files[0].bytes), '{"name":"x"}');
  assert.equal(files[1].path, 'package/dist/index.js');
});

test('extractContracts: finds name/description pairs in dist bundles', () => {
  const src = `
    const tools = [
      { name: 'kill_process', description: 'Send a signal to a process ID. Requires confirmation unless whitelisted.' },
      { name: 'chmod', description: 'Change file mode bits.' },
      { name: 'list_servers' , description: 'List configured servers.' },
    ];
  `;
  const files = [{ path: 'package/dist/tools/definitions.js', bytes: new TextEncoder().encode(src) }];
  const contracts = extractContracts(files);
  assert.equal(contracts.get('kill_process'), 'Send a signal to a process ID. Requires confirmation unless whitelisted.');
  assert.equal(contracts.get('chmod'), 'Change file mode bits.');
  assert.ok(contracts.has('list_servers'));
});

test('extractContracts: skips non-code files and nameless noise', () => {
  const files = [
    { path: 'package/logo.png', bytes: new TextEncoder().encode('name: fake, description: nope') },
    { path: 'package/README.md', bytes: new TextEncoder().encode('name: md, description: nope') },
    { path: 'package/dist/a.js', bytes: new TextEncoder().encode('const hostname = 1; const description = "no name before";') },
  ];
  assert.equal(extractContracts(files).size, 0);
});

test('diffContracts: drift/new/removed with was/became text', () => {
  const older = new Map([['kill_process', 'Ask first.'], ['gone', 'old tool']]);
  const newer = new Map([['kill_process', 'Do it.'], ['added', 'new tool']]);
  const findings = diffContracts(older, newer);
  const byName = Object.fromEntries(findings.map((f) => [f.tool, f]));
  assert.equal(byName.kill_process.status, 'DRIFT');
  assert.equal(byName.kill_process.oldDescription, 'Ask first.');
  assert.equal(byName.kill_process.newDescription, 'Do it.');
  assert.equal(byName.gone.status, 'REMOVED');
  assert.equal(byName.added.status, 'NEW');
  assert.equal(diffContracts(older, older).length, 0);
});

test('validPackageName: bare, scoped ok; traversal and urls rejected', () => {
  assert.ok(validPackageName('my-mcp-server'));
  assert.ok(validPackageName('@scope/pkg'));
  assert.ok(!validPackageName('../etc/passwd'));
  assert.ok(!validPackageName('https://evil.example.com'));
  assert.ok(!validPackageName(''));
});

test('sortVersions: numeric order, prerelease below release', () => {
  const sorted = sortVersions(['1.10.0', '1.9.0', '2.0.0-rc.1', '1.0.0', '2.0.0']);
  assert.deepEqual(sorted, ['1.0.0', '1.9.0', '1.10.0', '2.0.0-rc.1', '2.0.0']);
});

test('packageSlug: filesystem-safe, matches the workflow convention', () => {
  assert.equal(packageSlug('@jadchene/mcp-ssh-service'), 'jadchene-mcp-ssh-service');
  assert.equal(packageSlug('my-mcp-server'), 'my-mcp-server');
  assert.equal(packageSlug('Weird__Pkg..Name'), 'weird-pkg-name');
  // same normalization the workflow applies in its publish step
  const fromWorkflow = 'jadchene-mcp-ssh-service';
  assert.equal(packageSlug('@jadchene/mcp-ssh-service'), fromWorkflow);
});

test('parseScanCommit: feed entries from scans-branch commits', () => {
  const commit = {
    html_url: 'https://github.com/Paraphern/rugsnare/commit/abc',
    commit: {
      message: 'scan(history): @jadchene/mcp-ssh-service [skip ci]',
      committer: { date: '2026-10-06T21:36:38Z' },
    },
  };
  const e = parseScanCommit(commit);
  assert.equal(e.package, '@jadchene/mcp-ssh-service');
  assert.equal(e.slug, 'jadchene-mcp-ssh-service');
  assert.equal(e.ts, '2026-10-06T21:36:38Z');
  assert.equal(e.commitUrl, 'https://github.com/Paraphern/rugsnare/commit/abc');
  // branch-creation and unrelated commits are skipped
  assert.equal(parseScanCommit({ commit: { message: 'Initial commit' } }), null);
  assert.equal(parseScanCommit(null), null);
});
