import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { ensureServer, pinTool, compareTools, loadPins, savePins } from '../src/pins.js';
import { toolHash } from '../src/hash.js';
import { createProxy } from '../src/proxy.js';
import { readEvents } from '../src/events.js';
import { classifyReplay } from '../src/canary-replay.js';

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-v041-'));
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

const BASE = { name: 'fs_read', description: 'Read a file.', inputSchema: { type: 'object' }, annotations: { readOnlyHint: true } };

// ---- annotations flip (the mcpsnoop-exposed gap) -----------------------------

test('annotation flip with identical hash+schema+text is DRIFT/ANNOTATION', () => {
  const sp = ensureServer({ servers: {} }, 's', null);
  pinTool(sp, BASE, toolHash(BASE), { approved: true });
  const flipped = { ...BASE, annotations: { readOnlyHint: false, destructiveHint: true } };
  assert.equal(toolHash(flipped), toolHash(BASE), 'hash must not include annotations — that is the point');
  const v = compareTools(sp, [flipped], toolHash);
  assert.equal(v[0].status, 'DRIFT');
  assert.equal(v[0].driftType, 'ANNOTATION');
  assert.equal(v[0].annotationsChanged, true);
  assert.deepEqual(v[0].oldAnnotations, { readOnlyHint: true });
  assert.deepEqual(v[0].newAnnotations, { readOnlyHint: false, destructiveHint: true });
});

test('old pins without annotations never false-positive; same annotations stay UNCHANGED', () => {
  const sp = ensureServer({ servers: {} }, 's', null);
  const pin = pinTool(sp, BASE, toolHash(BASE), { approved: true });
  delete pin.annotations; // simulate a pre-v0.4.1 pin store
  let v = compareTools(sp, [BASE], toolHash);
  assert.equal(v[0].status, 'UNCHANGED', 'no stored annotations -> nothing to compare -> no finding');
  v = compareTools(sp, [{ ...BASE, annotations: { readOnlyHint: false } }], toolHash);
  assert.equal(v[0].status, 'UNCHANGED', 'pre-0.4.1 pins are grandfathered until re-scan');

  const sp2 = ensureServer({ servers: {} }, 's', null);
  pinTool(sp2, BASE, toolHash(BASE), { approved: true });
  v = compareTools(sp2, [{ ...BASE, annotations: { readOnlyHint: true } }], toolHash);
  assert.equal(v[0].status, 'UNCHANGED', 'identical annotations stay clean');
});

test('annotation comparison goes through spec defaults: explicit default is not drift, silent downgrade is', () => {
  // pinned WITHOUT annotations; server later spells out the default explicitly -> no behavioral change
  const sp = ensureServer({ servers: {} }, 's', null);
  const pin = pinTool(sp, { name: 't', description: 'd', inputSchema: {} }, toolHash({ name: 't', description: 'd', inputSchema: {} }), { approved: true });
  assert.equal(pin.annotations, null);
  let v = compareTools(sp, [{ name: 't', description: 'd', inputSchema: {}, annotations: { readOnlyHint: false, destructiveHint: false } }], toolHash);
  assert.equal(v[0].status, 'UNCHANGED', 'absent -> explicit defaults is noise, not drift');

  // the reverse IS a rug-pull: approved as read-only, hint silently dropped (absent = false by default)
  const sp2 = ensureServer({ servers: {} }, 's', null);
  pinTool(sp2, BASE, toolHash(BASE), { approved: true }); // BASE has readOnlyHint:true
  v = compareTools(sp2, [{ ...BASE, annotations: undefined }], toolHash);
  assert.equal(v[0].status, 'DRIFT', 'readOnlyHint:true silently dropped = downgrade = drift');
  assert.equal(v[0].driftType, 'ANNOTATION');
});

test('proxy: mid-session annotation flip with identical hash alerts DRIFT (ANNOTATION)', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    // seed pins with annotations through the real pinTool path
    const pins = loadPins(dir);
    const sp = ensureServer(pins, 'fs', null);
    pinTool(sp, BASE, toolHash(BASE), { approved: true });
    savePins(pins, dir);

    const streams = {
      clientIn: new PassThrough(),
      server: { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), on: () => {} },
    };
    const err = [];
    createProxy({ name: 'fs', streams, mode: 'observe', config: {}, cwd: dir, writeOut: () => {}, writeErr: (s) => err.push(s) });
    streams.server.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { tools: [{ ...BASE, annotations: { readOnlyHint: false, destructiveHint: true } }] } }) + '\n');
    assert.ok(err.join('\n').includes('DRIFT: fs/fs_read (ANNOTATION)'), 'stderr must carry the annotation drift');
    assert.ok(readEvents(dir).some((e) => e.kind === 'rugsnare.alert' && e.driftType === 'ANNOTATION'));
  } finally {
    cleanup();
  }
});

// ---- canary --max-ms performance gate -----------------------------------------

test('classifyReplay: SLOW finding when live call exceeds the ms budget', () => {
  const r = classifyReplay({
    serverPin: { tools: {} },
    liveTools: [],
    maxMs: 50,
    replayCalls: [
      { entry: { tool: 'search', ok: true, result: { a: 1 }, truncated: false }, live: { result: { a: 2 } }, ms: 120 },
      { entry: { tool: 'get', ok: true, result: { a: 1 }, truncated: false }, live: { result: { a: 1 } }, ms: 10 },
    ],
  });
  assert.equal(r.slow, 1);
  assert.equal(r.breaking, 0, 'latency alone does not fake a contract break');
  assert.ok(r.findings.some((f) => f.severity === 'SLOW' && /120ms > 50ms/.test(f.reason)));
  assert.equal(r.verdict, 'SAFE', 'SLOW is a gate, not a verdict change');
});
