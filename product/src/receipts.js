import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { rugsnareDir } from './pins.js';

/**
 * Signed receipts (Phase B — see extensions-verdict.md).
 *
 * `rugsnare receipts sign` turns the local append-only event log
 * (.rugsnare/events.jsonl) into a tamper-evident chain: every entry gets
 *   entryHash = sha256(seq | prevHash | canonical-json(event))
 *   sig       = Ed25519(entryHash)  — key generated locally, never leaves the machine
 * `receipts verify` recomputes the chain and every signature; editing ANY
 * entry after signing breaks the chain at that point. `receipts export`
 * produces an auditor dossier (markdown + JSON) with field names aligned to
 * IETF draft-sharif-agent-audit-trail-05 (individual draft — a mapping,
 * not a compliance claim).
 *
 * Zero npm dependencies: node:crypto only. No network. Key files are fixed
 * names inside .rugsnare/keys/ (gitignored local state, same as events.jsonl).
 */

const GENESIS = '0'.repeat(64);

/** Generate/load the local Ed25519 pair. Fixed filenames — never user input. */
export function ensureKeys(cwd = process.cwd()) {
  const dir = rugsnareDir(cwd); // <cwd>/.rugsnare — the established local state dir
  const privPath = path.join(dir, 'keys', 'ed25519.pem');
  const pubPath = path.join(dir, 'keys', 'ed25519.pub.pem');
  if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
    return {
      privateKey: crypto.createPrivateKey(fs.readFileSync(privPath, 'utf8')),
      publicKey: crypto.createPublicKey(fs.readFileSync(pubPath, 'utf8')),
      created: false,
      fingerprint: keyFingerprint(fs.readFileSync(pubPath, 'utf8')),
    };
  }
  fs.mkdirSync(path.dirname(privPath), { recursive: true });
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(privPath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  try { fs.chmodSync(privPath, 0o600); } catch { /* Windows: best effort */ }
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });
  fs.writeFileSync(pubPath, pubPem);
  return { privateKey, publicKey, created: true, fingerprint: keyFingerprint(pubPem) };
}

export function keyFingerprint(publicPem) {
  const key = crypto.createPublicKey(publicPem);
  const der = key.export({ type: 'spki', format: 'der' });
  return crypto.createHash('sha256').update(der).digest('hex');
}

/** Load the existing public key WITHOUT generating one (verify must not mint keys). Null if absent. */
export function loadPublicKey(cwd = process.cwd()) {
  const pubPath = path.join(rugsnareDir(cwd), 'keys', 'ed25519.pub.pem');
  if (!fs.existsSync(pubPath)) return null;
  const pem = fs.readFileSync(pubPath, 'utf8');
  return { publicKey: crypto.createPublicKey(pem), fingerprint: keyFingerprint(pem) };
}

export function receiptsPath(cwd = process.cwd()) {
  return path.join(rugsnareDir(cwd), 'receipts.jsonl');
}

export function readReceipts(cwd = process.cwd()) {
  try {
    return fs.readFileSync(receiptsPath(cwd), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

// canonical json: sorted keys, no whitespace — same discipline as hash.js stable()
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}

function entryHashOf(seq, prevHash, event) {
  return crypto.createHash('sha256').update(`${seq}|${prevHash}|${canonical(event)}`).digest('hex');
}

/** Build the signed chain from plain events. prevHash = hash of the PREVIOUS entry (GENESIS for #1). */
export function signEvents(events, privateKey) {
  const out = [];
  let prevHash = GENESIS;
  for (let i = 0; i < events.length; i++) {
    const seq = i + 1;
    const entryHash = entryHashOf(seq, prevHash, events[i]);
    const sig = crypto.sign(null, Buffer.from(entryHash, 'hex'), privateKey).toString('hex');
    out.push({ seq, prevHash, entryHash, sig, event: events[i] });
    prevHash = entryHash;
  }
  return out;
}

/**
 * Verify a receipt chain. Returns { ok, count, brokenAt?, reason?, first?, last? }.
 * brokenAt is the 1-based seq where the chain or a signature failed.
 */
export function verifyReceipts(receipts, publicKey) {
  let prevHash = GENESIS;
  for (const r of receipts) {
    if (r.prevHash !== prevHash) {
      return { ok: false, count: receipts.length, brokenAt: r.seq, reason: `prevHash mismatch at #${r.seq}: chain was cut, reordered, or an entry was inserted` };
    }
    if (r.entryHash !== entryHashOf(r.seq, prevHash, r.event)) {
      return { ok: false, count: receipts.length, brokenAt: r.seq, reason: `entry #${r.seq} modified after signing (hash mismatch)` };
    }
    if (!crypto.verify(null, Buffer.from(r.entryHash, 'hex'), publicKey, Buffer.from(r.sig, 'hex'))) {
      return { ok: false, count: receipts.length, brokenAt: r.seq, reason: `signature invalid at #${r.seq}` };
    }
    prevHash = r.entryHash;
  }
  return {
    ok: true,
    count: receipts.length,
    first: receipts[0]?.event?.ts,
    last: receipts[receipts.length - 1]?.event?.ts,
  };
}

/** Auditor dossier. Field names follow AAT draft -05 where applicable. */
export function exportDossier(receipts, { fingerprint } = {}) {
  const actions = receipts.map((r) => {
    const e = r.event ?? {};
    return {
      timestamp: e.ts,                                                          // AAT: timestamp
      agent_id: e.server ?? 'unknown',                                          // AAT: agent identity (closest local field)
      action: e.kind === 'call' ? `tool_call:${e.tool}` : String(e.kind),       // AAT: action classification
      outcome: e.ok !== undefined ? (e.ok ? 'success' : 'failure') : e.status ?? e.code ?? 'recorded', // AAT: outcome
      receipt_hash: r.entryHash,
    };
  });
  const json = {
    schema: 'rugsnare-receipts-dossier/1',
    note: 'Field names aligned to IETF draft-sharif-agent-audit-trail-05 (individual draft); a mapping, not a claim of compliance.',
    signing_key_fingerprint: fingerprint,
    entries: receipts.length,
    chain_head: receipts[receipts.length - 1]?.entryHash ?? null,
    actions,
  };
  const lines = [
    '# RugSnare agent action dossier',
    '',
    `- Entries: ${receipts.length}`,
    `- Chain head: \`${json.chain_head}\``,
    `- Signing key: \`${fingerprint}\``,
    `- Fields follow IETF draft-sharif-agent-audit-trail-05 where applicable (mapping, not compliance claim).`,
    '',
    '| # | timestamp | agent | action | outcome |',
    '|---|---|---|---|---|',
    ...actions.map((a, i) => `| ${i + 1} | ${a.timestamp} | ${a.agent_id} | ${a.action} | ${a.outcome} |`),
  ];
  return { markdown: lines.join('\n') + '\n', json };
}
