import https from 'node:https';
import http from 'node:http';

/**
 * HTTP-based MCP client (Streamable HTTP transport, spec 2025-06-18).
 * Zero-dep: uses node:https only. Supports both JSON and SSE responses.
 *
 * Used by `rugsnare scan/diff` for servers configured as:
 *   { "type": "http", "url": "https://...", "headers": { ... } }
 *
 * The handshake follows the MCP Streamable HTTP spec:
 *   1. POST initialize → server returns session info (+ optional Mcp-Session-Id header)
 *   2. POST notifications/initialized (may be 202 Accepted)
 *   3. POST tools/list → server returns tools (JSON or SSE)
 */

const DEFAULT_TIMEOUT = 15000;

/**
 * Resolve ${VAR} placeholders in URLs using environment variables.
 * ZCode and other platforms use ${ZCODE_BASE_URL}/path — we substitute from
 * process.env, and from the config's own env block if provided.
 */
function resolveUrl(url, extraEnv = {}) {
  return url.replace(/\$\{(\w+)\}/g, (match, varName) => {
    const v = extraEnv[varName] ?? process.env[varName];
    return v !== undefined ? v : match; // leave unresolved placeholders as-is
  });
}
/**
 * Send a single JSON-RPC request over HTTP POST and parse the response.
 * Handles both `application/json` and `text/event-stream` responses.
 * Returns the parsed JSON-RPC result object.
 */
export function httpRpc({ url, headers = {}, message, timeoutMs = DEFAULT_TIMEOUT, sessionId, env = {} }) {
  return new Promise((resolve, reject) => {
    const u = new URL(resolveUrl(url, env));
    const mod = u.protocol === 'https:' ? https : http;

    const body = JSON.stringify(message);
    const reqHeaders = {
      'content-type': 'application/json',
      'accept': 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-06-18',
      ...headers,
    };
    if (sessionId) reqHeaders['mcp-session-id'] = sessionId;

    const req = mod.request(u, {
      method: 'POST',
      headers: reqHeaders,
      timeout: timeoutMs,
    }, (res) => {
      // capture session id from response headers
      const sid = res.headers['mcp-session-id'];

      if (res.statusCode === 202) {
        // Accepted (notification) — no body expected
        res.resume();
        resolve({ accepted: true, sessionId: sid });
        return;
      }

      if (res.statusCode !== 200) {
        let err = '';
        let errSettled = false;
        res.on('data', (c) => {
          err += c;
          if (err.length > 1000) {
            req.destroy();
            if (!errSettled) { errSettled = true; reject(new Error(`HTTP ${res.statusCode}: ${err.slice(0, 200)}`)); }
          }
        });
        res.on('end', () => {
          if (errSettled) return;
          errSettled = true;
          // try to surface the JSON-RPC error message if present
          try {
            const parsed = JSON.parse(err);
            if (parsed.error?.message) {
              reject(new Error(`HTTP ${res.statusCode}: ${parsed.error.message}`));
              return;
            }
          } catch { /* not JSON — fall through */ }
          reject(new Error(`HTTP ${res.statusCode}: ${err.slice(0, 200)}`));
        });
        res.on('close', () => {
          if (!errSettled) { errSettled = true; reject(new Error(`HTTP ${res.statusCode}: connection closed`)); }
        });
        return;
      }

      const contentType = res.headers['content-type'] || '';
      let raw = '';
      let settled = false;
      const settle = (fn, value) => { if (!settled) { settled = true; fn(value); } };

      res.on('data', (c) => {
        raw += c;
        if (raw.length > 5 * 1024 * 1024) {
          req.destroy();
          settle(reject, new Error('response body exceeded 5MB limit'));
        }
      });
      res.on('aborted', () => settle(reject, new Error('response aborted mid-body')));
      res.on('close', () => settle(reject, new Error('response closed before completion')));
      res.on('end', () => {
        try {
          if (contentType.includes('text/event-stream')) {
            // SSE: find the data line whose JSON-RPC id matches our request
            const lines = raw.split('\n').filter((l) => l.startsWith('data:'));
            const wantId = message.id;
            for (let i = lines.length - 1; i >= 0; i--) {
              const json = lines[i].slice(5).trim();
              if (!json) continue;
              try {
                const parsed = JSON.parse(json);
                if (wantId !== undefined && parsed.id === wantId) {
                  settle(resolve, { ...parsed, sessionId: sid });
                  return;
                }
                // if no id match, take the last parseable one as fallback
                if (i === 0 || lines.length === 1) {
                  settle(resolve, { ...parsed, sessionId: sid });
                  return;
                }
              } catch { /* not JSON — skip line */ }
            }
            settle(reject, new Error('SSE response contained no matching data lines'));
          } else {
            // Plain JSON
            settle(resolve, { ...JSON.parse(raw), sessionId: sid });
          }
        } catch (e) {
          settle(reject, new Error(`parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`HTTP timeout after ${timeoutMs}ms`)); });
    req.write(body);
    req.end();
  });
}

/**
 * Fetch tools from an HTTP-based MCP server.
 * Same return shape as rpc.js fetchTools: { tools, prompts, resources }.
 */
export async function fetchToolsHttp({ url, headers = {}, timeoutMs = DEFAULT_TIMEOUT, env = {}, clientName = 'rugsnare' }) {
  const resolvedUrl = resolveUrl(url, env);
  let sessionId;

  // 1. initialize
  const init = await httpRpc({
    url: resolvedUrl, headers, timeoutMs, env,
    message: {
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: clientName, version: '1' },
      },
    },
  });
  if (init.error) throw new Error(`initialize failed: ${JSON.stringify(init.error)}`);
  sessionId = init.sessionId;

  // 2. notifications/initialized (fire and forget)
  await httpRpc({
    url: resolvedUrl, headers, timeoutMs, sessionId, env,
    message: { jsonrpc: '2.0', method: 'notifications/initialized' },
  }).catch(() => {}); // some servers return 202, some don't care

  // 3. tools/list (with pagination)
  const tools = [];
  let cursor;
  let pages = 0;
  do {
    const list = await httpRpc({
      url: resolvedUrl, headers, timeoutMs, sessionId, env,
      message: {
        jsonrpc: '2.0', id: 2 + pages, method: 'tools/list',
        params: cursor === undefined ? {} : { cursor },
      },
    });
    if (list.error) throw new Error(`tools/list failed: ${JSON.stringify(list.error)}`);
    const r = list.result ?? {};
    if (Array.isArray(r.tools)) tools.push(...r.tools);
    cursor = typeof r.nextCursor === 'string' && r.nextCursor ? r.nextCursor : undefined;
  } while (cursor !== undefined && ++pages < 100);

  // 4. prompts/list (optional — not all servers support it)
  let prompts = [];
  try {
    const pr = await httpRpc({
      url: resolvedUrl, headers, timeoutMs, sessionId, env,
      message: { jsonrpc: '2.0', id: 100, method: 'prompts/list', params: {} },
    });
    if (pr?.result?.prompts) prompts = pr.result.prompts;
  } catch { /* not supported — fine */ }

  // 5. resources/list (optional)
  let resources = [];
  try {
    const rr = await httpRpc({
      url: resolvedUrl, headers, timeoutMs, sessionId, env,
      message: { jsonrpc: '2.0', id: 101, method: 'resources/list', params: {} },
    });
    if (rr?.result?.resources) resources = rr.result.resources;
  } catch { /* not supported — fine */ }

  return { tools, prompts, resources };
}
