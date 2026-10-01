import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { createProxy } from '../src/proxy.js';
import { readTraces, canaryDir } from '../src/canary.js';

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-canary-'));
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

function makeStreams() {
  return {
    clientIn: new PassThrough(),
    server: { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), on: () => {} },
  };
}

function harness(config, cwd) {
  const streams = makeStreams();
  const out = [];
  createProxy({ name: 'flights', streams, mode: 'observe', config, cwd, writeOut: (s) => out.push(s), writeErr: () => {} });
  return { streams, out };
}

const callMsg = (id, tool, args) => JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: tool, arguments: args } });
const resultMsg = (id, result) => JSON.stringify({ jsonrpc: '2.0', id, result });

test('canary off by default: no trace file is ever created', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const { streams } = harness({}, dir);
    streams.clientIn.write(callMsg(1, 'search_flights', { origin: 'AMS' }) + '\n');
    streams.server.stdout.write(resultMsg(1, { content: [] }) + '\n');
    assert.equal(fs.existsSync(canaryDir(dir)), false, 'no canary dir unless opted in');
    assert.equal(readTraces(dir).length, 0);
  } finally {
    cleanup();
  }
});

test('canary on: request+response merged into one trace with tool, args, result, ms', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const { streams } = harness({ canaryRecord: true }, dir);
    streams.clientIn.write(callMsg(7, 'search_flights', { origin: 'AMS' }) + '\n');
    streams.server.stdout.write(resultMsg(7, { content: [{ type: 'text', text: 'KL1001' }] }) + '\n');
    const traces = readTraces(dir);
    assert.equal(traces.length, 1);
    const t = traces[0];
    assert.equal(t.kind, 'call-trace');
    assert.equal(t.tool, 'search_flights');
    assert.deepEqual(t.args, { origin: 'AMS' });
    assert.equal(t.ok, true);
    assert.equal(t.result.content[0].text, 'KL1001');
    assert.equal(t.truncated, false);
    assert.ok(t.ms >= 0);
  } finally {
    cleanup();
  }
});

test('canary on: initialize response sniffed once into server-info', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const { streams } = harness({ canaryRecord: true }, dir);
    streams.server.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'flights', version: '1.2.3' } } }) + '\n');
    streams.server.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { serverInfo: { name: 'flights', version: '1.2.3' } } }) + '\n'); // second init → ignored
    const infos = readTraces(dir).filter((t) => t.kind === 'server-info');
    assert.equal(infos.length, 1, 'server-info recorded exactly once');
    assert.equal(infos[0].serverInfo.version, '1.2.3');
  } finally {
    cleanup();
  }
});

test('canary on: error response captured as ok:false with error payload', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const { streams } = harness({ canaryRecord: true }, dir);
    streams.clientIn.write(callMsg(9, 'get_booking', { ref: 'X' }) + '\n');
    streams.server.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: 9, error: { code: -32000, message: 'not found' } }) + '\n');
    const t = readTraces(dir)[0];
    assert.equal(t.ok, false);
    assert.equal(t.error.message, 'not found');
    assert.equal(t.result, undefined);
  } finally {
    cleanup();
  }
});

test('canary on: oversized result is capped and flagged truncated', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const { streams } = harness({ canaryRecord: true }, dir);
    const big = 'x'.repeat(200 * 1024); // 200 KB > 64 KB cap
    streams.clientIn.write(callMsg(11, 'dump', {}) + '\n');
    streams.server.stdout.write(resultMsg(11, { content: [{ type: 'text', text: big }] }) + '\n');
    const t = readTraces(dir)[0];
    assert.equal(t.truncated, true);
    assert.ok(JSON.stringify(t).length < 100 * 1024, 'stored entry must stay near the cap');
  } finally {
    cleanup();
  }
});

test('canary on: response without a pending call is ignored, no crash', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    const { streams } = harness({ canaryRecord: true }, dir);
    streams.server.stdout.write(resultMsg(999, { content: [] }) + '\n'); // unknown id
    streams.server.stdout.write('not json\n'); // garbage line
    const traces = readTraces(dir);
    assert.equal(traces.length, 0, 'stray responses are not recorded');
  } finally {
    cleanup();
  }
});
