import fs from 'node:fs';
import path from 'node:path';
import { rugsnareDir } from './pins.js';

/**
 * Canary trace capture (v0.4, PR-1 of the canary ladder — see extensions-verdict.md).
 *
 * Records id-correlated tool calls that pass through the live proxy:
 *   { kind: 'call-trace', server, tool, args, ok, result?, error?, ms, ts }
 * plus the server identity sniffed from the initialize handshake:
 *   { kind: 'server-info', server, serverInfo, ts }
 *
 * Written to `.rugsnare/canary/calls.jsonl` — local file, append-only, never
 * committed, never sent anywhere. Default OFF (`canaryRecord: true` to enable):
 * args and responses may contain user data, so recording them is an explicit
 * opt-in, same policy as `logCallArgs`.
 *
 * Results are capped (MAX_RESULT_BYTES) so one chatty tool can't blow up the
 * disk; truncated entries carry `truncated: true` and are still useful for
 * structural diffing (shape, not full payload).
 */

const MAX_RESULT_BYTES = 64 * 1024; // per-entry response cap
export const MAX_PENDING = 1000; // safety valve: never hold more unmatched calls than this

const CALLS_FILE = 'calls.jsonl';

export function canaryDir(cwd = process.cwd()) {
  return path.join(rugsnareDir(cwd), 'canary');
}

export function canaryEnabled(config) {
  return Boolean(config?.canaryRecord);
}

export function appendTrace(entry, cwd = process.cwd()) {
  try {
    fs.mkdirSync(canaryDir(cwd), { recursive: true });
    fs.appendFileSync(path.join(canaryDir(cwd), CALLS_FILE), JSON.stringify(entry) + '\n');
  } catch {
    // Tracing must never break the proxy hot path.
  }
}

export function readTraces(cwd = process.cwd()) {
  try {
    return fs
      .readFileSync(path.join(canaryDir(cwd), CALLS_FILE), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

/** Cap a result/error payload; returns { payload, truncated }. */
export function capPayload(value) {
  const json = JSON.stringify(value ?? null) ?? 'null';
  if (json.length <= MAX_RESULT_BYTES) return { payload: value ?? null, truncated: false };
  return { payload: json.slice(0, MAX_RESULT_BYTES), truncated: true };
}
