import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTools, schemaDiff, schemaNotationDiff } from '../src/pins.js';
import { toolHash, schemaHash, proseHash } from '../src/hash.js';

const pinOf = (tool) => ({
  hash: toolHash(tool),
  schemaHash: schemaHash(tool),
  proseHash: proseHash(tool),
  description: tool.description ?? '',
  inputSchema: tool.inputSchema,
});

test('schemaNotationDiff: $schema dialect switch is detected', () => {
  const a = { $schema: 'http://json-schema.org/draft-07/schema#', type: 'object', properties: { x: { type: 'string' } } };
  const b = { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', properties: { x: { type: 'string' } } };
  const notes = schemaNotationDiff(a, b);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /\$schema dialect .*draft-07.* → .*2020-12/);
});

test('schemaNotationDiff: additionalProperties form change is detected', () => {
  const a = { type: 'object', properties: { x: { type: 'string' } }, additionalProperties: false };
  const b = { type: 'object', properties: { x: { type: 'string' } } };
  const notes = schemaNotationDiff(a, b);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /additionalProperties false → undeclared/);
});

test('schemaNotationDiff: weakening (dropped additionalProperties:false) is flagged', () => {
  // chrome-devtools-mcp fill_form.elements case: validation loosened
  const a = { type: 'object', properties: { x: { type: 'string' } }, additionalProperties: false };
  const b = { type: 'object', properties: { x: { type: 'string' } } };
  const notes = schemaNotationDiff(a, b);
  assert.ok(notes[0].startsWith('[weakens validation]'), 'loosening gets the prefix');
  // tightening does not
  const tightened = schemaNotationDiff(b, a);
  assert.ok(!tightened[0].startsWith('[weakens validation]'), 'tightening stays plain');
});

test('P3 gradation: dialect-only schema change classifies NOTATION, not BREAKING', async () => {
  const oldTool = {
    name: 'search',
    description: 'Search things.',
    inputSchema: { $schema: 'http://json-schema.org/draft-07/schema#', type: 'object', properties: { q: { type: 'string' } }, required: ['q'] },
  };
  const newTool = {
    name: 'search',
    description: 'Search things.',
    inputSchema: { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', properties: { q: { type: 'string' } }, required: ['q'] },
  };
  const serverPin = { tools: { search: pinOf(oldTool) } };
  const [v] = compareTools(serverPin, [newTool], toolHash);
  assert.equal(v.status, 'DRIFT');
  assert.equal(v.driftType, 'NOTATION', 'dialect switch with identical parameters must NOT read BREAKING');
  assert.equal(v.schemaChanges.length, 0, 'no parameter changes');
  assert.ok(v.notationChanges.length >= 1, 'notation note present');
  assert.match(v.notationChanges[0], /\$schema dialect/);
});

test('P3 gradation: real parameter change stays BREAKING', async () => {
  const oldTool = {
    name: 'search',
    description: 'Search things.',
    inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
  };
  const newTool = {
    name: 'search',
    description: 'Search things.',
    inputSchema: { type: 'object', properties: { q: { type: 'string' }, mode: { type: 'string' } }, required: ['mode'] },
  };
  const serverPin = { tools: { search: pinOf(oldTool) } };
  const [v] = compareTools(serverPin, [newTool], toolHash);
  assert.equal(v.driftType, 'BREAKING');
  assert.equal(v.schemaChanges.length, 1);
  assert.match(v.schemaChanges[0], /added required parameter 'mode'/);
});

test('P3 gradation: mixed case (parameter + dialect) is BREAKING with param details', async () => {
  const oldTool = {
    name: 'run',
    description: 'Run.',
    inputSchema: { $schema: 'http://json-schema.org/draft-07/schema#', type: 'object', properties: { cmd: { type: 'string' } } },
  };
  const newTool = {
    name: 'run',
    description: 'Run.',
    inputSchema: { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', properties: { cmd: { type: 'string' }, v: { type: 'number' } } },
  };
  const serverPin = { tools: { run: pinOf(oldTool) } };
  const [v] = compareTools(serverPin, [newTool], toolHash);
  assert.equal(v.driftType, 'BREAKING', 'a parameter change dominates the dialect switch');
  assert.equal(v.notationChanges, undefined);
});

test('schemaDiff: unchanged parameters produce no findings', () => {
  const s = { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] };
  assert.equal(schemaDiff(s, s).length, 0);
});
