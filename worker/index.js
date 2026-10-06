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

import { parseTar, extractContracts, diffContracts, sortVersions, validPackageName } from './history-core.js';
import { handleHistoryRun, handleHistoryResult } from './run.js';

const REGISTRY_HOST = 'registry.npmjs.org';
const LAST_N = 5;
const MAX_TARBALL = 5 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/history') return handleHistory(url, request);
    if (url.pathname === '/api/history-run') return handleHistoryRun(request, env);
    if (url.pathname === '/api/history-result') return handleHistoryResult(request);
    return env.ASSETS.fetch(request);
  },
};

async function handleHistory(url, request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'GET only' }, 405);
  }
  const pkg = (url.searchParams.get('package') ?? '').trim();
  if (!pkg || !validPackageName(pkg)) {
    return json({ error: 'pass a valid npm package name, e.g. @scope/server or my-mcp-server' }, 400);
  }

  try {
    const result = await scanHistory(pkg);
    return json(result, 200, { 'cache-control': 'public, max-age=3600' });
  } catch (e) {
    return json({ error: String(e && e.message ? e.message : e) }, 502);
  }
}

async function scanHistory(pkg) {
  // abbreviated metadata: versions + tarball urls, nothing else
  const meta = await fetchJson(`https://${REGISTRY_HOST}/${pkg}`, {
    accept: 'application/vnd.npm.install-v1+json',
  });
  const allVersions = Object.keys(meta.versions ?? {});
  if (allVersions.length === 0) throw new Error('no published versions');
  const chosen = sortVersions(allVersions).slice(-LAST_N);

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
    pairs.push({ from: usable[i - 1].version, to: usable[i].version, findings: diffContracts(older, newer) });
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
  const res = await fetch(u, { redirect: 'follow' });
  if (!res.ok) throw new Error(`tarball fetch ${res.status}`);
  const len = Number(res.headers.get('content-length') ?? 0);
  if (len > MAX_TARBALL) throw new Error('tarball too large for the static scan');

  const gz = await res.arrayBuffer();
  if (gz.byteLength > MAX_TARBALL) throw new Error('tarball too large for the static scan');
  const tarBytes = new Uint8Array(
    await new Response(new Response(gz).body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(),
  );

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
