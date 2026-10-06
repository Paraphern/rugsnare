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

test('diffVersionContracts: schema change is BREAKING', () => {
  const older = { tools: { t: { hash: 'a', schemaHash: 's1', proseHash: 'p1', description: 'x' } } };
  const newer = { tools: { t: { hash: 'b', schemaHash: 's2', proseHash: 'p1', description: 'x' } } };
  const [f] = diffVersionContracts(older, newer);
  assert.equal(f.driftType, 'BREAKING');
});

test('history scan orders versions with the shared semver comparator', () => {
  const versions = ['1.10.0', '1.9.0', '1.2.0', '1.0.0', '2.0.0-rc.1', '2.0.0'];
  versions.sort(compareVersions);
  assert.deepEqual(versions, ['1.0.0', '1.2.0', '1.9.0', '1.10.0', '2.0.0-rc.1', '2.0.0']);
});
