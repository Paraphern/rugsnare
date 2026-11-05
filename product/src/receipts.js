import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { rugsnareDir } from './pins.js';
import { canonicalJson } from './hash.js';

/**
 * Signed receipts (Phase B - see extensions-verdict.md).
 *
 * `rugsnare receipts sign` turns the local append-only event log
 * (.rugsnare/events.jsonl) into a tamper-evident chain: every entry gets
 *   entryHash = sha256(seq | prevHash | canonical-json(event))
 *   sig       = Ed25519(entryHash)  - key generated locally, never leaves the machine
 * `receipts verify` recomputes the chain and every signature; editing ANY
 * entry after signing breaks the chain at that point. `receipts export`
 * produces an auditor dossier (markdown + JSON) with field names aligned to
 * IETF draft-sharif-agent-audit-trail-05 (individual draft - a mapping,
 * not a compliance claim).
 *
 * Zero npm dependencies: node:crypto only. No network. Key files are fixed
 * names inside .rugsnare/keys/ (gitignored local state, same as events.jsonl).
 */

const GENESIS = '0'.repeat(64);

/** Generate/load the local Ed25519 pair. Fixed filenames - never user input. */
export function ensureKeys(cwd = process.cwd()) {
  const dir = rugsnareDir(cwd); // <cwd>/.rugsnare - the established local state dir
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

/** Load the existing PRIVATE key without generating one. Null if absent. */
export function loadPrivateKey(cwd = process.cwd()) {
  const privPath = path.join(rugsnareDir(cwd), 'keys', 'ed25519.pem');
  if (!fs.existsSync(privPath)) return null;
  return crypto.createPrivateKey(fs.readFileSync(privPath, 'utf8'));
}

// ---- signed pin store (v0.9) ---------------------------------------------------
//
// Threat (from the first external audit, finding #2): an attacker with write
// access to the repo/CI can edit .rugsnare/pins.json so `diff` reports clean
// against a poisoned contract. Committed together with pins.json, pins.sig
// makes that edit detectable: Ed25519 over the exact bytes of pins.json.
// The signature does NOT travel to the attacker's keyboard - signing happens
// at the human-review points (scan/approve/unpin) on the operator's machine.

export function pinsSigPath(cwd = process.cwd()) {
  return path.join(rugsnareDir(cwd), 'pins.sig');
}

/**
 * The COMMITTED public key (`.rugsnare/pins.pub.pem`, tracked - the .gitignore
 * block whitelists it). Committing the key is what makes the CI-attacker
 * defense work in CI itself (review 28, P1): a runner has no local keys dir,
 * so verification must not depend on one. Written by signPinsFile next to the
 * signature; deleting it is a visible diff, like deleting the signature.
 */
export function pinsPubPath(cwd = process.cwd()) {
  return path.join(rugsnareDir(cwd), 'pins.pub.pem');
}

/** Sign the current pins.json bytes. Returns true when signed, false when no key exists (nothing surprising happens on machines that never ran `receipts sign`). */
export function signPinsFile(cwd = process.cwd()) {
  const privateKey = loadPrivateKey(cwd);
  const pinsFile = path.join(rugsnareDir(cwd), 'pins.json');
  if (!privateKey || !fs.existsSync(pinsFile)) return false;
  const bytes = fs.readFileSync(pinsFile);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const pub = loadPublicKey(cwd);
  const sig = crypto.sign(null, Buffer.from(hash, 'hex'), privateKey).toString('hex');
  const payload = { algo: 'sha256+ed25519', hash, sig, keyFingerprint: pub.fingerprint, signedAt: new Date().toISOString() };
  fs.writeFileSync(pinsSigPath(cwd), JSON.stringify(payload, null, 2) + '\n');
  // publish the verification key next to the signature (same 0600 attempt for
  // consistency; it is a PUBLIC key, secrecy is not required)
  fs.writeFileSync(pinsPubPath(cwd), fs.readFileSync(path.join(rugsnareDir(cwd), 'keys', 'ed25519.pub.pem')));
  return true;
}

/** Resolve the verification key: the COMMITTED pins.pub.pem first (works in CI), then the local keys dir. Null when neither exists. */
function resolveVerifyKey(cwd) {
  try {
    const pem = fs.readFileSync(pinsPubPath(cwd), 'utf8');
    return { publicKey: crypto.createPublicKey(pem), fingerprint: keyFingerprint(pem), source: 'committed' };
  } catch (err) {
    // An absent committed key may use the legacy local fallback. A present
    // but unreadable/invalid key must not silently change the trust source.
    if (err?.code !== 'ENOENT') throw err;
  }
  const local = loadPublicKey(cwd);
  return local ? { ...local, source: 'local' } : null;
}

/**
 * Verify pins.json against pins.sig.
 * Statuses:
 *   ok          - signature matches the exact bytes (key: committed or local)
 *   tampered    - pins.json changed after signing (or sig forged) - ALWAYS fatal
 *   unsigned    - no pins.sig, but a verification key EXISTS (committed or
 *                 local) - suspicious: fail unless --allow-unsigned-pins
 *   nokey       - no pins.sig and no key anywhere: pre-0.9 / never signed - OK
 *   nopins      - no pins.json at all (caller handles its own "run scan first")
 */
export function verifyPinsFile(cwd = process.cwd()) {
  const pinsFile = path.join(rugsnareDir(cwd), 'pins.json');
  let bytes;
  try {
    bytes = fs.readFileSync(pinsFile);
  } catch (err) {
    if (err?.code === 'ENOENT') return { status: 'nopins' };
    return { status: 'tampered', reason: 'pins.json cannot be read for verification' };
  }
  const sigFile = pinsSigPath(cwd);
  let signatureText;
  let key;
  try {
    key = resolveVerifyKey(cwd);
  } catch {
    return { status: 'tampered', reason: 'verification key is unreadable or invalid' };
  }
  try {
    signatureText = fs.readFileSync(sigFile, 'utf8');
  } catch (err) {
    if (err?.code === 'ENOENT') return key ? { status: 'unsigned' } : { status: 'nokey' };
    return { status: 'tampered', reason: 'pins.sig cannot be read' };
  }
  let payload;
  try {
    payload = JSON.parse(signatureText);
  } catch {
    return { status: 'tampered', reason: 'pins.sig is not valid JSON' };
  }
  // Buffer.from(hex, 'hex') accepts valid prefixes and silently discards junk.
  // Validate the cryptographic fields before decoding; optional metadata from
  // older signatures remains optional and is not part of the signed message.
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
    || typeof payload.hash !== 'string' || typeof payload.sig !== 'string'
    || !/^[0-9a-f]{128}$/i.test(payload.sig)) {
    return { status: 'tampered', reason: 'pins.sig contains malformed hash or signature fields' };
  }
  if (!key) {
    return {
      status: 'tampered',
      reason: 'pins.sig exists but no verification key (neither committed pins.pub.pem nor local keys/) - restore the trusted verification key before continuing',
    };
  }
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (hash !== payload.hash) return { status: 'tampered', reason: 'pins.json was modified after signing' };
  let sigOk;
  try {
    sigOk = crypto.verify(null, Buffer.from(hash, 'hex'), key.publicKey, Buffer.from(payload.sig, 'hex'));
  } catch {
    return { status: 'tampered', reason: 'pins.sig signature cannot be verified with this key' };
  }
  if (!sigOk) return { status: 'tampered', reason: 'pins.sig signature does not verify' };
  return { status: 'ok', signedAt: payload.signedAt, fingerprint: key.fingerprint, keySource: key.source };
}

