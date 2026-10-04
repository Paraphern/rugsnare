import fs from 'node:fs';
import path from 'node:path';
import { rugsnareDir } from './pins.js';

/**
 * Append-only JSONL event log: `.rugsnare/events.jsonl`
 * Local only. No telemetry. Ever.
 */

const EVENTS_FILE = 'events.jsonl';

export function logEvent(event, cwd = process.cwd()) {
  const entry = { ts: new Date().toISOString(), ...event };
  try {
    fs.mkdirSync(rugsnareDir(cwd), { recursive: true });
    fs.appendFileSync(path.join(rugsnareDir(cwd), EVENTS_FILE), JSON.stringify(entry) + '\n');
  } catch {
    // Logging must never break the proxy hot path.
  }
  return entry;
}

export function readEvents(cwd = process.cwd()) {
  try {
    return fs
      .readFileSync(path.join(rugsnareDir(cwd), EVENTS_FILE), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

export function eventsPath(cwd = process.cwd()) {
  return path.join(rugsnareDir(cwd), EVENTS_FILE);
}

/**
 * Explicit operator trim: keep the last N events, drop the rest.
 * Never automatic — the log is append-only by contract; trimming is a human
 * decision (receipts live in their own hash-chained file and stay intact).
 * Atomic via tmp+rename so a crash mid-trim can't corrupt the log.
 */
export function trimEvents({ keepLast, cwd = process.cwd() }) {
  const file = eventsPath(cwd);
  const n = Number(keepLast);
  if (!Number.isInteger(n) || n < 0) throw new Error('--keep-last expects a non-negative integer');
  let lines;
  try {
    lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  } catch {
    return { kept: 0, dropped: 0 }; // no log yet — nothing to trim
  }
  if (lines.length <= n) return { kept: lines.length, dropped: 0 };
  // slice(-0) === slice(0) === everything — keep-last 0 must actually clear
  const kept = n === 0 ? [] : lines.slice(-n);
  const tmp = file + '.trim';
  fs.writeFileSync(tmp, kept.join('\n') + '\n');
  fs.renameSync(tmp, file);
  return { kept: kept.length, dropped: lines.length - kept.length };
}
