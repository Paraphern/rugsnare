// Public archive of runtime scans — the dedicated /scans page reads this.
//
// Runtime scans commit their results to the public `scans` branch by
// design, with the summary in the commit message ("359c/10v"). The archive
// is therefore just that branch's commit log, paginated; expanding a row
// lazily fetches the full result JSON. Static (instant) checks never
// existed as records — runtime only, by design.

import { parseScanCommit } from './history-core.js';
import { guardFetch } from './outbound.js';

const ARCHIVE_URL = 'https://api.github.com/repos/Paraphern/rugsnare/commits?sha=scans&per_page=30';
const CACHE_TTL_MS = 60 * 1000;

const pageCache = new Map(); // page -> {at, entries}

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', ...extraHeaders },
  });
}

export async function handleHistoryArchive(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return jsonResponse({ error: 'GET only' }, 405);
  }
  if (!env.GH_DISPATCH_TOKEN) {
    return jsonResponse({ error: 'archive is not configured' }, 503);
  }
  const page = Math.max(1, Math.min(20, Number(new URL(request.url).searchParams.get('page')) || 1));

  const cached = pageCache.get(page);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return jsonResponse({ page, entries: cached.entries, cached: true });
  }

  try {
    const res = await guardFetch(`${ARCHIVE_URL}&page=${page}`, {
      headers: {
        authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'rugsnare-history',
      },
    });
    if (!res.ok) throw new Error(`github responded ${res.status}`);
    const commits = await res.json();
    const entries = commits.map(parseScanCommit).filter(Boolean);
    pageCache.set(page, { at: Date.now(), entries });
    // the branch carries the repo's history below the scan commits: keep
    // paginating only while scans actually appear on the page
    return jsonResponse({ page, entries, hasMore: commits.length === 30 && entries.length > 0 });
  } catch (e) {
    console.error('archive failed:', e && e.stack ? e.stack : e);
    const stale = pageCache.get(page);
    if (stale) return jsonResponse({ page, entries: stale.entries, cached: true });
    return jsonResponse({ error: 'archive unavailable - try again shortly' }, 502);
  }
}
