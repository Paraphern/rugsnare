import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePackageName, diffVersionContracts } from '../src/history.js';
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
  // unverifiable) — softer than BREAKING but still flagged
  const older2 = { tools: { t: { hash: 'a', schemaHash: 's1', proseHash: 'p1', description: 'x' } } };
  const newer2 = { tools: { t: { hash: 'b', schemaHash: 's2', proseHash: 'p1', description: 'x' } } };
  const [f2] = diffVersionContracts(older2, newer2);
  assert.equal(f2.driftType, 'NOTATION');
  assert.deepEqual(f2.notationChanges, []);
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

test('history scan orders versions with the shared semver comparator', () => {
  const versions = ['1.10.0', '1.9.0', '1.2.0', '1.0.0', '2.0.0-rc.1', '2.0.0'];
  versions.sort(compareVersions);
  assert.deepEqual(versions, ['1.0.0', '1.2.0', '1.9.0', '1.10.0', '2.0.0-rc.1', '2.0.0']);
});
