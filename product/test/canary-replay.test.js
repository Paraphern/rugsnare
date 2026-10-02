import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchTools } from '../src/rpc.js';
import { ensureServer, pinTool, savePins, loadPins } from '../src/pins.js';
import { toolHash } from '../src/hash.js';
import { shape, shapesEqual, replayCorpus, classifyReplay, classifyCallForReplay } from '../src/canary-replay.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const V1 = path.join(__dirname, 'fixtures', 'canary-v1.cjs');
const V2 = path.join(__dirname, 'fixtures', 'canary-v2.cjs');

// A corpus exactly as the proxy would record it against v1.
const CORPUS = [
  { kind: 'call-trace', server: 't', tool: 'search_events', args: { q: 'ev' }, ok: true, result: { content: [{ type: 'text', text: 'alpha beta' }], count: 2 }, truncated: false },
  { kind: 'call-trace', server: 't', tool: 'get_event', args: { id: '1' }, ok: true, result: { content: [{ type: 'text', text: 'event 1' }] }, truncated: false },
];

// ---- unit: shape ------------------------------------------------------------

test('shape: values ignored, structure kept', () => {
  assert.deepEqual(shape({ a: 1, b: 'x' }), { a: 'number', b: 'string' });
  assert.deepEqual(shape([1, 2, 3]), ['number']);
  assert.deepEqual(shape([]), []);
  assert.equal(shape(null), 'null');
});

test('shapesEqual: same shape different values passes; changed shape fails', () => {
  assert.equal(shapesEqual({ content: [{ text: 'old' }], count: 2 }, { content: [{ text: 'new' }], count: 5 }), true);
  assert.equal(shapesEqual({ content: [{ text: 'x' }], count: 2 }, { content: [{ text: 'x' }] }), false, 'count key vanished');
  assert.equal(shapesEqual({ a: 1 }, { a: 'str' }), false, 'type changed');
});

// ---- unit: classification (synthetic, no spawn) ------------------------------

function classify({ toolsFindings = [], replayCalls = [] }) {
  // wraps classifyReplay by stubbing compareTools via a real serverPin + liveTools is overkill here;
  // call classifyReplay directly with pins mapping to toolsFindings is not possible — so we
  // exercise the call-side rules with an empty pin set and hand-built replayCalls.
  const serverPin = { tools: {} };
  return classifyReplay({ serverPin, liveTools: [], replayCalls });
}

test('classify: ok -> error is BREAKING; error -> ok is FIXED; both error is OK', () => {
  const r = classify({ replayCalls: [
    { entry: { tool: 'a', ok: true, result: { x: 1 }, truncated: false }, live: { error: { message: 'boom' } } },
    { entry: { tool: 'b', ok: false, error: {}, truncated: false }, live: { result: { y: 1 } } },
    { entry: { tool: 'c', ok: false, error: { message: 'e' }, truncated: false }, live: { error: { message: 'e2' } } },
  ] });
  const byTool = Object.fromEntries(r.findings.map((f) => [f.tool, f.severity]));
  assert.equal(byTool.a, 'BREAKING');
  assert.equal(byTool.b, 'FIXED');
  assert.equal(r.ok, 1, 'error→error counts as no regression');
});

test('classify: truncated corpus entries are SKIPPED, not false-positived', () => {
  const r = classify({ replayCalls: [
    { entry: { tool: 'a', ok: true, result: 'trunc...', truncated: true }, live: { result: { x: 1 } } },
  ] });
  assert.equal(r.findings[0].severity, 'SKIPPED');
  assert.equal(r.breaking, 0);
});

test('classify: response shape change is BREAKING, value-only change is OK', () => {
  const r = classify({ replayCalls: [
    { entry: { tool: 'a', ok: true, result: { content: [{ text: 'x' }], count: 2 }, truncated: false }, live: { result: { content: [{ text: 'y' }] } } },
    { entry: { tool: 'b', ok: true, result: { content: [{ text: 'x' }] }, truncated: false }, live: { result: { content: [{ text: 'zzz' }] } } },
  ] });
  assert.equal(r.breaking, 1, 'count key disappeared = shape change');
  assert.equal(r.ok, 1, 'value-only diff = no finding');
});

// ---- integration: replay against real fixture servers ------------------------

