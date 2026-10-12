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
  assert.equal(gradeSchemaDrift([{ text: 'x', direction: 'expand' }], []), 'BREAKING'); // expand rides at BREAKING severity
  assert.equal(gradeSchemaDrift([{ text: 'a', direction: 'loosen' }, { text: 'b', direction: 'tighten' }], []), 'BREAKING');
  assert.equal(gradeSchemaDrift([{ text: 'a', direction: 'loosen' }, { text: 'b', direction: 'expand' }], []), 'BREAKING');
  assert.equal(gradeSchemaDrift([], ['dialect note']), 'NOTATION');
  assert.equal(gradeSchemaDrift([], []), 'NOTATION');
});

test('P5: added optional parameter = EXPANDED direction (not tighten)', () => {
  const a = { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] };
  const b = { type: 'object', properties: { q: { type: 'string' }, context: { type: 'string' } }, required: ['q'] };
  const changes = schemaDiff(a, b);
  const added = changes.find((c) => c.text.includes("added optional parameter 'context'"));
  assert.equal(added.direction, 'expand', 'optional param gets expand direction');
  // but the overall grade is still BREAKING (expand = same severity slot)
  assert.equal(gradeSchemaDrift(changes, []), 'BREAKING');
});

test('P5: removed guard parameter (dry_run) triggers guardWarning', () => {
  const a = { type: 'object', properties: { q: { type: 'string' }, dry_run: { type: 'boolean' } } };
  const b = { type: 'object', properties: { q: { type: 'string' } } };
  const changes = schemaDiff(a, b);
  const removed = changes.find((c) => c.text.includes("removed parameter 'dry_run'"));
  assert.equal(removed.direction, 'loosen');
  assert.ok(removed.guardWarning, 'guard parameter gets a warning');
  assert.match(removed.guardWarning, /guard-style parameter removed/);
  assert.match(removed.guardWarning, /dry_run/);
});

test('P5: removed non-guard parameter has no guardWarning', () => {
  const a = { type: 'object', properties: { q: { type: 'string' }, color: { type: 'string' } } };
  const b = { type: 'object', properties: { q: { type: 'string' } } };
  const changes = schemaDiff(a, b);
  const removed = changes.find((c) => c.text.includes("removed parameter 'color'"));
  assert.equal(removed.guardWarning, undefined);
});

// P6: conditional guard-warning by additionalProperties
test('P6: guard removal + AP:false = NO warning (server rejects loudly)', () => {
  const a = { type: 'object', properties: { q: {}, dry_run: { type: 'boolean' } }, additionalProperties: false };
  const b = { type: 'object', properties: { q: {} }, additionalProperties: false };
  const changes = schemaDiff(a, b);
  const removed = changes.find((c) => c.text.includes("removed parameter 'dry_run'"));
  assert.equal(removed.guardWarning, undefined, 'AP:false means loud failure, no silent-ignore warning');
});

test('P6: guard removal + AP absent = warning (JSON Schema default accepts unknown keys)', () => {
  const a = { type: 'object', properties: { q: {}, dry_run: { type: 'boolean' } } };
  const b = { type: 'object', properties: { q: {} } };
  const changes = schemaDiff(a, b);
  const removed = changes.find((c) => c.text.includes("removed parameter 'dry_run'"));
  assert.ok(removed.guardWarning, 'absent AP = accepts unknown keys = warning');
});

test('P6: guard removal + AP:true = warning (explicitly accepts unknown keys)', () => {
  const a = { type: 'object', properties: { q: {}, dry_run: { type: 'boolean' } }, additionalProperties: true };
  const b = { type: 'object', properties: { q: {} }, additionalProperties: true };
  const changes = schemaDiff(a, b);
  const removed = changes.find((c) => c.text.includes("removed parameter 'dry_run'"));
  assert.ok(removed.guardWarning);
});

// P6: default-flip on guard parameter
test('P6: guard default-flip true→false = LOOSENED with guardWarning', () => {
  const a = { type: 'object', properties: { dry_run: { type: 'boolean', default: true } } };
  const b = { type: 'object', properties: { dry_run: { type: 'boolean', default: false } } };
  const changes = schemaDiff(a, b);
  const flip = changes.find((c) => c.text.includes("default of 'dry_run'"));
  assert.ok(flip, 'default change detected');
  assert.equal(flip.direction, 'loosen');
  assert.ok(flip.guardWarning, 'weakening default-flip gets guardWarning');
  assert.match(flip.guardWarning, /default changed true -> false/);
  assert.equal(gradeSchemaDrift(changes, []), 'LOOSENED');
});

