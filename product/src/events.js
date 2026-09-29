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
