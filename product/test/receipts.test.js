import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import crypto from 'node:crypto';
import { createProxy } from '../src/proxy.js';
import { ensureKeys, signEvents, verifyReceipts, exportDossier } from '../src/receipts.js';
import { readEvents } from '../src/events.js';

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-receipts-'));
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

const EVENTS = [
  { ts: '2026-10-01T10:00:00.000Z', kind: 'call', server: 'flights', tool: 'search_flights' },
  { ts: '2026-10-01T10:00:01.000Z', kind: 'rugsnare.alert', status: 'DRIFT', server: 'flights', tool: 'search_flights' },
  { ts: '2026-10-01T10:00:02.000Z', kind: 'call', server: 'flights', tool: 'get_booking' },
];

test('sign → verify roundtrip: chain intact, correct count and span', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const { privateKey, publicKey, created, fingerprint } = ensureKeys(dir);
    assert.equal(created, true, 'first call generates the key');
    assert.match(fingerprint, /^[0-9a-f]{64}$/);
    const receipts = signEvents(EVENTS, privateKey);
    const r = verifyReceipts(receipts, publicKey);
    assert.equal(r.ok, true);
    assert.equal(r.count, 3);
    assert.equal(r.first, '2026-10-01T10:00:00.000Z');
    assert.equal(r.last, '2026-10-01T10:00:02.000Z');
    // second ensureKeys call must LOAD, not regenerate
    assert.equal(ensureKeys(dir).created, false);
  } finally {
    cleanup();
  }
});

test('TAMPER: editing one entry in the middle breaks the chain exactly there', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const { privateKey, publicKey } = ensureKeys(dir);
    const receipts = signEvents(EVENTS, privateKey);
    receipts[1].event.tool = 'innocent_replacement'; // the classic mid-log forgery
    const r = verifyReceipts(receipts, publicKey);
    assert.equal(r.ok, false);
    assert.equal(r.brokenAt, 2, 'must point at the edited entry');
    assert.match(r.reason, /modified after signing/);
  } finally {
    cleanup();
  }
});

test('TAMPER: deleting an entry is caught (chain cut), not silently accepted', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const { privateKey, publicKey } = ensureKeys(dir);
    const receipts = signEvents(EVENTS, privateKey);
    receipts.splice(1, 1);
    const r = verifyReceipts(receipts, publicKey);
    assert.equal(r.ok, false);
    assert.equal(r.brokenAt, 3, 'the surviving #3 links to the wrong prevHash');
    assert.match(r.reason, /cut, reordered, or an entry was inserted/);
  } finally {
    cleanup();
  }
});

test('TAMPER: re-signing one entry with a different key fails the signature check', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const { privateKey, publicKey } = ensureKeys(dir);
    const receipts = signEvents(EVENTS, privateKey);
    const attacker = crypto.generateKeyPairSync('ed25519');
    const forgedHash = crypto.createHash('sha256').update('forged').digest('hex');
    receipts[2].sig = crypto.sign(null, Buffer.from(forgedHash, 'hex'), attacker.privateKey).toString('hex');
    const r = verifyReceipts(receipts, publicKey);
    assert.equal(r.ok, false);
    assert.equal(r.brokenAt, 3);
    assert.match(r.reason, /signature invalid/);
  } finally {
    cleanup();
  }
});

test('dossier: markdown table + json with AAT-aligned field names', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const { privateKey, fingerprint } = ensureKeys(dir);
    const receipts = signEvents(EVENTS, privateKey);
    const { markdown, json } = exportDossier(receipts, { fingerprint });
    assert.match(markdown, /# RugSnare agent action dossier/);
    assert.match(markdown, /tool_call:search_flights/);
    assert.equal(json.actions[0].agent_id, 'flights');
    assert.equal(json.actions[0].action, 'tool_call:search_flights');
    assert.equal(json.entries, 3);
    assert.match(json.note, /agent-audit-trail-05/);
  } finally {
    cleanup();
  }
});

// ---- loop detector (proxy integration, advisory-only) ------------------------

function makeStreams() {
  return {
    clientIn: new PassThrough(),
    server: { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), on: () => {} },
  };
}

const callMsg = (id, tool, args) => JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: tool, arguments: args } });

test('loop detector: 5 identical calls fire loop-suspected once; varied calls do not', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const streams = makeStreams();
    const err = [];
    createProxy({ name: 'flights', streams, mode: 'observe', config: {}, cwd: dir, writeOut: () => {}, writeErr: (s) => err.push(s) });
    for (let i = 1; i <= 5; i++) streams.clientIn.write(callMsg(i, 'search_flights', { origin: 'AMS' }) + '\n');
    let events = readEvents(dir).filter((e) => e.kind === 'loop-suspected');
    assert.equal(events.length, 1, 'exactly one advisory per stuck run');
    assert.equal(events[0].count, 5);
    assert.ok(err.join('\n').includes('LOOP-SUSPECTED'));
    // more identical calls: still just the one alert
    for (let i = 6; i <= 8; i++) streams.clientIn.write(callMsg(i, 'search_flights', { origin: 'AMS' }) + '\n');
    events = readEvents(dir).filter((e) => e.kind === 'loop-suspected');
    assert.equal(events.length, 1, 'no alert spam');
    // a different call resets the run
    streams.clientIn.write(callMsg(9, 'get_booking', { ref: 'X' }) + '\n');
    for (let i = 10; i <= 13; i++) streams.clientIn.write(callMsg(i, 'search_flights', { origin: 'AMS' }) + '\n');
    events = readEvents(dir).filter((e) => e.kind === 'loop-suspected');
    assert.equal(events.length, 1, '4 identical after a reset stay under the threshold');
    // and a fresh 5-in-a-row DOES alert again (new stuck run)
    streams.clientIn.write(callMsg(14, 'search_flights', { origin: 'AMS' }) + '\n');
    events = readEvents(dir).filter((e) => e.kind === 'loop-suspected');
    assert.equal(events.length, 2, 'a new stuck run alerts again');
  } finally {
    cleanup();
  }
});
