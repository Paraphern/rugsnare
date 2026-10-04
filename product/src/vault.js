import fs from 'node:fs';
import path from 'node:path';
import { rugsnareDir } from './pins.js';
import { readJsonFile } from './jsonfile.js';

/**
 * Secret vault (v0.7): the model sees placeholders, the proxy injects the
 * real values on the way OUT and scrubs them on the way BACK.
 *
 *   client sends:   { "token": "{{VAULT:STRIPE}}" }
 *   server receives:{ "token": "sk_live_…" }
 *   model sees back:{ "result": "…payment … accepted…" } — any exact
 *                    occurrence of the secret is replaced with the
 *                    placeholder again before the result reaches the client.
 *
 * Storage: .rugsnare/vault.json — flat { NAME: value }, chmod 0600 (best
 * effort on Windows), covered by the standard .rugsnare/ gitignore block.
 * Presence of the file = intent; no config flag needed.
 *
 * Guarantees: secrets NEVER appear in events.jsonl, canary traces, pins, or
 * proxy alerts — substitution happens after call logging, redaction before
 * result inspection. Names only are ever logged.
 */

const TOKEN = /\{\{VAULT:([A-Za-z0-9_-]+)\}\}/g;

export function vaultPath(cwd = process.cwd()) {
  return path.join(rugsnareDir(cwd), 'vault.json');
}

/** Load the vault; null when absent (the common case — passthrough unchanged). */
export function loadVault(cwd = process.cwd()) {
  try {
    const v = readJsonFile(vaultPath(cwd));
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const clean = {};
      for (const [k, val] of Object.entries(v)) {
        if (typeof val === 'string' && val.length > 0) clean[k] = val;
      }
      return Object.keys(clean).length > 0 ? clean : null;
    }
  } catch { /* absent or unreadable → treat as absent */ }
  return null;
}

export function saveVault(vault, cwd = process.cwd()) {
  fs.mkdirSync(rugsnareDir(cwd), { recursive: true });
  const file = vaultPath(cwd);
  fs.writeFileSync(file, JSON.stringify(vault, null, 2) + '\n');
  try { fs.chmodSync(file, 0o600); } catch { /* Windows: best effort */ }
}

function substituteString(s, vault, used) {
  return s.replace(TOKEN, (full, name) => {
    if (vault[name] === undefined) return full; // unknown name stays a placeholder
    used.add(name);
    return vault[name];
  });
}

/**
 * Walk tool-call arguments replacing {{VAULT:name}} tokens (whole values or
 * embedded — "Bearer {{VAULT:KEY}}" works). Returns the new args and the
 * NAMES used (never values).
 */
export function substituteArgs(args, vault) {
  if (!vault || args === undefined || args === null) return { args, used: [] };
  const used = new Set();
  const walk = (v) => {
    if (typeof v === 'string') return substituteString(v, vault, used);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out = {};
      for (const [k, val] of Object.entries(v)) out[k] = walk(val);
      return out;
    }
    return v;
  };
  return { args: walk(args), used: [...used] };
}

/**
 * Reverse direction: replace every exact occurrence of a vault VALUE in any
 * result string with its placeholder, so a server echoing the secret back
 * never shows it to the model. Longest values first (a value that is a
 * prefix of another must not half-replace).
 */
export function redactResult(result, vault) {
  if (!vault || result === undefined || result === null) return { result, redacted: [] };
  const names = Object.keys(vault).sort((a, b) => vault[b].length - vault[a].length);
  const redacted = new Set();
  const scrub = (s) => {
    let out = s;
    for (const name of names) {
      const val = vault[name];
      if (val && out.includes(val)) {
        out = out.split(val).join(`{{VAULT:${name}}}`);
        redacted.add(name);
      }
    }
    return out;
  };
  const walk = (v) => {
    if (typeof v === 'string') return scrub(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out = {};
      for (const [k, val] of Object.entries(v)) out[k] = walk(val);
      return out;
    }
    return v;
  };
  return { result: walk(result), redacted: [...redacted] };
}
