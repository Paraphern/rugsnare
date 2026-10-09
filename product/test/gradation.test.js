import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTools, schemaDiff, schemaNotationDiff, gradeSchemaDrift } from '../src/pins.js';
import { toolHash, schemaHash, proseHash } from '../src/hash.js';

const pinOf = (tool) => ({
  hash: toolHash(tool),
  schemaHash: schemaHash(tool),
  proseHash: proseHash(tool),
  description: tool.description ?? '',
  inputSchema: tool.inputSchema,
});

test('schemaDiff returns direction-tagged changes', () => {
  const a = { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] };
  const b = { type: 'object', properties: { q: { type: 'string' }, mode: { type: 'string' } }, required: ['q', 'mode'] };
  const changes = schemaDiff(a, b);
  assert.ok(changes.every((c) => c.text && (c.direction === 'tighten' || c.direction === 'loosen')));
  const added = changes.find((c) => c.text.includes("added required parameter 'mode'"));
  assert.equal(added.direction, 'tighten');
});

test('gradeSchemaDrift: pure tighten = BREAKING, pure loosen = LOOSENED, mixed = BREAKING', () => {
  assert.equal(gradeSchemaDrift([{ text: 'x', direction: 'tighten' }], []), 'BREAKING');
  assert.equal(gradeSchemaDrift([{ text: 'x', direction: 'loosen' }], []), 'LOOSENED');
  assert.equal(gradeSchemaDrift([{ text: 'a', direction: 'loosen' }, { text: 'b', direction: 'tighten' }], []), 'BREAKING');
  assert.equal(gradeSchemaDrift([], ['dialect note']), 'NOTATION');
  assert.equal(gradeSchemaDrift([], []), 'NOTATION');
});

test('P4: dropped additionalProperties:false = LOOSENED (fill_form.elements case)', async () => {
  const oldTool = {
    name: 'fill_form',
    description: 'Fill a form.',
    inputSchema: {
      type: 'object',
      properties: { elements: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, value: { type: 'string' } } } } },
      additionalProperties: false,
    },
  };
  const newTool = {
    name: 'fill_form',
    description: 'Fill a form.',
    inputSchema: {
      type: 'object',
      properties: { elements: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, value: { type: 'string' } } } } },
      // additionalProperties: false dropped — validation loosened
    },
  };
  const serverPin = { tools: { fill_form: pinOf(oldTool) } };
  const [v] = compareTools(serverPin, [newTool], toolHash);
  assert.equal(v.driftType, 'LOOSENED', 'dropped additionalProperties:false must be LOOSENED, not NOTATION');
  assert.ok(v.schemaChanges.some((c) => c.direction === 'loosen' && c.text.includes('additionalProperties')));
});

test('P4: added additionalProperties:false = BREAKING (tighten)', async () => {
  const oldTool = {
    name: 'run',
    description: 'Run.',
    inputSchema: { type: 'object', properties: { cmd: { type: 'string' } } },
  };
  const newTool = {
    name: 'run',
    description: 'Run.',
    inputSchema: { type: 'object', properties: { cmd: { type: 'string' } }, additionalProperties: false },
  };
  const serverPin = { tools: { run: pinOf(oldTool) } };
  const [v] = compareTools(serverPin, [newTool], toolHash);
  assert.equal(v.driftType, 'BREAKING', 'added constraint is tighten = BREAKING');
});

test('P4: removed parameter = LOOSENED', async () => {
  const oldTool = {
    name: 'search',
    description: 'Search.',
    inputSchema: { type: 'object', properties: { q: { type: 'string' }, verbose: { type: 'boolean' } } },
  };
  const newTool = {
    name: 'search',
    description: 'Search.',
    inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
  };
  const serverPin = { tools: { search: pinOf(oldTool) } };
  const [v] = compareTools(serverPin, [newTool], toolHash);
  assert.equal(v.driftType, 'LOOSENED');
  assert.ok(v.schemaChanges.some((c) => c.direction === 'loosen' && c.text.includes("removed parameter 'verbose'")));
});

test('P4: expanded enum = LOOSENED, narrowed enum = BREAKING', async () => {
  const oldEnum = { type: 'object', properties: { sort: { type: 'string', enum: ['asc', 'desc'] } } };
  const wideEnum = { type: 'object', properties: { sort: { type: 'string', enum: ['asc', 'desc', 'random'] } } };
  const narrowEnum = { type: 'object', properties: { sort: { type: 'string', enum: ['asc'] } } };
  const old = { name: 'list', description: 'List.', inputSchema: oldEnum };
  const wide = { name: 'list', description: 'List.', inputSchema: wideEnum };
  const narrow = { name: 'list', description: 'List.', inputSchema: narrowEnum };

  const [vWide] = compareTools({ tools: { list: pinOf(old) } }, [wide], toolHash);
  assert.equal(vWide.driftType, 'LOOSENED');

  const [vNarrow] = compareTools({ tools: { list: pinOf(old) } }, [narrow], toolHash);
  assert.equal(vNarrow.driftType, 'BREAKING');
});

test('P4: dialect switch with identical parameters = NOTATION (unchanged from P3)', async () => {
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
  assert.equal(v.driftType, 'NOTATION');
  assert.ok(v.notationChanges.some((n) => n.includes('$schema dialect')));
});

test('P3: real parameter change stays BREAKING', async () => {
  const oldTool = { name: 'search', description: 'Search.', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } };
  const newTool = { name: 'search', description: 'Search.', inputSchema: { type: 'object', properties: { q: { type: 'string' }, mode: { type: 'string' } }, required: ['mode'] } };
  const serverPin = { tools: { search: pinOf(oldTool) } };
  const [v] = compareTools(serverPin, [newTool], toolHash);
  assert.equal(v.driftType, 'BREAKING');
});

test('schemaDiff: unchanged parameters produce no findings', () => {
  const s = { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] };
  assert.equal(schemaDiff(s, s).length, 0);
});