test('P6: guard default-flip false→true = tracked but NO guardWarning (strengthening)', () => {
  const a = { type: 'object', properties: { dry_run: { type: 'boolean', default: false } } };
  const b = { type: 'object', properties: { dry_run: { type: 'boolean', default: true } } };
  const changes = schemaDiff(a, b);
  const flip = changes.find((c) => c.text.includes("default of 'dry_run'"));
  assert.ok(flip, 'default change tracked');
  assert.equal(flip.guardWarning, undefined, 'strengthening does not get guardWarning');
});

test('P6: non-guard default-flip = tracked but NO guardWarning', () => {
  const a = { type: 'object', properties: { color: { type: 'string', default: 'red' } } };
  const b = { type: 'object', properties: { color: { type: 'string', default: 'blue' } } };
  const changes = schemaDiff(a, b);
  const flip = changes.find((c) => c.text.includes("default of 'color'"));
  assert.ok(flip, 'default change tracked for non-guard too');
  assert.equal(flip.guardWarning, undefined);
});

// P6: guard-param became optional = guardWarning
test('P6: guard became optional = loosen with guardWarning', () => {
  const a = { type: 'object', properties: { confirm: { type: 'boolean' }, q: {} }, required: ['confirm', 'q'] };
  const b = { type: 'object', properties: { confirm: { type: 'boolean' }, q: {} }, required: ['q'] };
  const changes = schemaDiff(a, b);
  const opt = changes.find((c) => c.text.includes("'confirm' became optional"));
  assert.equal(opt.direction, 'loosen');
  assert.ok(opt.guardWarning, 'guard became optional gets warning');
  assert.match(opt.guardWarning, /defanged/);
});

