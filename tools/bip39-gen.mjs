// One-off generator: wraps the verified BIP-39 English wordlist into an ES
// module. Input: /tmp/bip39-a.txt (fetched from bitcoin/bips and cross-checked
// byte-for-byte against trezor/python-mnemonic; sha256
// 2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda).
// Output: product/src/bip39-words.js
import fs from 'node:fs';

const src = fs.readFileSync('C:/GlobalWork/bip39-canonical.tmp.txt', 'utf8');
const words = src.trim().split('\n').map((w) => w.trim()).filter(Boolean);
if (words.length !== 2048) throw new Error(`expected 2048 words, got ${words.length}`);
if (new Set(words).size !== 2048) throw new Error('duplicate words in list');

const out = `/**
 * BIP-39 English wordlist (2048 words), embedded for zero-dep seed-phrase
 * detection in the audit scanner. Source: bitcoin/bips bip-0039/english.txt,
 * cross-checked byte-for-byte against trezor/python-mnemonic's copy.
 * sha256 of the canonical word-per-line file:
 * 2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda
 */
export const BIP39_WORDS = new Set([
${words.map((w) => `  '${w}',`).join('\n')}
]);
export const BIP39_COUNT = BIP39_WORDS.size;
`;
fs.writeFileSync('C:/GlobalWork/product/src/bip39-words.js', out);
console.log('written:', words.length, 'words; first:', words[0], '; last:', words[2047]);
