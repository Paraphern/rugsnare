import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parsePackageName, diffVersionContracts, resolvedSchemaDeps, depChangesBetween, binPathOf } from '../src/history.js';
import { compareVersions } from '../src/version.js';

test('parsePackageName: bare, scoped, and URL forms', () => {
  assert.equal(parsePackageName('rugsnare'), 'rugsnare');
  assert.equal(parsePackageName('@jadchene/mcp-ssh-service'), '@jadchene/mcp-ssh-service');
  assert.equal(parsePackageName('https://www.npmjs.com/package/@jadchene/mcp-ssh-service'), '@jadchene/mcp-ssh-service');
  assert.equal(parsePackageName('https://registry.npmjs.org/rugsnare'), 'rugsnare');
  assert.throws(() => parsePackageName('../etc/passwd'), /not a valid npm package name/);
  assert.throws(() => parsePackageName('https://evil.example.com/pkg'), /not a valid npm package name/);
});

test('parsePackageName: accepts raw config lines people paste ("npx -y pkg")', () => {
  assert.equal(parsePackageName('npx -y kubectl-mcp-server'), 'kubectl-mcp-server');
  assert.equal(parsePackageName('npx kubectl-mcp-server'), 'kubectl-mcp-server');
  assert.equal(parsePackageName('npx --yes @scope/server'), '@scope/server');
  assert.equal(parsePackageName('npx -y --quiet @scope/pkg'), '@scope/pkg'); // boolean flags only
  // a bare single word is still a bare single word
  assert.equal(parsePackageName('rugsnare'), 'rugsnare');
});

test('diffVersionContracts: unchanged, drift, new, removed', () => {
  const older = {
    tools: {
      search: { hash: 'a', schemaHash: 's1', proseHash: 'p1', description: 'Search. Requires confirmation.' },
      legacy: { hash: 'b', schemaHash: 's2', proseHash: 'p2', description: 'old tool' },
    },
  };
  const newer = {
    tools: {
      search: { hash: 'a2', schemaHash: 's1', proseHash: 'p1b', description: 'Search.' },
      fresh: { hash: 'c', schemaHash: 's3', proseHash: 'p3', description: 'new tool' },
    },
  };
  const findings = diffVersionContracts(older, newer);
  const byName = Object.fromEntries(findings.map((f) => [f.tool, f]));

  assert.equal(byName.search.status, 'DRIFT');
  assert.equal(byName.search.driftType, 'COSMETIC'); // schema hash identical
  assert.equal(byName.search.oldDescription, 'Search. Requires confirmation.');
  assert.equal(byName.search.newDescription, 'Search.');

  assert.equal(byName.fresh.status, 'NEW');
  assert.equal(byName.legacy.status, 'REMOVED');

  // identical contracts -> zero findings
  assert.equal(diffVersionContracts(older, older).length, 0);
});

test('diffVersionContracts: schema change is BREAKING (with real schemas); hash-only change without schemas is NOTATION (P3)', () => {
  // real parameter change → BREAKING
  const older = { tools: { t: { hash: 'a', schemaHash: 's1', proseHash: 'p1', description: 'x', inputSchema: { type: 'object', properties: { q: {} } } } } };
  const newer = { tools: { t: { hash: 'b', schemaHash: 's2', proseHash: 'p1', description: 'x', inputSchema: { type: 'object', properties: { q: {}, mode: {} }, required: ['mode'] } } } };
  const [f] = diffVersionContracts(older, newer);
  assert.equal(f.driftType, 'BREAKING');
  assert.equal(f.schemaChanges.length, 1);

  // no schemas stored (legacy pins): schema hash changed but nothing to
  // compare structurally → conservatively NOTATION (bytes changed, params
  // unverifiable) - softer than BREAKING but still flagged
  const older2 = { tools: { t: { hash: 'a', schemaHash: 's1', proseHash: 'p1', description: 'x' } } };
  const newer2 = { tools: { t: { hash: 'b', schemaHash: 's2', proseHash: 'p1', description: 'x' } } };
  const [f2] = diffVersionContracts(older2, newer2);
  assert.equal(f2.driftType, 'NOTATION');
  assert.ok(!f2.notationChanges || f2.notationChanges.length === 0);
});

test('diffVersionContracts: annotation-only flip is DRIFT/ANNOTATION (review 34)', () => {
  const older = { tools: { t: { hash: 'a', schemaHash: 's1', proseHash: 'p1', description: 'x', annotations: { destructiveHint: false } } } };
  const newer = { tools: { t: { hash: 'a', schemaHash: 's1', proseHash: 'p1', description: 'x' } } };
  const findings = diffVersionContracts(older, newer);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].status, 'DRIFT');
  assert.equal(findings[0].driftType, 'ANNOTATION');
  // identical annotations stay silent
  const same = { tools: { t: { hash: 'a', schemaHash: 's1', proseHash: 'p1', description: 'x', annotations: { destructiveHint: false } } } };
  assert.equal(diffVersionContracts(older, same).length, 0);
});

test('fetchValidated: a redirect off the registry is refused (review 34)', async () => {
  const { fetchValidated } = await import('../src/history.js');
  await assert.rejects(
    () => fetchValidated('https://evil.example.com/x.tgz', 'registry.npmjs.org', 2000),
    /refusing non-registry/,
  );
});

