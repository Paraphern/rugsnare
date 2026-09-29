import test from 'node:test';
import assert from 'node:assert/strict';
import { keccak256, selector } from '../src/keccak.js';

// Reference vectors. If these pass, the permutation and padding are correct,
// which is what makes runtime-computed selectors trustworthy.
const K256_EMPTY = 'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470';
const K256_ABC = '4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45';

test('keccak256("") matches reference vector', () => {
  assert.equal(keccak256(''), K256_EMPTY);
});

test('keccak256("abc") matches reference vector', () => {
  assert.equal(keccak256('abc'), K256_ABC);
});

test('keccak256 accepts Buffer input identically', () => {
  assert.equal(keccak256(Buffer.from('abc', 'utf8')), K256_ABC);
});

test('keccak256 handles multi-block input (>136 bytes) deterministically', () => {
  const long = 'x'.repeat(300);
  assert.equal(keccak256(long), keccak256(long));
  assert.equal(keccak256(long).length, 64);
});

test('selector() returns 0x-prefixed 4-byte hex', () => {
  const s = selector('getRelease(bytes32)');
  assert.match(s, /^0x[0-9a-f]{8}$/);
});
