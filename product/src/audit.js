import fs from 'node:fs';
import path from 'node:path';
import { BIP39_WORDS } from './bip39-words.js';

/**
 * AI Security Audit — zero-knowledge scanner for sensitive data in AI chat
 * exports and other local files (the "did I leak something into the chat"
 * check). Local-only and screen-only BY DESIGN:
 *
 *   - findings are REDACTED: first 4 characters + length, never the full value
 *   - nothing is ever written to disk; the only trace is a count-only event
 *     log entry (no paths, no previews), and even that is skipped with --airgap
 *   - zero network, zero dependencies
 *
 * Classes:
 *   AUD01 HIGH  API keys (OpenAI, Anthropic, AWS, GitHub, Google, Slack,
 *               Stripe, Telegram, SendGrid formats)
 *   AUD02 HIGH  private key blocks (SSH/RSA/EC/PGP/encrypted)
 *   AUD03 HIGH  payment cards (Luhn-validated, 13-19 digits)
 *   AUD04 HIGH  crypto seed phrases (>= 12 consecutive BIP-39 words)
 *   AUD05 HIGH  database URLs with embedded credentials
 *   AUD06 LOW   internal infrastructure (RFC1918 addresses, *.internal/.local)
 *   AUD07 LOW   contact PII (emails, international phone numbers)
 *   AUD08 HIGH  .env-style credential assignments (SECRET=… lines)
 */

const MAX_FILE_BYTES = 20 * 1024 * 1024; // skip absurdly large files