test('P6: non-guard became optional = no guardWarning', () => {
  const a = { type: 'object', properties: { color: { type: 'string' }, q: {} }, required: ['color', 'q'] };
  const b = { type: 'object', properties: { color: { type: 'string' }, q: {} }, required: ['q'] };
  const changes = schemaDiff(a, b);
  const opt = changes.find((c) => c.text.includes("'color' became optional"));
  assert.equal(opt.guardWarning, undefined);
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
      // additionalProperties: false dropped - validation loosened
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

// R3: constraint keys
test('R3: added minItems = tighten (BREAKING)', () => {
  const a = { type: 'object', properties: { pipeline: { type: 'array', items: {} } } };
  const b = { type: 'object', properties: { pipeline: { type: 'array', items: {}, minItems: 1 } } };
  const changes = schemaDiff(a, b);
  const m = changes.find((c) => c.text.includes('minItems'));
  assert.ok(m, 'minItems change detected');
  assert.equal(m.direction, 'tighten');
  assert.equal(gradeSchemaDrift(changes, []), 'BREAKING');
});

test('R3: removed minimum = loosen (LOOSENED)', () => {
  const a = { type: 'object', properties: { limit: { type: 'number', minimum: 0, maximum: 100 } } };
  const b = { type: 'object', properties: { limit: { type: 'number' } } };
  const changes = schemaDiff(a, b);
  assert.ok(changes.some((c) => c.text.includes('removed minimum') && c.direction === 'loosen'));
  assert.ok(changes.some((c) => c.text.includes('removed maximum') && c.direction === 'loosen'));
  assert.equal(gradeSchemaDrift(changes, []), 'LOOSENED');
});

test('R3: number to integer = tighten', () => {
  const a = { type: 'object', properties: { count: { type: 'number' } } };
  const b = { type: 'object', properties: { count: { type: 'integer' } } };
  const changes = schemaDiff(a, b);
  const narrowed = changes.find((c) => c.text.includes('narrowed from number to integer'));
  assert.ok(narrowed);
  assert.equal(narrowed.direction, 'tighten');
});

test('R3: added pattern = tighten', () => {
  const a = { type: 'object', properties: { name: { type: 'string' } } };
  const b = { type: 'object', properties: { name: { type: 'string', pattern: '^[a-z]+$' } } };
  const changes = schemaDiff(a, b);
  const pat = changes.find((c) => c.text.includes('pattern'));
  assert.ok(pat, 'pattern change detected');
  assert.equal(pat.direction, 'tighten');
});

test('schemaDiff: unchanged parameters produce no findings', () => {
  const s = { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] };
  assert.equal(schemaDiff(s, s).length, 0);
});

// R21: recursive schema traversal
test('R21: nested required change at depth 2 is detected (Netlify case)', () => {
  const a = {
    type: 'object',
    properties: {
      selectSchema: {
        type: 'object',
        properties: { operation: { type: 'string' }, params: { type: 'object' } },
        required: ['operation', 'params'],
      },
    },
  };
  const b = {
    type: 'object',
    properties: {
      selectSchema: {
        type: 'object',
        properties: { operation: { type: 'string' }, params: { type: 'object' } },
        required: ['operation'],
      },
    },
  };
  const changes = schemaDiff(a, b);
  const opt = changes.find((c) => c.text.includes('selectSchema.params') && c.text.includes('became optional'));
  assert.ok(opt, 'nested required change detected with path');
  assert.equal(opt.direction, 'loosen');
});

test('R21: constraint at depth 5 through items+anyOf is detected (MongoDB case)', () => {
  const a = {
    type: 'object',
    properties: {
      pipeline: {
        type: 'array',
        items: {
          anyOf: [
            {
              properties: {
                $vectorSearch: {
                  type: 'object',
                  properties: {
                    numCandidates: { type: 'number' },
                    limit: { type: 'number' },
                  },
                },
              },
            },
          ],
        },
      },
    },
  };
  const b = {
    type: 'object',
    properties: {
      pipeline: {
        type: 'array',
        items: {
          anyOf: [
            {
              properties: {
                $vectorSearch: {
                  type: 'object',
                  properties: {
                    numCandidates: { type: 'integer', maximum: 10000 },
                    limit: { type: 'integer' },
                  },
                },
              },
            },
          ],
        },
      },
    },
  };
  const changes = schemaDiff(a, b);
  // should find: numCandidates number->integer, limit number->integer, added maximum
  const narrowed = changes.filter((c) => c.text.includes('narrowed from number to integer'));
  assert.ok(narrowed.length >= 2, `expected 2+ integer narrowings, got ${narrowed.length}: ${changes.map(c=>c.text).join('; ')}`);
  assert.ok(changes.some((c) => c.text.includes('added maximum') && c.direction === 'tighten'));
  assert.ok(changes.every((c) => c.text.includes('pipeline')), 'all paths include pipeline prefix');
});

test('R21: union branch added/removed detected by const discriminator', () => {
  const a = {
    type: 'object',
    properties: {
      tool_input: {
        anyOf: [
          { properties: { operation: { type: 'string', const: 'get-teams' }, params: { type: 'object' } }, required: ['operation'] },
          { properties: { operation: { type: 'string', const: 'init-db' }, params: { type: 'object' } }, required: ['operation'] },
        ],
      },
    },
  };
  const b = {
    type: 'object',
    properties: {
      tool_input: {
        anyOf: [
          { properties: { operation: { type: 'string', const: 'get-teams' }, params: { type: 'object' } }, required: ['operation'] },
          { properties: { operation: { type: 'string', const: 'get-env-vars' }, params: { type: 'object' } }, required: ['operation'] },
        ],
      },
    },
  };
  const changes = schemaDiff(a, b);
  assert.ok(changes.some((c) => c.text.includes("removed anyOf branch 'init-db'") && c.direction === 'loosen'));
  assert.ok(changes.some((c) => c.text.includes("added anyOf branch 'get-env-vars'") && c.direction === 'expand'));
});

// R4: anyOf↔oneOf with same branches = NOTATION
test('R4: anyOf to oneOf with identical branches = union keyword swap, not removed+added', () => {
  const branch = (op) => ({ properties: { operation: { type: 'string', const: op }, params: { type: 'object' } }, required: ['operation'] });
  const a = { type: 'object', properties: { input: { anyOf: [branch('read'), branch('write')] } } };
  const b = { type: 'object', properties: { input: { oneOf: [branch('read'), branch('write')] } } };
  const changes = schemaDiff(a, b);
  const swap = changes.find((c) => c.text.includes('anyOf -> oneOf'));
  assert.ok(swap, 'keyword swap detected');
  assert.ok(swap.notationOnly, 'marked as notation-only');
  // must NOT report removed+added branches
  assert.ok(!changes.some((c) => c.text.includes('removed anyOf')), 'must not report removed anyOf');
  assert.ok(!changes.some((c) => c.text.includes('added oneOf')), 'must not report added oneOf');
});

test('R4: anyOf to oneOf with DIFFERENT branches = real add/remove, not notation', () => {
  const branch = (op) => ({ properties: { operation: { type: 'string', const: op } }, required: ['operation'] });
  const a = { type: 'object', properties: { input: { anyOf: [branch('read'), branch('delete')] } } };
  const b = { type: 'object', properties: { input: { oneOf: [branch('read'), branch('create')] } } };
  const changes = schemaDiff(a, b);
  assert.ok(!changes.some((c) => c.notationOnly), 'no notationOnly when branches differ');
  assert.ok(changes.some((c) => c.text.includes('removed') && c.text.includes('delete')), 'delete branch removed');
  assert.ok(changes.some((c) => c.text.includes('added') && c.text.includes('create')), 'create branch added');
});

// additionalProperties true <-> {} equivalence (found by the 1.3.0 release
// re-run on chrome-devtools-mcp 1.9.0 -> 1.10.1: the MCP SDK v2 wave switches
// every tool's root additionalProperties from true to the empty schema, which
// JSON Schema treats as IDENTICAL - 27 false BREAKINGs until this fix)
test('AP true -> {} is notation, not tighten (chrome-devtools SDK v2 wave)', async () => {
  const { detectAdditionalPropertiesDirection } = await import('../src/pins.js');
  const mk = (ap) => ({ type: 'object', properties: { q: { type: 'string' } }, ...(ap !== undefined ? { additionalProperties: ap } : {}) });
  // representation switch between equivalent allow-any forms: null
  assert.equal(detectAdditionalPropertiesDirection(mk(true), mk({})), null, 'true -> {} must not grade');
  assert.equal(detectAdditionalPropertiesDirection(mk({}), mk(true)), null, '{} -> true must not grade');
  assert.equal(detectAdditionalPropertiesDirection(mk(true), mk(true)), null, 'identical values: null');
  assert.equal(detectAdditionalPropertiesDirection(mk(true), mk(undefined)), null, 'true -> absent must not grade (absent = allowed by default)');
  assert.equal(detectAdditionalPropertiesDirection(mk(undefined), mk({})), null, 'absent -> {} must not grade');
  // real transitions keep their directions
  const dropped = detectAdditionalPropertiesDirection(mk(false), mk(undefined));
  assert.equal(dropped.direction, 'loosen', 'dropped false = loosen');
  const added = detectAdditionalPropertiesDirection(mk(undefined), mk(false));
  assert.equal(added.direction, 'tighten', 'added false = tighten');
  const toSubschema = detectAdditionalPropertiesDirection(mk(true), mk({ type: 'string' }));
  assert.equal(toSubschema.direction, 'tighten', 'any -> constraining subschema = tighten');
  const fromSubschema = detectAdditionalPropertiesDirection(mk({ type: 'string' }), mk(true));
  assert.equal(fromSubschema.direction, 'loosen', 'constraining subschema -> any = loosen');
});

// R4 grading bug (found by the 1.3.0 release re-run on mongodb 3.0.0):
// an anyOf->oneOf keyword swap with identical const branches carried
// direction:'loosen' + notationOnly:true, but nothing read notationOnly -
// gradeSchemaDrift counted it as a real loosen and explain/export graded
// LOOSENED ("constraints removed") on a pure representation switch.
test('R4 keyword swap with identical branches grades NOTATION, not LOOSENED', async () => {
  const { gradeSchemaDrift } = await import('../src/pins.js');
  const a = { type: 'object', properties: { method: { anyOf: [
    { type: 'object', properties: { op: { type: 'string', const: 'count' } }, required: ['op'] },
    { type: 'object', properties: { op: { type: 'string', const: 'explain' } }, required: ['op'] },
  ] } } };
  const b = { type: 'object', properties: { method: { oneOf: a.properties.method.anyOf } } };
  const changes = schemaDiff(a, b);
  const swap = changes.find((c) => c.text.includes('union keyword'));
  assert.ok(swap, 'swap detected');
  assert.equal(swap.notationOnly, true, 'swap is notationOnly');
  assert.equal(gradeSchemaDrift(changes, []), 'NOTATION', 'identical-branch keyword swap must grade NOTATION');
});
