// RugSnare site worker: static assets + history endpoints.
//
// /api/history        GET  — static scan (tarballs parsed, nothing executed)
// /api/history-run    POST — dispatch a runtime-exact scan to GitHub Actions
// /api/history-result GET  — poll the published runtime result
//
// All outbound traffic lives in outbound.js (https-only, fixed-host
// allowlist) and every package name crossing into a request is rebuilt
// from a strict npm-name whitelist. The runtime side (actually starting
// each version) runs in an ephemeral GitHub Actions runner — never here.

import { parseTar, extractContracts, diffContracts, sortVersions, validPackageName, parseGitHubRepo, semverTag, normalizePackageInput } from './history-core.js';
import { handleHistoryRun, handleHistoryResult } from './run.js';
import { handleHistoryFeed } from './feed.js';

const REGISTRY_HOST = 'registry.npmjs.org';
const LAST_N = 5;
const MAX_TARBALL = 5 * 1024 * 1024;
const MAX_UNPACKED = 32 * 1024 * 1024; // decompression-bomb guard

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/history') return handleHistory(url, request, env);
    if (url.pathname === '/api/history-run') return handleHistoryRun(request, env);
    if (url.pathname === '/api/history-result') return handleHistoryResult(request);
    if (url.pathname === '/api/history-feed') return handleHistoryFeed(request, env);
    return env.ASSETS.fetch(request);
  },
};

async function handleHistory(url, request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'GET only' }, 405);
  }
  // users paste what their MCP config says ("npx -y server-name") — normalize
  const raw = normalizePackageInput(url.searchParams.get('package') ?? url.searchParams.get('repo') ?? '');
  const repo = raw ? parseGitHubRepo(raw) : null;
  if (repo && !validPackageName(raw)) {
    return handleGitHubHistory(repo, env);
  }
  if (!raw || !validPackageName(raw)) {
    return json({ error: 'pass a valid npm package name or a github.com repo URL' }, 400);
  }

  try {
    const result = await scanHistory(raw);
    return json(result, 200, { 'cache-control': 'public, max-age=3600' });
  } catch (e) {
    // log the real reason for `wrangler tail`; the API answer stays generic
    console.error('history scan failed:', e && e.stack ? e.stack : e);
    return json({ error: 'scan failed — the package may be unreachable or malformed' }, 502);
  }
}

/**
 * Static history scan over a GitHub repo's semver tags: each tag's SOURCE
 * tarball is parsed (nothing executed) and contracts are diffed tag to tag.
 * Sources ≠ built npm dist: TypeScript literals are caught, but runtime-
 * generated tools are invisible — the runtime scan stays npm-only.
 */
async function handleGitHubHistory(repo, env) {
  try {
    const result = await scanGitHubHistory(repo, env);
    return json(result, 200, { 'cache-control': 'public, max-age=3600' });
  } catch (e) {
    console.error('github scan failed:', e && e.stack ? e.stack : e);
    return json({ error: 'scan failed — the repo may be unreachable, private, or have no semver tags' }, 502);
  }
}

async function scanGitHubHistory(repo, env) {
  // fixed hosts only: api.github.com for tags, codeload for source tarballs
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': 'rugsnare-history',
    ...(env.GH_DISPATCH_TOKEN ? { authorization: `Bearer ${env.GH_DISPATCH_TOKEN}` } : {}),
  };
  const tagsRes = await fetch(`https://api.github.com/repos/${repo}/tags?per_page=100`, { headers });
  if (tagsRes.status === 404) throw new Error('repo not found (or private)');
  if (!tagsRes.ok) throw new Error(`github responded ${tagsRes.status}`);
  const tags = await tagsRes.json();
  const seen = new Set();
  const versioned = [];
  for (const t of tags) {
    const v = semverTag(t.name);
    if (v && !seen.has(v)) { seen.add(v); versioned.push({ tag: t.name, version: v }); }
  }
  if (versioned.length < 2) throw new Error('fewer than 2 semver tags published');
  versioned.sort((a, b) => {
    const ka = a.version.split('.').map(Number);
    const kb = b.version.split('.').map(Number);
    for (let i = 0; i < 3; i++) { if (ka[i] !== kb[i]) return ka[i] - kb[i]; }
    return 0;
  });
  const chosen = versioned.slice(-LAST_N);

  const contracts = [];
  for (const { tag } of chosen) {
    try {
      const map = await contractsOfGitHubTag(repo, tag);
      contracts.push({ tag, tools: Object.fromEntries(map) });
    } catch (e) {
      contracts.push({ tag, error: String(e && e.message ? e.message : e) });
    }
  }

  const usable = contracts.filter((c) => c.tools);
  const pairs = [];
  for (let i = 1; i < usable.length; i++) {
    const older = new Map(Object.entries(usable[i - 1].tools));
    const newer = new Map(Object.entries(usable[i].tools));
    pairs.push({ from: usable[i - 1].tag, to: usable[i].tag, toPublishedAt: null, findings: diffContracts(older, newer) });
  }
  // honesty guard: a scan that found ZERO tool definitions in the sources
  // must not read as "clean" — it means the extractor is blind to this repo
  const contractsFound = usable.reduce((n, c) => Math.max(n, Object.keys(c.tools).length), 0);

  return {
    package: repo,
    source: 'github',
    scanned: usable.length,
    planned: chosen.length,
    pairs,
    contractsFound,
    silentChanges: pairs.reduce((n, p) => n + p.findings.length, 0),
    note: 'static scan of the repo source at each semver tag; runtime-exact scanning (actually starting every version) is npm-only — if this repo publishes to npm, run the Runtime scan on the package',
    poweredBy: 'https://rugsnare.com',
  };
}