// R10: publish-time sort (playwright two-epoch bug)
test('R10: versions sort by publish time, not semver (two-epoch case)', () => {
  const time = {
    '0.0.1': '2026-03-01T00:00:00Z',
    '0.0.2': '2026-06-01T00:00:00Z',
    '1.52.0-alpha': '2025-03-21T00:00:00Z',
  };
  const inWindow = ['0.0.2', '1.52.0-alpha', '0.0.1'];
  const byTime = [...inWindow].sort((a, b) => {
    const ta = time[a] ? new Date(time[a]).getTime() : Infinity;
    const tb = time[b] ? new Date(time[b]).getTime() : Infinity;
    if (ta !== tb) return ta - tb;
    return 0;
  });
  assert.deepEqual(byTime, ['1.52.0-alpha', '0.0.1', '0.0.2']);
});

// R11: rename inference
test('R11: GONE+NEW with identical hashes collapse to RENAMED', () => {
  const older = {
    tools: {
      pipelines_get_builds: { hash: 'h1', schemaHash: 's1', proseHash: 'p1', description: 'Get builds.' },
      really_gone: { hash: 'h2', schemaHash: 's2', proseHash: 'p2', description: 'Old.' },
    },
  };
  const newer = {
    tools: {
      pipelines_build: { hash: 'h1', schemaHash: 's1', proseHash: 'p1', description: 'Get builds.' },
      brand_new: { hash: 'h3', schemaHash: 's3', proseHash: 'p3', description: 'New.' },
    },
  };
  const findings = diffVersionContracts(older, newer);
  const renamed = findings.find((f) => f.status === 'RENAMED');
  assert.ok(renamed, 'rename detected');
  assert.equal(renamed.tool, 'pipelines_get_builds');
  assert.equal(renamed.renamedTo, 'pipelines_build');
  assert.ok(findings.some((f) => f.tool === 'really_gone' && f.status === 'REMOVED'));
  assert.ok(findings.some((f) => f.tool === 'brand_new' && f.status === 'NEW'));
  assert.ok(!findings.some((f) => f.tool === 'pipelines_build' && f.status === 'NEW'));
});

// R12: kill-switch classification
test('R12: classifyUnreachable detects kill-switch patterns', async () => {
  const { classifyUnreachable } = await import('../src/history.js');
  assert.equal(classifyUnreachable('Error: Update required to continue').cause, 'KILLSWITCH');
  assert.equal(classifyUnreachable('server version too old, please upgrade').cause, 'KILLSWITCH');
  assert.equal(classifyUnreachable('fetch failed: https://api.example.com/manifest').cause, 'GATED');
  assert.equal(classifyUnreachable('npm ERR! EUNSUPPORTEDPROTOCOL git+ssh://...').cause, 'GIT_DEPS');
  assert.equal(classifyUnreachable('MCP server exited early (code 1)').cause, 'CRASH');
  assert.equal(classifyUnreachable('request timed out after 15000ms').cause, 'TIMEOUT');
  assert.equal(classifyUnreachable('some random error').cause, 'UNKNOWN');
});

// R32: contract provenance. A floating schema dep (mongodb 2.1.2, zod ^4.4.3)
// rewrites a server's contract with no server release; captures must record
// resolved dep versions and pair diffs must flag where they differed.
test('R32: resolvedSchemaDeps reads installed versions of watched schema deps', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-r32-'));
  try {
    fs.mkdirSync(path.join(dir, 'node_modules', 'zod'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules', 'zod', 'package.json'), JSON.stringify({ name: 'zod', version: '4.4.3' }));
    fs.mkdirSync(path.join(dir, 'node_modules', '@modelcontextprotocol', 'sdk'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json'), JSON.stringify({ name: '@modelcontextprotocol/sdk', version: '1.29.0' }));
    const deps = resolvedSchemaDeps(dir);
    assert.equal(deps.zod, '4.4.3');
    assert.equal(deps['@modelcontextprotocol/sdk'], '1.29.0');
    assert.equal(deps.ajv, undefined, 'unwatched/absent deps are simply absent');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('R32: depChangesBetween flags drift, appearance and disappearance', () => {
  assert.deepEqual(depChangesBetween({ zod: '4.4.3' }, { zod: '4.4.3' }), [], 'same resolution is no drift');
  assert.deepEqual(depChangesBetween({ zod: '4.4.3' }, { zod: '4.5.0' }), [{ dep: 'zod', from: '4.4.3', to: '4.5.0' }]);
  assert.deepEqual(depChangesBetween({}, { zod: '4.5.0' }), [{ dep: 'zod', from: null, to: '4.5.0' }], 'dep appeared');
  assert.deepEqual(depChangesBetween({ ajv: '8.0.0' }, {}), [{ dep: 'ajv', from: '8.0.0', to: null }], 'dep disappeared');
});

// R34: packaging drift. supabase moved its stdio entry
// (dist/transports/stdio.js -> dist/cli.js in 0.9+) with tool contracts
// untouched - the declared bin must travel with every capture so a move
// between adjacent versions can surface as entryChanged.
test('R34: binPathOf reads the declared launch path in all bin shapes', () => {
  const mk = (bin) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-r34-'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', ...(bin !== undefined ? { bin } : {}) }));
    return dir;
  };
  try {
    let d = mk('dist/cli.js');
    assert.equal(binPathOf(d), 'dist/cli.js', 'string bin');
    fs.rmSync(d, { recursive: true, force: true });
    d = mk({ 'mcp-server': 'dist/transports/stdio.js', other: 'x.js' });
    assert.equal(binPathOf(d), 'dist/transports/stdio.js', 'object bin: first value');
    fs.rmSync(d, { recursive: true, force: true });
    d = mk(undefined);
    assert.equal(binPathOf(d), null, 'no bin declared');
    fs.rmSync(d, { recursive: true, force: true });
  } catch (e) { throw e; }
});