test('end-to-end: corpus recorded on v1 replays SAFE against v1, DO NOT UPGRADE against v2', async () => {
  // baseline: pin v1 exactly like `rugsnare scan` does
  const { tools: v1Tools } = await fetchTools({ command: 'node', args: [V1], cwd: process.cwd(), timeoutMs: 15000 });
  assert.equal(v1Tools.length, 2);

  const same = await replayCorpus({ command: 'node', args: [V1], cwd: process.cwd(), corpus: CORPUS, timeoutMs: 15000 });
  assert.ok(!same.error, same.error);
  const pinTools = { tools: {} };
  for (const t of v1Tools) pinTools.tools[t.name] = null; // placeholder, real pins below
  // build a real serverPin via the pin store helpers
  const pins = { version: 1, servers: {} };
  const sp = ensureServer(pins, 't', null);
  for (const t of v1Tools) pinTool(sp, t, toolHash(t), { approved: true });

  const okRun = classifyReplay({ serverPin: sp, liveTools: same.tools, replayCalls: same.calls });
  assert.equal(okRun.breaking, 0, `same version must be clean, got: ${JSON.stringify(okRun.findings)}`);
  assert.equal(okRun.verdict, 'SAFE');
  assert.equal(okRun.ok, 2);

  const rug = await replayCorpus({ command: 'node', args: [V2], cwd: process.cwd(), corpus: CORPUS, timeoutMs: 15000 });
  assert.ok(!rug.error, rug.error);
  const rugRun = classifyReplay({ serverPin: sp, liveTools: rug.tools, replayCalls: rug.calls });
  assert.equal(rugRun.verdict, 'DO NOT UPGRADE');
  assert.equal(rugRun.breaking, 2, `schema change + ok->error flip, got: ${JSON.stringify(rugRun.findings)}`);
  assert.equal(rugRun.cosmetic, 1, 'get_event description reworded');
  const reasons = rugRun.findings.map((f) => f.reason).join('; ');
  assert.match(reasons, /schema changed/);
  assert.match(reasons, /was ok, now error/);
  assert.equal(rug.serverInfo.version, '2.0.0', 'live version captured');
}, { timeout: 45000 });

// keep savePins/loadPins referenced for future corpus-store tests
void savePins; void loadPins;

// ---- replay safety: read-only by default -------------------------------------

test('classifyCallForReplay: read-like replays; writes/destructive skip; --include overrides everything', () => {
  assert.equal(classifyCallForReplay('search_events'), 'replay');
  assert.equal(classifyCallForReplay('get_booking'), 'replay');
  assert.equal(classifyCallForReplay('read_file'), 'replay');
  assert.equal(classifyCallForReplay('update_event'), 'skip-write');
  assert.equal(classifyCallForReplay('send_email'), 'skip-write');
  assert.equal(classifyCallForReplay('delete_booking'), 'skip-destructive');
  assert.equal(classifyCallForReplay('drop_table'), 'skip-destructive');
  // --all-calls lifts the write-class skip, never the destructive one
  assert.equal(classifyCallForReplay('update_event', { allCalls: true }), 'replay');
  assert.equal(classifyCallForReplay('delete_booking', { allCalls: true }), 'skip-destructive');
  // explicit --include is the only way to replay destructive calls
  assert.equal(classifyCallForReplay('delete_booking', { include: ['delete_booking'] }), 'replay');
});

test('classifyCallForReplay: a read verb must not MASK a mutation (obna 21 edge)', () => {
  assert.equal(classifyCallForReplay('fetch_and_delete'), 'skip-write');
  assert.equal(classifyCallForReplay('search_and_replace'), 'skip-write');
  assert.equal(classifyCallForReplay('get_or_create'), 'skip-write');
  assert.equal(classifyCallForReplay('check_and_repair'), 'skip-write');
  assert.equal(classifyCallForReplay('reset_and_list'), 'skip-destructive', 'destructive prefix wins');
  // --all-calls still lifts masked write-class; plain reads stay replayable
  assert.equal(classifyCallForReplay('fetch_and_delete', { allCalls: true }), 'replay');
  assert.equal(classifyCallForReplay('search_events'), 'replay');
  assert.equal(classifyCallForReplay('list_files'), 'replay', 'no mutating token -> unaffected');
});

test('replay safety e2e: write-class corpus entries are never sent to the server', async () => {
  const corpus = [
    { kind: 'call-trace', server: 't', tool: 'search_events', args: { q: 'x' }, ok: true, result: { content: [{ type: 'text', text: 'ab' }], count: 2 }, truncated: false },
    { kind: 'call-trace', server: 't', tool: 'update_event', args: { id: '1' }, ok: true, result: { content: [] }, truncated: false }, // write: must NOT be sent
    { kind: 'call-trace', server: 't', tool: 'delete_event', args: { id: '1' }, ok: true, result: { content: [] }, truncated: false }, // destructive: must NOT be sent
  ];
  const r = await replayCorpus({ command: 'node', args: [V1], cwd: process.cwd(), corpus, timeoutMs: 15000 });
  assert.ok(!r.error, r.error);
  // the write/destructive calls were never delivered: no response at all, marked skipped
  const byTool = Object.fromEntries(r.calls.map((c) => [c.entry.tool, c]));
  assert.ok(byTool.search_events.live, 'read-like call was replayed');
  assert.equal(byTool.update_event.live, null);
  assert.equal(byTool.update_event.skipped, 'skip-write');
  assert.equal(byTool.delete_event.skipped, 'skip-destructive');
}, { timeout: 45000 });

test('classifyReplay reports skipped writes without failing the verdict', () => {
  const r = classifyReplay({
    serverPin: { tools: {} },
    liveTools: [],
    replayCalls: [
      { entry: { tool: 'search', ok: true, result: { a: 1 }, truncated: false }, live: { result: { a: 2 } } },
      { entry: { tool: 'update_thing', ok: true, result: {}, truncated: false }, live: null, skipped: 'skip-write' },
    ],
  });
  assert.equal(r.breaking, 0);
  assert.equal(r.skippedWrites, 1);
  assert.equal(r.verdict, 'SAFE');
  assert.ok(r.findings.some((f) => f.severity === 'SKIPPED' && f.tool === 'update_thing'));
});
