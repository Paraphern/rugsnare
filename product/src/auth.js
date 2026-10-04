import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Auth passthrough: resolve authentication for MCP servers from config,
 * environment variables, and platform-specific credential stores.
 *
 * Config formats supported:
 *   { "auth": { "type": "bearer", "token": "..." } }
 *   { "auth": { "type": "bearer", "token": "${MY_TOKEN}" } }  // env var
 *   { "auth": { "type": "apiKey", "header": "X-API-Key", "value": "..." } }
 *   { "headers": { "Authorization": "Bearer ..." } }
 *   { "auth": { "type": "zcode_official" } }  // reads ZCode JWT from env or credentials
 *
 * Priority: explicit headers > auth config > platform-specific > no auth
 */

function resolveEnvVars(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\$\{(\w+)\}/g, (match, name) => {
    const v = process.env[name];
    return v !== undefined ? v : match;
  });
}

/**
 * Try to read the ZCode JWT token from environment or (best-effort) credentials store.
 * The credentials.json stores values encrypted with enc:v1: — we check for
 * a plain env var first, then document the manual path.
 */
function getZcodeToken() {
  // 1. Environment variable (recommended path)
  if (process.env.ZCODE_JWT_TOKEN) return process.env.ZCODE_JWT_TOKEN;
  if (process.env.ZCODE_JWT) return process.env.ZCODE_JWT;

  // 2. Plain text credential file (some setups)
  try {
    const credPath = path.join(os.homedir(), '.zcode', 'v2', 'credentials.json');
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    const raw = creds['zcodejwttoken'];
    if (raw && !raw.startsWith('enc:')) return raw;
  } catch { /* not found or encrypted */ }

  return null;
}

/**
 * Build HTTP headers from a server's auth config.
 * Returns an object of headers to merge into the request.
 */
export function resolveAuth(entry) {
  const headers = {};

  // 1. Explicit headers in config (highest priority)
  if (entry.headers && typeof entry.headers === 'object') {
    for (const [k, v] of Object.entries(entry.headers)) {
      headers[k] = resolveEnvVars(v);
    }
  }

  // 2. Auth shorthand in config
  const auth = entry.auth;
  if (auth && typeof auth === 'object') {
    if (auth.type === 'bearer' && auth.token) {
      const token = resolveEnvVars(auth.token);
      if (!headers.Authorization) headers.Authorization = `Bearer ${token}`;
    } else if (auth.type === 'apiKey' && auth.value) {
      const headerName = auth.header || 'X-API-Key';
      if (!headers[headerName]) headers[headerName] = resolveEnvVars(auth.value);
    } else if (auth.type === 'zcode_official' || auth.provider === 'jwt_token') {
      const token = getZcodeToken();
      if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
      else if (!token && !headers.Authorization) {
        process.stderr.write('[rugsnare] AUTH: ZCode JWT not found (ZCODE_JWT_TOKEN unset and credentials are encrypted or absent) — request will go out unauthenticated\n');
      }
    }
  }

  // unresolved ${VAR} placeholders mean the env var is unset — the header
  // would go out with a LITERAL "${...}" and fail with a confusing 401.
  // Say so now, with the variable NAME (never the value) (review 28, P2).
  for (const [k, v] of Object.entries(headers)) {
    if (typeof v === 'string') {
      const unresolved = v.match(/\$\{([A-Za-z0-9_]+)\}/g);
      if (unresolved) {
        process.stderr.write(`[rugsnare] AUTH: header "${k}" still contains unresolved placeholder(s) ${unresolved.join(', ')} — set the variable or remove the header; the request will likely fail auth\n`);
      }
    }
  }

  return headers;
}

/**
 * Explain to the user why auth failed and how to fix it.
 */
export function authHelp(entry) {
  const auth = entry.auth;
  if (auth?.type === 'zcode_official' || auth?.provider === 'jwt_token') {
    return [
      'ZCode servers require a JWT token.',
      'Option 1: export ZCODE_JWT_TOKEN=<your-token> before running rugsnare',
      'Option 2: add "headers": {"Authorization": "Bearer <token>"} to the server config',
      'To find your token: check ZCode settings or use the ZCode CLI auth command',
    ].join('\n');
  }
  if (auth?.type === 'bearer') {
    return 'Add "token": "<value>" or "token": "${ENV_VAR}" to the auth config.';
  }
  return 'Add "headers": {"Authorization": "Bearer <token>"} to the server entry in mcp.json.';
}
