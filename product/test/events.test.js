import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { trimEvents, readEvents, logEvent, eventsPath } from '../src/events.js';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js');

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-events-'));
  return { dir, cleanup: () => { try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* Windows */ } } };
}

test('trimEvents: keeps the LAST n entries in order', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    for (let i = 1; i <= 10; i++) logEvent({ kind: 'test', seq: i }, dir);
    const r = trimEvents({ keepLast: 3, cwd: dir });
    assert.deepEqual(r, { kept: 3, dropped: 7 });
    const events = readEvents(dir);
    assert.equal(events.length, 3);
    assert.deepEqual(events.map((e) => e.seq), [8, 9, 10], 'must keep the TAIL, order preserved');
    // file ends with a newline (append-only readers rely on line framing)
    assert.ok(fs.readFileSync(eventsPath(dir), 'utf8').endsWith('\n'));
    // no leftover tmp file from the atomic rename
    assert.ok(!fs.existsSync(eventsPath(dir) + '.trim'));
  } finally {
    cleanup();
  }
});

test('trimEvents: keep-more-than-present is a no-op; zero clears; missing file is fine', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    for (let i = 1; i <= 3; i++) logEvent({ kind: 'test', seq: i }, dir);
    assert.deepEqual(trimEvents({ keepLast: 100, cwd: dir }), { kept: 3, dropped: 0 });
    assert.deepEqual(trimEvents({ keepLast: 0, cwd: dir }), { kept: 0, dropped: 3 });
    assert.equal(readEvents(dir).length, 0);
    const empty = tmpCwd();
    try {
      assert.deepEqual(trimEvents({ keepLast: 5, cwd: empty.dir }), { kept: 0, dropped: 0 });
    } finally { empty.cleanup(); }
  } finally {
    cleanup();
  }
});

test('trimEvents: invalid --keep-last is rejected loudly, log untouched', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    for (let i = 1; i <= 3; i++) logEvent({ kind: 'test', seq: i }, dir);
    assert.throws(() => trimEvents({ keepLast: -1, cwd: dir }), /non-negative/);
    assert.throws(() => trimEvents({ keepLast: NaN, cwd: dir }), /non-negative/);
    assert.equal(readEvents(dir).length, 3, 'rejected trim must not touch the log');
  } finally {
    cleanup();
  }
});

test('CLI: events trim keeps receipts.jsonl untouched', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    fs.mkdirSync(path.join(dir, '.rugsnare'), { recursive: true });
    const events = Array.from({ length: 5 }, (_, i) => JSON.stringify({ kind: 'scan', server: `s${i}`, ts: '2026-01-01T00:00:00Z' })).join('\n');
    fs.writeFileSync(path.join(dir, '.rugsnare', 'events.jsonl'), events + '\n');
    // a signed receipts file must survive a trim untouched
    fs.writeFileSync(path.join(dir, '.rugsnare', 'receipts.jsonl'), '{"seq":1,"sig":"deadbeef"}\n');
    const receiptsBefore = fs.readFileSync(path.join(dir, '.rugsnare', 'receipts.jsonl'), 'utf8');

    const r = await new Promise((resolve) => {
      execFile('node', [CLI, 'events', 'trim', '--keep-last', '2'], { cwd: dir, timeout: 60000 }, (err, stdout, stderr) => {
        resolve({ code: err ? err.code : 0, stdout, stderr });
      });
    });
    assert.equal(r.code, 0, r.stderr);
    assert.match(r.stdout, /kept 2, dropped 3/);
    assert.match(r.stdout, /receipts\.jsonl was not touched/);
    assert.equal(fs.readFileSync(path.join(dir, '.rugsnare', 'receipts.jsonl'), 'utf8'), receiptsBefore);
    assert.equal(readEvents(dir).length, 2);

    const count = await new Promise((resolve) => {
      execFile('node', [CLI, 'events', 'count'], { cwd: dir, timeout: 60000 }, (err, stdout) => resolve(stdout));
    });
    assert.match(count, /2 entr/);
  } finally {
    cleanup();
  }
});
