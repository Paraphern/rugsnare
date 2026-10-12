import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateRpcUrl, sha256File } from '../src/onchain.js';

test('validateRpcUrl accepts the default public RPCs', () => {
  for (const rpc of Object.values({ base: 'https://mainnet.base.org' })) {
    validateRpcUrl(rpc); // must not throw
  }
});

test('validateRpcUrl refuses http, localhost, .local, private and reserved hosts', () => {
  const refused = [
    'http://mainnet.base.org',            // not https
    'https://localhost',
    'https://rpc.localhost',
    'https://my-rpc.local',
    'https://rpc.internal',
    'https://127.0.0.1',
    'https://10.1.2.3',
    'https://172.16.0.5',
    'https://192.168.1.10',
    'https://169.254.169.254',            // cloud metadata
    'https://100.64.0.1',                 // CGNAT
    'https://0.0.0.0',
    'https://224.0.0.1',                  // multicast
    'https://[2001:db8::1]',              // v6 literal
    'not a url',
  ];
  for (const url of refused) {
    assert.throws(() => validateRpcUrl(url), { message: /refus|https|invalid/i }, url);
  }
});

test('validateRpcUrl accepts a public IPv4-literal (rare but legitimate)', () => {
  validateRpcUrl('https://1.1.1.1'); // must not throw
});

test('sha256File hashes file content correctly (vs independent crypto)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-oc-'));
  try {
    const file = path.join(dir, 'artifact.bin');
    fs.writeFileSync(file, 'rugsnare');
    const expected = crypto.createHash('sha256').update('rugsnare').digest('hex');
    assert.equal(sha256File(file), expected);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// 1.0.1 promised "verify defaults to Base Mainnet"; the default was left on
// sepolia, so a bare `verify` queried the TEST chain and every real release
// answered "not pinned" (found verifying 1.3.0 itself). Discriminator: 0.5.1
// is pinned ONLY on sepolia - on mainnet the answer must be "not pinned",
// while a sepolia default would return VERIFIED or a hash MISMATCH.
test('bare verify defaults to Base Mainnet, not sepolia (1.0.1 contract)', async () => {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-vd-'));
  try {
    const file = path.join(dir, 'rugsnare-0.5.1.tgz');
    fs.writeFileSync(file, 'not the real artifact - message is what matters');
    const { fileURLToPath } = await import('node:url');
    const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js');
    let out = '';
    try {
      const r = await run(process.execPath, [cli, 'verify', file, '--version', '0.5.1'], { timeout: 30000 });
      out = r.stdout + r.stderr;
    } catch (e) {
      // exit 2 = "not pinned" is a legitimate CLI outcome; capture its output
      out = (e.stdout ?? '') + (e.stderr ?? '') + (e.message ?? '');
    }
    assert.match(out, /not pinned/i, 'mainnet has no 0.5.1 pin');
    assert.doesNotMatch(out, /VERIFIED|MISMATCH/i, 'sepolia would have answered about the pin');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
