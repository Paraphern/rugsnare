import { keccak256, selector } from './keccak.js';
import fs from 'node:fs';
import crypto from 'node:crypto';

/**
 * On-chain release verification against the RugSnare ReleaseLog contract
 * (contracts/releaselog/ReleaseLog.sol). The same integrity primitive we
 * sell for MCP tools, applied to our own releases.
 *
 * Network rules (hard requirements, not configurable):
 *  - https only
 *  - host must be a public DNS name — localhost, *.local, IP literals in
 *    loopback/private/link-local/reserved ranges are refused outright
 */

export const DEFAULT_RPCS = Object.freeze({
  base: 'https://mainnet.base.org',
  'base-sepolia': 'https://sepolia.base.org',
});

/** Deployed ReleaseLog contracts (immutable append-only pins). */
export const DEFAULT_CONTRACTS = Object.freeze({
  // Base Sepolia, deployed 2026-09-29, tx 0x51af00900781008967de8edd0c16b3ebd38d4d5b2f944cb32202089f83813955
  // genesis fingerprint published: 87289542A1FB9A9AEA60974BEEEAD3348C93D91E
  // pins 0.1.0-0.5.1 (history chain)
  'base-sepolia': '0x78406c32F2054C7DF91aD0A2C258Ad0936838B1e',
  // Base Mainnet, deployed 2026-10-04, tx 0xaa1a44fe8167ac6e8090900b833f58467d2422dd351604e6d2431be5ebb89d56
  // genesis fingerprint published: 87289542A1FB9A9AEA60974BEEEAD3348C93D91E
  // pins from 1.0.0 onward (operational chain)
  // same address as Sepolia: same sender + same nonce on both chains = same CREATE address
  base: '0x78406c32F2054C7DF91aD0A2C258Ad0936838B1e',
});

const PRIVATE_V4 = [
  { net: '0.0.0.0', mask: '0.0.0.0', bits: 8 },      // "this network"
  { net: '10.0.0.0', mask: '10.0.0.0', bits: 8 },     // private
  { net: '100.64.0.0', mask: '100.64.0.0', bits: 10 },// CGNAT
  { net: '127.0.0.0', mask: '127.0.0.0', bits: 8 },   // loopback
  { net: '169.254.0.0', mask: '169.254.0.0', bits: 16 }, // link-local
  { net: '172.16.0.0', mask: '172.16.0.0', bits: 12 },// private
  { net: '192.168.0.0', mask: '192.168.0.0', bits: 16 }, // private
  { net: '224.0.0.0', mask: '224.0.0.0', bits: 4 },   // multicast/reserved
];

function ipv4InCidr(ip, net, bits) {
  const toInt = (s) => s.split('.').reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (toInt(ip) & mask) === (toInt(net) & mask);
}

export function validateRpcUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`invalid URL: ${raw}`);
  }
  if (url.protocol !== 'https:') throw new Error('RPC URL must be https');
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error(`refusing non-public RPC host: ${host}`);
  }
  if (host.includes(':')) {
    // IPv6 literal — allow only global unicast 2000::/3 is too strict to
    // hand-roll here; refuse ALL v6 literals (default RPCs are DNS names).
    throw new Error('refusing IPv6-literal RPC host (use a DNS name)');
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    for (const range of PRIVATE_V4) {
      if (ipv4InCidr(host, range.net, range.bits)) {
        throw new Error(`refusing non-public RPC host: ${host}`);
      }
    }
  }
  return url;
}

const pad32 = (hex) => hex.padStart(64, '0');
const GET_RELEASE = selector('getRelease(bytes32)');

/** eth_call getRelease(versionKey) -> { artifactHash: hex(64), timestamp: Number } */
export async function fetchRelease({ rpc, contract, version }) {
  const url = validateRpcUrl(rpc);
  if (!/^0x[0-9a-fA-F]{40}$/.test(contract)) throw new Error('contract must be a 0x-address');
  const data = GET_RELEASE + pad32(keccak256(version));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'eth_call',
      params: [{ to: contract, data }, 'latest'],
    }),
  });
  if (!res.ok) throw new Error(`RPC ${url.hostname} responded ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`RPC error: ${json.error.message ?? JSON.stringify(json.error)}`);
  const hex = json.result;
  if (typeof hex !== 'string' || hex.length < 2 + 128) throw new Error('unexpected RPC result shape');
  const artifactHash = hex.slice(2, 66);
  const tsHex = hex.slice(66, 130);
  const timestamp = tsHex ? Number(BigInt('0x' + tsHex)) : 0;
  return { artifactHash, timestamp };
}

export function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** Compare a local artifact against the on-chain pin. Never throws on mismatch — returns a verdict. */
export async function verifyArtifact({ file, rpc, contract, version }) {
  const local = sha256File(file);
  let onchain;
  try {
    onchain = await fetchRelease({ rpc, contract, version });
  } catch (err) {
    return { verdict: 'error', reason: err.message, local };
  }
  if (onchain.artifactHash === '0'.repeat(64) || Number(onchain.timestamp) === 0) {
    return { verdict: 'unpinned', reason: `version "${version}" is not pinned on-chain`, local };
  }
  const match = onchain.artifactHash.toLowerCase() === local;
  return {
    verdict: match ? 'verified' : 'tampered',
    local,
    onchain: onchain.artifactHash,
    pinnedAt: new Date(onchain.timestamp * 1000).toISOString(),
  };
}
