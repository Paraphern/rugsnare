// All outbound traffic of the runtime-scan feature lives here. Every entry
// point re-validates its inputs against the npm-name whitelist and every
// request goes through guardFetch, which only allows https to three fixed
// hosts. Nothing from a request ever reaches a URL: package names travel
// in request BODIES only, after whitelist reconstruction.

import { packageSlug } from './history-core.js';

const GH_DISPATCH_URL = 'https://api.github.com/repos/Paraphern/rugsnare/dispatches';
const GH_RAW_RESULTS = 'https://raw.githubusercontent.com/Paraphern/rugsnare/main/scans/history/';
const OUTBOUND_HOSTS = new Set(['api.github.com', 'raw.githubusercontent.com', 'registry.npmjs.org']);
const NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;

/** Whitelist reconstruction: returns a clean copy, or null. */
export function cleanPackageName(raw) {
  const s = String(raw ?? '').trim();
  const m = s.match(NAME_RE);
  return m ? m[0] : null;
}

async function guardFetch(url, init) {
  const u = new URL(url);
  if (u.protocol !== 'https:' || !OUTBOUND_HOSTS.has(u.hostname)) {
    throw new Error(`outbound host not allowed: ${u.hostname}`);
  }
  return fetch(u.href, init);
}

/**
 * Ask GitHub to run one sandboxed history scan (repository_dispatch).
 * Returns the raw Response for the caller to map to status codes.
 */
export async function dispatchHistoryScan(rawName, token) {
  const pkg = cleanPackageName(rawName);
  if (!pkg) throw new Error('invalid package name');
  return guardFetch(GH_DISPATCH_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
      'user-agent': 'rugsnare-history',
    },
    body: JSON.stringify({ event_type: 'history-scan', client_payload: { package: pkg, slug: packageSlug(pkg) } }),
  });
}

/**
 * Fetch the published result JSON for a package (or null while the scan
 * has not landed yet).
 */
export async function fetchHistoryResult(rawName) {
  const pkg = cleanPackageName(rawName);
  if (!pkg) throw new Error('invalid package name');
  const res = await guardFetch(GH_RAW_RESULTS + encodeURIComponent(packageSlug(pkg)) + '.json');
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`result fetch ${res.status}`);
  return res.text();
}
