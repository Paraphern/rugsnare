import { dispatchHistoryScan, fetchHistoryResult, cleanPackageName } from './outbound.js';
import { normalizePackageInput } from './history-core.js';

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 10;
const rateBuckets = new Map(); // ip -> [timestamps]; isolate-local, best effort

function rateLimited(ip) {
  const now = Date.now();
  const hits = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  rateBuckets.set(ip, hits);
  return hits.length > RATE_MAX;
}

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', ...extraHeaders },
  });
}

export async function handleHistoryRun(request, env) {
  if (request.method !== 'POST') return jsonResponse({ error: 'POST only' }, 405);
  if (!env.GH_DISPATCH_TOKEN) return jsonResponse({ error: 'runtime scans are not configured (missing dispatch token)' }, 503);

  let body = {};
  try { body = JSON.parse(await request.text()); } catch { body = {}; }
  // users paste what their MCP config says ("npx -y server-name") — normalize first
  const pkg = cleanPackageName(normalizePackageInput(body.package));
  if (!pkg) return jsonResponse({ error: 'pass a valid npm package name' }, 400);

  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (rateLimited(ip)) return jsonResponse({ error: 'you have started 10 scans in the last 10 minutes - give it a couple of minutes. Scans run one at a time in a shared queue, so everyone gets a turn.' }, 429);

  let res;
  try {
    res = await dispatchHistoryScan(pkg, env.GH_DISPATCH_TOKEN);
  } catch (e) {
    // log the real reason for `wrangler tail`; the API answer stays generic
    console.error('dispatch failed:', e && e.stack ? e.stack : e);
    return jsonResponse({ error: 'could not reach GitHub - try again shortly' }, 500);
  }

  if (res.status === 204) return jsonResponse({ started: true, package: pkg }, 202);
  if (res.status === 401 || res.status === 403) return jsonResponse({ error: 'dispatch token rejected - rotate GH_DISPATCH_TOKEN' }, 502);
  if (res.status === 404) return jsonResponse({ error: 'dispatch endpoint not found - is the history-scan workflow on main?' }, 502);
  if (res.status === 422) return jsonResponse({ error: 'GitHub rejected the dispatch (no workflow with this event type on default branch?)' }, 502);
  return jsonResponse({ error: 'github dispatch responded ' + res.status }, 502);
}

export async function handleHistoryResult(request) {
  const url = new URL(request.url);
  const pkg = cleanPackageName(url.searchParams.get('package'));
  if (!pkg) return jsonResponse({ error: 'pass a valid npm package name' }, 400);
  let text;
  try {
    text = await fetchHistoryResult(pkg);
  } catch (e) {
    console.error('result fetch failed:', e && e.stack ? e.stack : e);
    return jsonResponse({ error: 'could not read the result - try again shortly' }, 502);
  }
  if (text === null) return jsonResponse({ status: 'pending' }, 200, { 'cache-control': 'no-store' });
  return new Response(text, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=60',
    },
  });
}
