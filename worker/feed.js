// Public feed of the latest runtime scans.
//
// Runtime scans commit their results to the public `scans` branch by
// design — so the feed is just the last commits of that branch. Nothing is
// logged additionally: what you see is exactly what git already holds.
// Static (instant) checks are NOT included: recording them would mean
// logging every visitor's queries, which we do not do.

import { parseScanCommit } from './history-core.js';
import { guardFetch } from './outbound.js';

const COMMITS_URL = 'https://api.github.com/repos/Paraphern/rugsnare/commits?sha=scans&per_page=10';
const CACHE_TTL_MS = 60 * 1000;

let cache = { at: 0, entries: [] };

export async function handleHistoryFeed(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(JSON.stringify({ error: 'GET only' }), { status: 405, headers: { 'content-type': 'application/json' } });
  }
  if (!env.GH_DISPATCH_TOKEN) {
    return new Response(JSON.stringify({ error: 'feed is not configured' }), { status: 503, headers: { 'content-type': 'application/json' } });
  }

  const now = Date.now();
  if (cache.at && now - cache.at < CACHE_TTL_MS && cache.entries.length > 0) {
    return feedResponse(cache.entries, true);
  }

  try {
    const res = await guardFetch(COMMITS_URL, {
      headers: {
        authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'rugsnare-history',
      },
    });
    if (!res.ok) throw new Error(`github responded ${res.status}`);
    const commits = await res.json();
    const entries = commits.map(parseScanCommit).filter(Boolean).slice(0, 10);
    cache = { at: now, entries };
    return feedResponse(entries, false);
  } catch (e) {
    console.error('feed failed:', e && e.stack ? e.stack : e);
    // stale cache beats an error page
    if (cache.entries.length > 0) return feedResponse(cache.entries, true);
    return new Response(JSON.stringify({ error: 'feed unavailable - try again shortly' }), { status: 502, headers: { 'content-type': 'application/json' } });
  }
}

function feedResponse(entries, cached) {
  return new Response(JSON.stringify({ entries, cached }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=30',
    },
  });
}
