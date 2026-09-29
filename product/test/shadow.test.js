import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureServer, pinTool, savePins, loadPins, detectShadows } from '../src/pins.js';
import { toolHash } from '../src/hash.js';
import { buildSarif } from '../src/sarif.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TOOL = (name) => ({ name, description: `tool ${name}`, inputSchema: { type: 'object' } });

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-shadow-'));
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('shadow: same tool name across two servers is detected', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const pins = { version: 1, servers: {} };
    for (const name of ['server-a', 'server-b']) {
      const sp = ensureServer(pins, name, { command: 'node', args: [`${name}.js`] });
      pinTool(sp, TOOL('read_file'), toolHash(TOOL('read_file')));
      pinTool(sp, TOOL(`${name}_unique`), toolHash(TOOL(`${name}_unique`)));
    }
    savePins(pins, dir);
    const shadows = detectShadows(loadPins(dir));
    assert.equal(shadows.length, 1);
    assert.equal(shadows[0].tool, 'read_file');
    assert.deepEqual(shadows[0].servers.sort(), ['server-a', 'server-b']);
  } finally {
    cleanup();
  }
});

test('shadow: no collision -> no findings', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const pins = { version: 1, servers: {} };
    for (const name of ['a', 'b']) {
      const sp = ensureServer(pins, name, { command: 'node', args: [name] });
      pinTool(sp, TOOL(`tool_${name}`), toolHash(TOOL(`tool_${name}`)));
    }
    savePins(pins, dir);
    assert.equal(detectShadows(loadPins(dir)).length, 0);
  } finally {
    cleanup();
  }
});

test('sarif: DRIFT/NEW/REMOVED/SHADOW all mapped to correct rules and levels', () => {
  const report = [
    {
      server: 'flights',
      verdicts: [
        { tool: 'search_flights', status: 'DRIFT', oldHash: 'a'.repeat(64), hash: 'b'.repeat(64), oldDescription: 'was', newDescription: 'now' },
        { tool: 'new_tool', status: 'NEW', hash: 'c'.repeat(64) },
        { tool: 'gone_tool', status: 'REMOVED' },
        { tool: 'same_tool', status: 'UNCHANGED', hash: 'd'.repeat(64) },
      ],
    },
  ];
  const sarif = buildSarif(report, [{ tool: 'read_file', servers: ['a', 'b'] }]);
  assert.equal(sarif.version, '2.1.0');
  assert.ok(sarif.$schema.includes('sarif-schema-2.1.0'));
  const byRule = {};
  for (const r of sarif.runs[0].results) byRule[r.ruleId] = r;
  assert.equal(byRule.RS001.level, 'error');
  assert.match(byRule.RS001.message.text, /changed its contract/);
  assert.equal(byRule.RS002.level, 'warning');
  assert.equal(byRule.RS003.level, 'warning');
  assert.equal(byRule.RS004.level, 'error');
  assert.match(byRule.RS004.message.text, /multiple servers/);
  assert.equal(sarif.runs[0].results.length, 4, 'UNCHANGED must not appear');
  assert.ok(byRule.RS001.locations[0].logicalLocations[0].fullyQualifiedName === 'mcp:flights/search_flights');
});

test('sarif: clean report -> zero results, valid document', () => {
  const sarif = buildSarif([{ server: 'ok', verdicts: [{ tool: 't', status: 'UNCHANGED', hash: 'x' }] }], []);
  assert.equal(sarif.runs[0].results.length, 0);
});