async function contractsOfGitHubTag(repo, tag) {
  const u = new URL(`https://codeload.github.com/${repo}/tar.gz/refs/tags/${encodeURIComponent(tag)}`);
  if (u.hostname !== 'codeload.github.com') throw new Error('refusing non-codeload host');
  const res = await fetch(u);
  if (!res.ok) throw new Error(`source tarball fetch ${res.status}`);
  const gz = await res.arrayBuffer();
  if (gz.byteLength > MAX_TARBALL) throw new Error('source tarball too large for the static scan');
  const tarBytes = new Uint8Array(
    await new Response(new Response(gz).body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(),
  );
  if (tarBytes.length > MAX_UNPACKED) throw new Error('source tarball unpacks beyond the size cap');
  // source tarballs are rooted at "<repo>-<tag>/": strip it, keep code files;
  // demo/corpus fixtures are excluded — they define fake tools for tests
  const files = parseTar(tarBytes)
    .map((f) => ({ ...f, path: f.path.replace(/^[^/]+\//, '') }))
    .filter((f) => !/(^|\/)(node_modules|\.git|test|tests|__tests__|corpus|fixtures|examples?|demo)(\/|$)/i.test(f.path));
  return extractContracts(files);
}

async function scanHistory(pkg) {
  // full metadata (not the abbreviated install doc): only it carries the
  // per-version publish timestamps in `time`
  const meta = await fetchJson(`https://${REGISTRY_HOST}/${pkg}`);
  const allVersions = Object.keys(meta.versions ?? {});
  if (allVersions.length === 0) throw new Error('no published versions');
  const chosen = sortVersions(allVersions).slice(-LAST_N);
  const time = meta.time ?? {};

  const contracts = [];
  for (const v of chosen) {
    const tarball = meta.versions[v]?.dist?.tarball;
    if (!tarball) { contracts.push({ version: v, error: 'no tarball url' }); continue; }
    try {
      const map = await contractsOfTarball(tarball);
      contracts.push({ version: v, tools: Object.fromEntries(map) });
    } catch (e) {
      contracts.push({ version: v, error: String(e && e.message ? e.message : e) });
    }
  }

  const usable = contracts.filter((c) => c.tools);
  const pairs = [];
  for (let i = 1; i < usable.length; i++) {
    const older = new Map(Object.entries(usable[i - 1].tools));
    const newer = new Map(Object.entries(usable[i].tools));
    pairs.push({ from: usable[i - 1].version, to: usable[i].version, toPublishedAt: time[usable[i].version] ?? null, findings: diffContracts(older, newer) });
  }

  return {
    package: pkg,
    scanned: usable.length,
    planned: chosen.length,
    pairs,
    silentChanges: pairs.reduce((n, p) => n + p.findings.length, 0),
    note: 'static scan: reads published tarballs without running any code; tools assembled at runtime are invisible to it — the Runtime scan button (GitHub Actions sandbox) or "rugsnare history" (CLI) covers those',
    poweredBy: 'https://rugsnare.com',
  };
}

async function contractsOfTarball(tarballUrl) {
  const u = new URL(tarballUrl);
  if (u.hostname !== REGISTRY_HOST) throw new Error(`refusing non-registry host: ${u.hostname}`);
  // manual redirects: every hop must stay on the registry (review 34)
  let res = await fetch(u, { redirect: 'manual' });
  for (let hop = 0; res.status >= 300 && res.status < 400 && hop < 3; hop++) {
    const loc = res.headers.get('location');
    if (!loc) throw new Error('redirect without location');
    const next = new URL(loc, u);
    if (next.hostname !== REGISTRY_HOST) throw new Error(`redirect leaves the registry: ${next.hostname}`);
    res = await fetch(next, { redirect: 'manual' });
  }
  if (!res.ok) throw new Error(`tarball fetch ${res.status}`);
  const len = Number(res.headers.get('content-length') ?? 0);
  if (len > MAX_TARBALL) throw new Error('tarball too large for the static scan');

  const gz = await res.arrayBuffer();
  if (gz.byteLength > MAX_TARBALL) throw new Error('tarball too large for the static scan');
  const tarBytes = new Uint8Array(
    await new Response(new Response(gz).body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(),
  );
  // decompression-bomb guard (review 34)
  if (tarBytes.length > MAX_UNPACKED) throw new Error('tarball unpacks beyond the size cap');

  const files = parseTar(tarBytes).filter((f) => f.path.startsWith('package/'));
  return extractContracts(files);
}

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers });
  if (res.status === 404) throw new Error('package not found on npm');
  if (!res.ok) throw new Error(`registry responded ${res.status}`);
  return res.json();
}

function json(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', ...extraHeaders },
  });
}
