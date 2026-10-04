import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scanText, scanJsonValue, auditPath } from '../src/audit.js';
import { BIP39_COUNT } from '../src/bip39-words.js';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js');

// Fake credentials assembled by concatenation so no secret-shaped LITERAL sits
// in this source file — secret scanners (CI, Mimosa, our own audit) must not
// trip on the test fixtures themselves. Every value below is a documentation
// example, not a real credential.
const K = {
  openai: 'sk-' + 'proj-abcdefghijklmnopqrstuv',
  anthropic: 'sk-' + 'ant-api03-abcdefghij1234567890',
  aws: 'AK' + 'IAIOSFODNN7EXAMPLE',
  github: 'gh' + 'p_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl',
  google: 'AI' + 'za' + 'y'.repeat(35), // AIza + exactly 35 chars = the real 39-char format
  slack: 'xo' + 'xb-123456789012-AbCdEfGhIjKlMnOpQrStUvWx',
  stripe: 'sk_' + 'live_abcdefghijklmnopqrstuvwx',
  awsSecret: 'wJa' + 'lrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  github2: 'gh' + 'p_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
};

function tmpCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-audit-'));
  return { dir, cleanup: () => { try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* Windows */ } } };
}

function runCli(cwd, args) {
  return new Promise((resolve) => {
    execFile('node', [CLI, ...args], { cwd, timeout: 60000 }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

const of = (findings, id) => findings.filter((f) => f.id === id);

test('wordlist sanity: 2048 BIP-39 words embedded', () => {
  assert.equal(BIP39_COUNT, 2048);
});

test('AUD01: API key formats detected', () => {
  for (const k of [K.openai, K.anthropic, K.aws, K.github, K.google, K.slack, K.stripe]) {
    const hits = of(scanText(`here is my key: ${k} ok`), 'AUD01');
    assert.equal(hits.length, 1, `must detect ${k.slice(0, 8)}…`);
  }
  // ordinary text is not a key
  assert.equal(of(scanText('skill testing the skiff over statecraft'), 'AUD01').length, 0);
});

test('AUD02/AUD05: private key blocks and DB URLs with credentials', () => {
  const keyBlock = '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA\n-----END OPENSSH PRIVATE KEY-----';
  assert.equal(of(scanText(keyBlock), 'AUD02').length, 1);
  assert.equal(of(scanText('connect via postgres://admin:hunter2@db.internal:5432/prod'), 'AUD05').length, 1);
  assert.equal(of(scanText(`mongodb+srv://u:pass@cluster0.xyz.mongodb.net/db`), 'AUD05').length, 1);
  // URL WITHOUT credentials is not a finding
  assert.equal(of(scanText('see https://api.example.com/docs'), 'AUD05').length, 0);
});

test('AUD03: Luhn-valid cards detected, invalid same-length numbers are not', () => {
  assert.equal(of(scanText('card 4111 1111 1111 1111 please'), 'AUD03').length, 1);
  assert.equal(of(scanText('card 4111 1111 1111 1112 please'), 'AUD03').length, 0, 'Luhn-invalid must not fire');
  assert.equal(of(scanText('ref 4242424242424242 done'), 'AUD03').length, 1);
});

test('AUD04: 12-word BIP-39 seed phrase detected; ordinary prose is not', () => {
  const seed = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
  const hits = of(scanText(`my backup: ${seed} keep safe`), 'AUD04');
  assert.equal(hits.length, 1);
  // "keep safe" are BIP-39 words too — the run legitimately extends past 12
  const wordCount = Number(hits[0].preview.match(/(\d+) consecutive/)[1]);
  assert.ok(wordCount >= 12, `run must be at least 12 words, got ${wordCount}`);
  // everyday English contains many BIP-39 words but not 12 IN A ROW
  const prose = 'the tool can treat the trip as a trade for the time it took to try the top of the toy box';
  assert.equal(of(scanText(prose), 'AUD04').length, 0);
  // 11 in a row is below the threshold
  const eleven = seed.split(' ').slice(0, 11).join(' ');
  assert.equal(of(scanText(`ends here. ${eleven} done`), 'AUD04').length, 0);
});

test('AUD06/AUD07: internal infra and contact PII', () => {
  assert.equal(of(scanText('ssh admin@10.0.5.12'), 'AUD06').length, 1);
  assert.equal(of(scanText('db.lan and wiki.internal'), 'AUD06').length, 2);
  assert.equal(of(scanText('8.8.8.8 is public'), 'AUD06').length, 0, 'public IP is not internal');
  assert.equal(of(scanText('mail me at jane.doe@example.com'), 'AUD07').length, 1);
  assert.equal(of(scanText('call +1 (415) 555-0132 now'), 'AUD07').length, 1);
});

test('AUD08: .env-style credential lines', () => {
  assert.equal(of(scanText(`AWS_SECRET_ACCESS_KEY=${K.awsSecret}`), 'AUD08').length, 1);
  assert.equal(of(scanText(`export GITHUB_TOKEN=${K.github2}`), 'AUD08').length, 1);
  assert.equal(of(scanText('MAX_CONNECTIONS=10'), 'AUD08').length, 0, 'non-secret setting must not fire');
});

test('redaction: the full secret value NEVER appears in any finding', () => {
  const card = '4111' + '1111' + '1111' + '1111';
  const findings = scanText(`key ${K.anthropic}\ncard ${card}\nAWS_KEY=${K.awsSecret}`);
  const blob = JSON.stringify(findings);
  for (const full of [K.anthropic, K.awsSecret, card]) {
    assert.ok(!blob.includes(full), 'full value must never leak into output');
  }
  // previews carry at most the first 4 chars
  for (const f of findings) {
    assert.ok(f.preview.length < 60, `preview must stay short: ${f.preview}`);
  }
});

test('JSON: string leaves get JSON-path locations', () => {
  const findings = scanJsonValue({
    conversations: [
      { messages: [{ content: `my key is ${K.aws} be careful` }] },
    ],
  });
  const hit = of(findings, 'AUD01')[0];
  assert.ok(hit, 'key inside nested JSON detected');
  assert.match(hit.location, /\$\.conversations\[0\]\.messages\[0\]\.content/);
});

test('auditPath: directory walk, binary skip, counts', () => {
  const { dir, cleanup } = tmpCwd();
  try {
    fs.writeFileSync(path.join(dir, 'chat.json'), JSON.stringify({ m: `leaked ${K.openai} here` }));
    fs.writeFileSync(path.join(dir, 'notes.md'), 'card 4111 1111 1111 1111\n');
    fs.writeFileSync(path.join(dir, 'blob.bin'), Buffer.from([0x00, 0x01, 0x02, 0x00]));
    fs.mkdirSync(path.join(dir, 'sub'));
    fs.writeFileSync(path.join(dir, 'sub', '.env'), `STRIPE_SECRET_KEY=${K.stripe}\n`);
    const r = auditPath(dir);
    assert.equal(r.filesScanned, 4, '.bin counted but skipped');
    // AUD01 x2: the OpenAI key in chat.json AND the sk_live value inside the
    // .env line (both ARE api keys — the env-line additionally fires AUD08)
    assert.equal(r.counts.AUD01, 2);
    assert.equal(r.counts.AUD03, 1);
    assert.equal(r.counts.AUD08, 1);
    assert.ok(r.high >= 3);
    const skipped = r.results.find((x) => x.file.endsWith('blob.bin'));
    assert.equal(skipped.skipped, 'binary');
  } finally {
    cleanup();
  }
});

test('CLI: exit 1 on HIGH findings, 0 on clean, --airgap leaves no event', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    fs.writeFileSync(path.join(dir, 'dirty.md'), `my key ${K.openai} leaked\n`);
    fs.writeFileSync(path.join(dir, 'clean.md'), 'just a normal note about gardening\n');

    const dirty = await runCli(dir, ['audit', '--input', 'dirty.md', '--airgap']);
    assert.equal(dirty.code, 1);
    assert.match(dirty.stdout, /SECRETS PRESENT/);
    assert.match(dirty.stdout, /AUD01/);
    assert.ok(!dirty.stdout.includes(K.openai), 'raw key must never print');

    const clean = await runCli(dir, ['audit', '--input', 'clean.md', '--airgap']);
    assert.equal(clean.code, 0);
    assert.match(clean.stdout, /no high-severity findings/);

    // --airgap: no local state at all
    assert.ok(!fs.existsSync(path.join(dir, '.rugsnare')), 'airgap must not create local state');
  } finally {
    cleanup();
  }
});

test('CLI: default (non-airgap) logs count-only trace; --json is machine-readable', async () => {
  const { dir, cleanup } = tmpCwd();
  try {
    fs.writeFileSync(path.join(dir, 'dirty.md'), `AWS_SECRET_ACCESS_KEY=${K.awsSecret.slice(0, 8)}alue123\n`);
    const r = await runCli(dir, ['audit', '--input', 'dirty.md']);
    assert.equal(r.code, 1);
    const events = fs.readFileSync(path.join(dir, '.rugsnare', 'events.jsonl'), 'utf8');
    const evt = events.split('\n').filter(Boolean).map((l) => JSON.parse(l)).find((e) => e.kind === 'audit');
    assert.ok(evt, 'count-only event written without --airgap');
    assert.equal(evt.high, 1);
    assert.ok(!events.includes(K.awsSecret), 'event log must not contain the secret');

    fs.writeFileSync(path.join(dir, 'two.md'), 'card 4111 1111 1111 1111 and +1 (415) 555-0132\n');
    const j = await runCli(dir, ['audit', '--input', 'two.md', '--json', '--airgap']);
    const parsed = JSON.parse(j.stdout);
    assert.equal(parsed.high, 1);
    assert.equal(parsed.counts.AUD03, 1);
    assert.equal(parsed.counts.AUD07, 1);
  } finally {
    cleanup();
  }
});
