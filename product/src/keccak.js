// Minimal Keccak-256 (Ethereum flavor, pre-NIST padding), zero dependencies.
// Correctness is pinned by known test vectors in test/keccak.test.js
// (keccak256("") and keccak256("abc")); if those pass, the permutation is
// right and runtime-computed function selectors are trustworthy.

const ROUND_CONSTANTS = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];

// Rotation offsets r[x][y]
const RHO = [
  [0n, 36n, 3n, 41n, 18n],
  [1n, 44n, 10n, 45n, 2n],
  [62n, 6n, 43n, 15n, 61n],
  [28n, 55n, 25n, 21n, 56n],
  [27n, 20n, 39n, 8n, 14n],
];

const MASK = (1n << 64n) - 1n;
const rot = (lane, n) => ((lane << n) | (lane >> (64n - n))) & MASK;

function keccakF(A) {
  for (let round = 0; round < 24; round++) {
    // theta
    const C = [];
    for (let x = 0; x < 5; x++) C[x] = A[x][0] ^ A[x][1] ^ A[x][2] ^ A[x][3] ^ A[x][4];
    const D = [];
    for (let x = 0; x < 5; x++) D[x] = C[(x + 4) % 5] ^ rot(C[(x + 1) % 5], 1n);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) A[x][y] ^= D[x];
    // rho + pi
    const B = Array.from({ length: 5 }, () => new Array(5).fill(0n));
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        B[y][(2 * x + 3 * y) % 5] = rot(A[x][y], RHO[x][y]);
      }
    }
    // chi
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        A[x][y] = B[x][y] ^ (~B[(x + 1) % 5][y] & B[(x + 2) % 5][y]) & MASK;
      }
    }
    // iota
    A[0][0] ^= ROUND_CONSTANTS[round];
  }
  return A;
}

const RATE = 136; // bytes, Keccak-256

export function keccak256(input) {
  const msg = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);

  // Keccak padding: 0x01 ... 0x80 (single 0x81 byte if it fits in one block)
  const padded = Buffer.alloc(Math.ceil((msg.length + 1) / RATE) * RATE);
  padded.set(msg);
  padded[msg.length] = 0x01;
  padded[padded.length - 1] |= 0x80;

  // state A[x][y], absorb blocks lane by lane (index i = x + 5y)
  const A = Array.from({ length: 5 }, () => new Array(5).fill(0n));
  for (let block = 0; block < padded.length; block += RATE) {
    for (let i = 0; i < RATE / 8; i++) {
      const lane = padded.readBigUInt64LE(block + i * 8);
      const x = i % 5;
      const y = Math.floor(i / 5);
      A[x][y] ^= lane;
    }
    keccakF(A);
  }

  // squeeze 32 bytes
  const out = Buffer.alloc(32);
  for (let i = 0; i < 4; i++) {
    out.writeBigUInt64LE(A[i % 5][Math.floor(i / 5)], i * 8);
  }
  return out.toString('hex');
}

/** First 4 bytes of keccak256 of a signature, as 0x-prefixed hex — the Solidity function selector. */
export function selector(signature) {
  return '0x' + keccak256(signature).slice(0, 8);
}