const KEY_PATTERNS = [
  // sk-ant- is Anthropic's prefix — the OpenAI pattern must not double-report it
  { name: 'OpenAI API key', re: /\bsk-(?!ant-)(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Anthropic API key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'AWS access key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{33,38}\b/g },
  { name: 'Slack token', re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g },
  { name: 'Stripe secret key', re: /\bsk_(?:live|test)_[0-9a-zA-Z]{24,}\b/g },
  { name: 'Telegram bot token', re: /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/g },
  { name: 'SendGrid API key', re: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/g },
];
const PRIVATE_KEY_BLOCK = /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/g;
const DB_URL_WITH_CREDS = /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/"']+:[^\s@/"']+@/g;
const RFC1918 = /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g;
const INTERNAL_HOST = /\b[A-Za-z0-9][\w.-]*\.(?:internal|local|lan|corp)\b/g;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE = /\+\d{1,3}[\s().-]?\(?\d{2,4}\)?[\s().-]?\d{3}[\s().-]?\d{3,4}\b/g;
const CARD_CANDIDATE = /\b\d[\d -]{11,27}\d\b/g;
// .env-style credential line: SECRET-ish NAME = / : value   (checked per line)
const ENV_CRED_NAME = /^\s*(?:export\s+)?([A-Z0-9_]*(?:API_KEY|APIKEY|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE_KEY|CREDENTIALS|ACCESS_KEY)[A-Z0-9_]*)\s*[=:]\s*(\S+)\s*$/;

function luhnValid(digits) {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** Redacted preview: first 4 chars + length. NEVER the full value. */
function preview(value) {
  if (value.length <= 4) return `${'•'.repeat(value.length)}(${value.length})`;
  return `${value.slice(0, 4)}…(${value.length})`;
}

const lineAt = (text, index) => text.slice(0, index).split('\n').length;

/**
 * Scan one string of text. `locPrefix` describes where it came from
 * (a JSON path); without it, line numbers are computed from the text.
 */
export function scanText(text, locPrefix = '') {
  const findings = [];
  const add = (id, severity, kind, value, index, extraPreview = null) => {
    findings.push({
      id, severity, kind,
      location: locPrefix ? locPrefix : `line ${lineAt(text, index)}`,
      preview: extraPreview ?? preview(value),
    });
  };

  for (const { name, re } of KEY_PATTERNS) {
    for (const m of text.matchAll(re)) add('AUD01', 'HIGH', `API key — ${name}`, m[0], m.index);
  }
  for (const m of text.matchAll(PRIVATE_KEY_BLOCK)) add('AUD02', 'HIGH', 'private key block', m[0], m.index, 'BEGIN … PRIVATE KEY block');
  // AUD05 spans collected first: an email/phone INSIDE a credential-bearing URL
  // is part of that finding, not a second finding (verifier run 2, P2)
  const dbUrlSpans = [...text.matchAll(DB_URL_WITH_CREDS)].map((m) => [m.index, m.index + m[0].length]);
  const inDbUrl = (idx) => dbUrlSpans.some(([s, e]) => idx >= s && idx < e);
  for (const m of text.matchAll(DB_URL_WITH_CREDS)) add('AUD05', 'HIGH', 'database URL with credentials', m[0], m.index, `${m[0].split(':')[0]}://user:password@…`);
  for (const m of text.matchAll(RFC1918)) add('AUD06', 'LOW', 'internal IP address (RFC1918)', m[0], m.index);
  for (const m of text.matchAll(INTERNAL_HOST)) add('AUD06', 'LOW', 'internal hostname', m[0], m.index);
  for (const m of text.matchAll(EMAIL)) {
    if (inDbUrl(m.index)) continue; // inside a db URL — already reported as AUD05
    add('AUD07', 'LOW', 'email address', m[0], m.index);
  }
  for (const m of text.matchAll(PHONE)) {
    if (inDbUrl(m.index)) continue;
    add('AUD07', 'LOW', 'phone number', m[0], m.index);
  }

  // payment cards: Luhn-validated candidates
  for (const m of text.matchAll(CARD_CANDIDATE)) {
    const digits = m[0].replace(/[ -]/g, '');
    if (digits.length >= 13 && digits.length <= 19 && new Set(digits).size > 1 && luhnValid(digits)) {
      add('AUD03', 'HIGH', `payment card (Luhn-valid, ${digits.length} digits)`, digits, m.index, `${digits.slice(0, 4)} •••• ${digits.slice(-4)}`);
    }
  }

  // .env-style credential lines
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lm = lines[i].match(ENV_CRED_NAME);
    if (lm) findings.push({ id: 'AUD08', severity: 'HIGH', kind: `.env-style credential — ${lm[1]}`, location: locPrefix || `line ${i + 1}`, preview: preview(lm[2]) });
  }

  // crypto seed phrases: maximal runs of >= 12 consecutive BIP-39 words.
  // A token immediately followed by ':' is a LABEL ("seed:", "card:"), not a
  // list item — many labels are themselves BIP-39 words and must break the
  // run instead of inflating it (verifier run 2, P2: "14 words starting card").
  const tokens = [...text.matchAll(/[A-Za-z']+/g)];
  const isLabel = (t) => text[t.index + t[0].length] === ':';
  let runStart = -1;
  const flushRun = (endExclusive) => {
    const len = endExclusive - runStart;
    if (runStart >= 0 && len >= 12) {
      const firstWord = tokens[runStart][0];
      add('AUD04', 'HIGH', 'crypto seed phrase (BIP-39)', firstWord, tokens[runStart].index, `${len} consecutive BIP-39 words, starting "${firstWord}"`);
    }
    runStart = -1;
  };
  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i][0].toLowerCase().replace(/'+/g, '');
    if (BIP39_WORDS.has(word) && !isLabel(tokens[i])) {
      if (runStart < 0) runStart = i;
    } else {
      flushRun(i);
    }
  }
  flushRun(tokens.length);

  return findings;
}

/** Walk a parsed JSON value, scanning every string leaf with its JSON path. */
export function scanJsonValue(value, jsonPath = '$') {
  const findings = [];
  if (typeof value === 'string') {
    if (value.length > 0) findings.push(...scanText(value, jsonPath));
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => findings.push(...scanJsonValue(v, `${jsonPath}[${i}]`)));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) findings.push(...scanJsonValue(v, `${jsonPath}.${k}`));
  }
  return findings;
}

export function scanFile(file) {
  const st = fs.statSync(file);
  if (st.size > MAX_FILE_BYTES) return { file, skipped: 'file exceeds 20MB', findings: [] };
  const buf = fs.readFileSync(file);
  // NUL in the first 8KB => binary, not a chat export
  if (buf.subarray(0, 8192).includes(0)) return { file, skipped: 'binary', findings: [] };
  const text = buf.toString('utf8');
  const ext = path.extname(file).toLowerCase();

  if (ext === '.json') {
    try {
      return { file, findings: scanJsonValue(JSON.parse(text)) };
    } catch {
      // malformed JSON — scan as text, it's still user data
      return { file, findings: scanText(text), note: 'malformed JSON, scanned as text' };
    }
  }
  if (ext === '.jsonl') {
    const findings = [];
    let bad = 0;
    text.split('\n').filter(Boolean).forEach((line, i) => {
      try {
        findings.push(...scanJsonValue(JSON.parse(line), `line ${i + 1}`));
      } catch {
        bad += 1;
        findings.push(...scanText(line));
      }
    });
    return { file, findings, note: bad > 0 ? `${bad} unparseable JSONL line(s) scanned as text` : undefined };
  }
  return { file, findings: scanText(text) };
}

function walkFiles(input) {
  const st = fs.statSync(input);
  if (st.isFile()) return [input];
  const out = [];
  const recurse = (dir, depth) => {
    if (depth > 8) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        recurse(full, depth + 1);
      } else if (entry.isFile()) {
        // EVERY file, not just "text-looking" extensions: a leak does not care
        // about the file suffix, and scanFile already skips binaries (NUL
        // check) and oversized files
        out.push(full);
      }
    }
  };
  recurse(input, 0);
  return out;
}

/**
 * Audit a file or directory. Returns per-file results + counts.
 * Redacted by construction: no full secret values anywhere in the result.
 */
export function auditPath(input) {
  const files = walkFiles(input);
  const results = [];
  const counts = {};
  let high = 0;
  for (const f of files) {
    let r;
    try {
      r = scanFile(f);
    } catch (err) {
      r = { file: f, skipped: `unreadable: ${String(err.message).slice(0, 80)}`, findings: [] };
    }
    for (const f2 of r.findings) {
      counts[f2.id] = (counts[f2.id] ?? 0) + 1;
      if (f2.severity === 'HIGH') high += 1;
    }
    results.push(r);
  }
  return { results, counts, high, filesScanned: files.length };
}
