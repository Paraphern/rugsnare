import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSarif } from '../src/sarif.js';

// SARIF is the CI surface: whatever diff detects must reach code scanning.
// Regression: prompt/resource verdicts carry {item, kind} instead of {tool}
// and used to be silently dropped from SARIF.

test('buildSarif: tool DRIFT/NEW/REMOVED map to RS001/RS002/RS003', () => {
  const sarif = buildSarif([
    {
      server: 'svc',
      verdicts: [
        { tool: 'search', status: 'DRIFT', driftType: 'BREAKING' },
        { tool: '_hidden', status: 'NEW' },
        { tool: 'legacy', status: 'REMOVED' },
        { tool: 'stable', status: 'UNCHANGED' },
      ],
    },
  ]);
  const results = sarif.runs[0].results;
  assert.deepEqual(results.map((r) => r.ruleId).sort(), ['RS001', 'RS002', 'RS003']);
  assert.ok(results.every((r) => r.locations[0].logicalLocations[0].fullyQualifiedName.startsWith('mcp:svc/')));
  assert.ok(!JSON.stringify(results).includes('stable'), 'UNCHANGED must not appear');
});

test('buildSarif: prompt and resource drift reach code scanning (regression)', () => {
  const sarif = buildSarif([
    {
      server: 'svc',
      verdicts: [
        { item: 'summary', kind: 'prompt', status: 'DRIFT' },
        { item: 'config.json', kind: 'resource', status: 'NEW' },
        { item: 'legacy-doc', kind: 'prompt', status: 'REMOVED' },
      ],
    },
  ]);
  const results = sarif.runs[0].results;
  assert.equal(results.length, 3, 'every prompt/resource verdict must map to a SARIF result');
  const fqns = results.map((r) => r.locations[0].logicalLocations[0].fullyQualifiedName);
  assert.ok(fqns.includes('mcp:svc/prompt:summary'));
  assert.ok(fqns.includes('mcp:svc/resource:config.json'));
  assert.match(results.find((r) => r.ruleId === 'RS001').message.text, /prompt "prompt:summary"/);
});

test('buildSarif: shadows map to RS004; empty report is valid empty SARIF', () => {
  const withShadow = buildSarif([], [{ tool: 'search', servers: ['a', 'b'] }]);
  assert.equal(withShadow.runs[0].results.length, 1);
  assert.equal(withShadow.runs[0].results[0].ruleId, 'RS004');

  const empty = buildSarif([], []);
  assert.deepEqual(empty.runs[0].results, []);
  assert.equal(empty.version, '2.1.0');
  assert.ok(empty.runs[0].tool.driver.version.match(/^\d+\.\d+\.\d+/), 'driver version follows package.json');
});