/** Reject compromised stores before runtime startup; unsigned override is explicit. */
export function assertPinsIntegrity(cwd = process.cwd(), { allowUnsignedPins = false } = {}) {
  const verdict = verifyPinsFile(cwd);
  if (verdict.status === 'tampered') {
    throw new Error(`pins.sig TAMPERED - ${verdict.reason}. Refusing to use an unverified pin store.`);
  }
  if (verdict.status === 'unsigned' && !allowUnsignedPins) {
    throw new Error('pins.json is unsigned while a verification key exists. Re-sign the store before continuing.');
  }
  return verdict;
}

export function receiptsPath(cwd = process.cwd()) {
  return path.join(rugsnareDir(cwd), 'receipts.jsonl');
}

/**
 * Read receipts.jsonl. Returns an array; a PRESENT-but-corrupt file is a
 * finding of its own (tamper or truncation) and is reported via the `corrupt`
 * count instead of masquerading as "nothing signed" (review 28, P2).
 */
export function readReceipts(cwd = process.cwd()) {
  let text;
  try {
    text = fs.readFileSync(receiptsPath(cwd), 'utf8');
  } catch {
    return []; // absent - nothing signed yet, the honest empty case
  }
  const lines = text.trim().split('\n').filter(Boolean);
  const out = [];
  let corrupt = 0;
  for (const l of lines) {
    try { out.push(JSON.parse(l)); } catch { corrupt += 1; }
  }
  if (corrupt > 0) out.corrupt = corrupt; // non-enumerable-ish marker: read via .corrupt
  return out;
}

// canonical json: single owner - hash.js canonicalJson (JCS-true, RFC 8785
// §3.2.3, integer-like keys lexicographic). The local copy this replaces
// diverged only on the undefined edge, which canonicalJson now guards the
// same way (undefined -> null); digests of real events are byte-identical.
const canonical = canonicalJson;

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
