import fs from 'node:fs';

/**
 * Version awareness — the "are we silently updating?" answer.
 *
 * RugSnare flags floating npx/uvx versions in MCP configs (floating.js), so
 * it must be loud about its own: `rugsnare version` prints what you run,
 * `rugsnare doctor` compares it against the npm registry (one user-initiated
 * GET, nothing is ever sent anywhere).
 */

let cached = null;

/** Current version, read from the package.json sitting next to src/. */
export function getVersion() {
  if (cached) return cached;
  const pkgPath = new URL('../package.json', import.meta.url);
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  cached = pkg.version;
  return cached;
}

/**
 * Compare two semver-ish strings (supports prerelease suffixes like
 * "1.1.0-native.2"). Returns -1 / 0 / 1 like strcmp.
 */
export function compareVersions(a, b) {
  const pa = String(a).split(/[.-]/).map((x) => Number(x));
  const pb = String(b).split(/[.-]/).map((x) => Number(x));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

/**
 * Fetch the latest published version from the npm registry.
 * One GET, short timeout, never throws (offline -> null).
 * `registry` is injectable for tests.
 */
export async function fetchLatestVersion({ registry = 'https://registry.npmjs.org/rugsnare/latest', timeoutMs = 3000 } = {}) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(registry, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    clearTimeout(t);
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body.version === 'string' ? body.version : null;
  } catch {
    return null; // offline, blocked, slow: silence — doctor must not nag
  }
}
