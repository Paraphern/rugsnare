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
