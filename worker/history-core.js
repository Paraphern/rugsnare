// Pure functions for the static history scan — no Node APIs, runs in a
// Cloudflare Worker. Shared logic mirrors product/src/{tarball,history}.js
// but stays dependency-free and Workers-compatible (DecompressionStream for
// gzip lives in index.js; this file only sees raw tar bytes).

/** Minimal ustar (+pax path override) reader: bytes -> [{path, bytes}]. */
export function parseTar(u8) {
  const files = [];
  let off = 0;
  let pendingName = null;
  while (off + 512 <= u8.length) {
    const h = u8.subarray(off, off + 512);
    let zero = true;
    for (let i = 0; i < 512; i++) if (h[i] !== 0) { zero = false; break; }
    if (zero) break;

    const size = parseOctal(h, 124, 12);
    const type = String.fromCharCode(h[156] || 48);
    let name = cstr(h, 0, 100);
    const prefix = cstr(h, 345, 155);
    if (prefix) name = `${prefix}/${name}`;

    const dataStart = off + 512;
    const dataEnd = dataStart + size;
    if (dataEnd > u8.length) break;

    if (type === 'x' || type === 'X') {
      const pax = cstr(u8, dataStart, Math.min(size, 8192));
      const at = pax.indexOf(' path=');
      if (at >= 0) {
        const lineEnd = pax.indexOf('\n', at);
        pendingName = pstr(pax.slice(at + 6, lineEnd === -1 ? undefined : lineEnd));
      }
    } else if (type === '0' || type === 48) {
      const finalName = pendingName ?? name;
      pendingName = null;
      files.push({ path: finalName.replace(/^\.\//, ''), bytes: u8.subarray(dataStart, dataStart + size) });
    } else {
      pendingName = null;
    }
    off = dataStart + Math.ceil(size / 512) * 512;
  }
  return files;
}

/**
 * Statically extract { toolName -> description } pairs from dist sources.
 * Catches the dominant pattern (name: 'x', ... description: 'y' literals in
 * server bundles). This is deliberately labeled static: tools assembled at
 * runtime are invisible to it — the CLI (`rugsnare history`) covers those
 * by actually running every version.
 */
export function extractContracts(files) {
  const contracts = new Map();
  for (const f of files) {
    if (!/\.(js|cjs|mjs|json)$/i.test(f.path)) continue;
    if (f.bytes.length > 262144) continue;
    const text = new TextDecoder('utf-8', { fatal: false }).decode(f.bytes);
    scanTextForContracts(text, contracts);
  }
  return contracts;
}

/** Find name: 'x' literals followed by a description: '...' within a window. */
function scanTextForContracts(text, contracts) {
  const nameKey = 'name';
  const descKey = 'description';
  let from = 0;
  for (;;) {
    const n = findKey(text, nameKey, from);
    if (n === -1) break;
    from = n.end;
    const name = readQuoted(text, n.end);
    if (name === null) continue;
    // search the following window for the description literal
    const winEnd = Math.min(text.length, n.end + 700);
    const d = findKey(text, descKey, n.end, winEnd);
    if (d === -1) continue;
    const desc = readQuoted(text, d.end);
    if (desc === null) continue;
    if (!contracts.has(name.value)) contracts.set(name.value, normalize(desc.value));
  }
}

/** Locate `key` followed by optional space + ':'; returns {end} after colon. */
function findKey(text, key, from, to) {
  const limit = to ?? text.length;
  let i = from;
  for (;;) {
    const at = text.indexOf(key, i);
    if (at === -1 || at >= limit) return -1;
    let j = at + key.length;
    while (j < limit && text[j] === ' ') j++;
    if (text[j] === ':') {
      const prev = at === 0 ? ' ' : text[at - 1];
      if (prev === ' ' || prev === '{' || prev === ',' || prev === '\n' || prev === '\t' || prev === '\r') {
        return { end: j + 1 };
      }
    }
    i = at + key.length;
  }
}

/** Read a quoted string ('..." or `...`) at position i; handles \\ escapes. */
function readQuoted(text, i) {
  while (i < text.length && (text[i] === ' ' || text[i] === '\n' || text[i] === '\t' || text[i] === '\r')) i++;
  const q = text[i];
  if (q !== "'" && q !== '"' && q !== '`') return null;
  let out = '';
  i++;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\') { out += text[i + 1] ?? ''; i += 2; continue; }
    if (c === q) return { value: out, end: i + 1 };
    out += c;
    i++;
  }
  return null; // unterminated
}

function normalize(s) {
  return s.replace(/\s+/g, ' ').trim().slice(0, 300);
}

/** Diff two consecutive static contracts. */
export function diffContracts(older, newer) {
  const findings = [];
  for (const [name, desc] of newer) {
    if (!older.has(name)) { findings.push({ tool: name, status: 'NEW' }); continue; }
    const prev = older.get(name);
    if (prev !== desc) findings.push({ tool: name, status: 'DRIFT', driftType: 'COSMETIC', oldDescription: prev, newDescription: desc });
  }
  for (const name of older.keys()) {
    if (!newer.has(name)) findings.push({ tool: name, status: 'REMOVED' });
  }
  return findings;
}

/** Same rules as the CLI: bare or scoped npm names. */
export function validPackageName(s) {
  return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i.test(s);
}

/** Filesystem-safe slug for a package name: @scope/pkg -> scope-pkg. */
export function packageSlug(pkg) {
  return String(pkg)
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Field-free semver sort (numeric fields; prerelease < release). */
export function sortVersions(versions) {
  const key = (v) => {
    const dash = v.indexOf('-');
    const core = dash === -1 ? v : v.slice(0, dash);
    const pre = dash === -1 ? null : v.slice(dash + 1);
    const nums = core.split('.').map((n) => parseInt(n, 10) || 0);
    while (nums.length < 3) nums.push(0);
    return { nums, pre };
  };
  return versions.slice().sort((a, b) => {
    const ka = key(a); const kb = key(b);
    for (let i = 0; i < 3; i++) {
      if (ka.nums[i] !== kb.nums[i]) return ka.nums[i] - kb.nums[i];
    }
    if (ka.pre === kb.pre) return 0;
    if (ka.pre === null) return 1; // release > prerelease
    if (kb.pre === null) return -1;
    return ka.pre < kb.pre ? -1 : 1;
  });
}

function pstr(s) { return s; }

function parseOctal(buf, start, len) {
  const s = cstr(buf, start, len).trim();
  if (!s) return 0;
  const n = parseInt(s.replace(/[^0-7]/g, ''), 8);
  return Number.isNaN(n) ? 0 : n;
}

function cstr(buf, start, len) {
  let end = start + len;
  for (let i = start; i < start + len; i++) {
    if (buf[i] === 0) { end = i; break; }
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(buf.subarray(start, end));
}
