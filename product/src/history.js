import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fetchTools } from './rpc.js';
import { toolHash, schemaHash, proseHash } from './hash.js';
import { annotationsEqual, schemaDiff, schemaNotationDiff } from './pins.js';
import { compareVersions } from './version.js';
import { extractTgz } from './tarball.js';

/**
 * rugsnare history <package> — scan the WHOLE published history of an npm
 * MCP server for silent contract changes.
 *
 * For each version: download the tarball straight from the registry (npm is
 * never invoked, no lifecycle scripts run), extract it with the system tar,
 * spawn the server exactly like an MCP client would, take tools/list, and
 * hash every contract. Consecutive versions are then diffed pair by pair
 * with the same split-hash logic as `rugsnare diff`.
 *
 * This RUNS third-party code locally — the same code you would run by
 * installing the package. Nothing is sent anywhere; everything happens in a
 * throwaway temp directory.
 */

const REGISTRY = 'https://registry.npmjs.org';

/** Accepts "pkg", "@scope/pkg", full npm URLs, and raw config lines like
 *  "npx -y pkg" (runner + flags stripped); returns the bare name. */
export function parsePackageName(input) {
  let s = String(input).trim();
  // strip an npx/uvx-style runner and its leading flags: people paste what
  // their MCP config says, not the bare package name
  const runners = new Set(['npx', 'npm', 'pnpm', 'yarn', 'bunx', 'bun', 'deno', 'uvx', 'pipx', 'dlx']);
  const toks = s.split(/\s+/).filter(Boolean);
  let i = 0;
  if (toks.length > 1 && runners.has(toks[0].toLowerCase())) i = 1;
  while (i < toks.length && (toks[i].startsWith('-') || runners.has(toks[i].toLowerCase()))) i++;
  if (i < toks.length) s = toks[i];

  const urlMatch = s.match(/^https?:\/\/(?:www\.)?npmjs\.com\/package\/((?:@[^/?#]+\/)?[^/?#]+)/i);
  if (urlMatch) s = decodeURIComponent(urlMatch[1]);
  const regMatch = s.match(/^https?:\/\/registry\.npmjs\.org\/((?:@[^/?#]+\/)?[^/?#]+)/i);
  if (regMatch) s = decodeURIComponent(regMatch[1]);
  if (!/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i.test(s)) {
    throw new Error(`not a valid npm package name: ${input}`);
  }
  return s;
}

/** Fetch the version->tarball map from the registry (abbreviated metadata). */
export async function fetchRegistryVersions(name, { timeoutMs = 10000 } = {}) {
  // full encodeURIComponent over the whole name: scoped packages become
  // %40scope%2Fname, which the registry accepts as the canonical form.
  // NOTE: full metadata (not the abbreviated install doc) because only it
  // carries the per-version publish timestamps (`time`).
  const res = await fetch(`${REGISTRY}/${encodeURIComponent(name)}`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status === 404) throw new Error(`package not found on npm: ${name}`);
  if (!res.ok) throw new Error(`registry responded ${res.status}`);
  const body = await res.json();
  const versions = Object.keys(body.versions ?? {});
  versions.sort((a, b) => compareVersions(a, b));
  const dist = {};
  for (const v of versions) dist[v] = body.versions[v]?.dist?.tarball;
  return { versions, dist, latest: body['dist-tags']?.latest ?? versions.at(-1), time: body.time ?? {} };
}

/** Download + extract one version tarball into dir; returns the package root. */
async function extractVersion(tarballUrl, dir, { timeoutMs = 30000 } = {}) {
  const res = await fetchValidated(tarballUrl, 'registry.npmjs.org', timeoutMs);
  const files = extractTgz(Buffer.from(await res.arrayBuffer()));
  // npm tarball members already carry the "package/" prefix — extract into
  // the temp dir itself, every member guarded to stay inside it
  const root = path.resolve(dir);
  let wrote = 0;
  for (const f of files) {
    const dest = path.resolve(root, f.path);
    // path traversal guard: every member must stay inside root
    if (dest !== root && !dest.startsWith(root + path.sep)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, f.data);
    wrote++;
  }
  if (wrote === 0) throw new Error('empty tarball');
  return path.join(root, 'package');
}

/**
 * Fetch a tarball following redirects, but re-validating the host after
 * every hop (review 34): a redirect must never smuggle us off the registry.
 */
export async function fetchValidated(url, allowedHost, timeoutMs) {
  let current = url;
  for (let hop = 0; hop < 3; hop++) {
    const u = new URL(current);
    if (u.hostname !== allowedHost) throw new Error(`refusing non-${allowedHost} host: ${u.hostname}`);
    const res = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error('redirect without location');
      current = new URL(loc, u).href;
      continue;
    }
    if (!res.ok) throw new Error(`tarball fetch ${res.status}`);
    return res;
  }
  throw new Error('too many redirects');
}

/** Resolve the server entry from the extracted package.json bin field. */
function serverEntry(pkgDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  const bin = pkg.bin;
  let rel;
  if (typeof bin === 'string') rel = bin;
  else if (bin && typeof bin === 'object') rel = Object.values(bin)[0];
  if (!rel) throw new Error('no bin in package.json (not a runnable MCP server?)');
  return path.join(pkgDir, rel);
}

/**
 * Install production deps of the extracted package WITHOUT running any
 * lifecycle script (--ignore-scripts). --legacy-peer-deps: we are a scanner,
 * not a production install — peer-conflicting real-world packages (common
 * among Claude Code companions) must still be scannable. Command and
 * arguments are fully static literals; the only dynamic input is cwd
 * (a temp dir we created).
 */
const NPM_INSTALL_ARGS = ['install', '--omit=dev', '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund', '--loglevel=error'];

/**
 * Stub env var NAMES for credential-gated servers (P3 followup, proven in
 * the field by the Oct 2026 audit): many MCP servers validate only the
 * PRESENCE of an API key at boot — a dummy marker value lets tools/list
 * enumerate without any real credential. Var names only; the value is a
 * fixed non-secret marker string, not a credential.
 */
export const STUB_ENV_VARS = [
  'CURRENTS_API_KEY',
  'CURRENTS_PROJECT_ID',
  'HOSTINGER_API_KEY',
  'AZURE_DEVOPS_EXT_PAT',
  'PRIVATE_APP_ACCESS_TOKEN',
];
const STUB_MARKER = 'rugsnare_stub';

function buildStubEnv() {
  const env = {};
  for (const name of STUB_ENV_VARS) env[name] = STUB_MARKER;
  return env;
}

function installDeps(pkgDir) {
  const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  const useCli = fs.existsSync(npmCli);
  const cmd = useCli ? process.execPath : 'npm';
  const args = useCli ? [npmCli, ...NPM_INSTALL_ARGS] : NPM_INSTALL_ARGS;
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd: pkgDir, timeout: 120000, windowsHide: true }, (err, _so, se) => {
      if (err) reject(new Error(`npm install: ${(se || err.message).split('\n')[0]}`));
      else resolve();
    });
  });
}

/** List the tool contracts of one version by actually running it. */
export async function contractOfVersion(name, version, tarballUrl, { timeoutMs = 15000, stubEnv = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `rugsnare-hist-${version}-`));
  try {
    const pkgDir = await extractVersion(tarballUrl, dir);
    await installDeps(pkgDir);
    const entry = serverEntry(pkgDir);
    const { tools } = await fetchTools({
      command: process.execPath,
      args: [entry],
      env: { ...process.env, RUGSNARE_HISTORY: version, ...(stubEnv ? buildStubEnv() : {}) },
      cwd: pkgDir,
      timeoutMs,
    });
    const pins = {};
    for (const t of tools || []) {
      pins[t.name] = {
        hash: toolHash(t),
        schemaHash: schemaHash(t),
        proseHash: proseHash(t),
        description: t.description ?? '',
        inputSchema: t.inputSchema,
        annotations: t.annotations,
      };
    }
    return { version, tools: pins, toolCount: (tools || []).length };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch { /* Windows */ }
  }
}

/**
 * Diff two consecutive version contracts. Returns findings in the same
 * shape as compareTools: { tool, status, driftType, oldDescription, newDescription }.
 * Annotation-only flips (e.g. a dropped destructiveHint) are DRIFT/ANNOTATION,
 * mirroring `rugsnare diff`.
 */
export function diffVersionContracts(older, newer) {
  const findings = [];
  const a = older.tools ?? {};
  const b = newer.tools ?? {};
  for (const [name, pin] of Object.entries(b)) {
    const prev = a[name];
    if (!prev) { findings.push({ tool: name, status: 'NEW' }); continue; }
    if (prev.hash === pin.hash) {
      // byte-identical text+schema, but behavioral hints may have flipped
      if (prev.annotations !== undefined || pin.annotations !== undefined) {
        if (!annotationsEqual(prev.annotations, pin.annotations)) {
          findings.push({
            tool: name,
            status: 'DRIFT',
            driftType: 'ANNOTATION',
            oldDescription: prev.description,
            newDescription: pin.description,
          });
        }
      }
      continue;
    }
    const schemaChanged = prev.schemaHash !== pin.schemaHash;
    // P3 gradation (same rules as `rugsnare diff`): schema bytes changed, but
    // no parameter/type/required/enum difference → notation-only (dialect
    // switch, additionalProperties form) — lower severity than BREAKING
    const paramChanges = schemaChanged && prev.inputSchema && pin.inputSchema
      ? schemaDiff(prev.inputSchema, pin.inputSchema) : [];
    const notationOnly = schemaChanged && paramChanges.length === 0;
    const notationChanges = notationOnly && prev.inputSchema && pin.inputSchema
      ? schemaNotationDiff(prev.inputSchema, pin.inputSchema) : [];
    findings.push({
      tool: name,
      status: 'DRIFT',
      driftType: schemaChanged ? (notationOnly ? 'NOTATION' : 'BREAKING') : 'COSMETIC',
      schemaChanges: paramChanges,
      ...(notationOnly ? { notationChanges } : {}),
      oldDescription: prev.description,
      newDescription: pin.description,
    });
  }
  for (const name of Object.keys(a)) {
    if (!b[name]) findings.push({ tool: name, status: 'REMOVED' });
  }
  return findings;
}

/**
 * Full history scan. last N published versions (default 10). Versions that
 * fail to start are reported honestly, not silently skipped.
 */
export async function scanHistory(name, { last = 10, from, to, timeoutMs = 15000, stubEnv = false, onProgress = () => {} } = {}) {
  const { versions, dist, latest, time } = await fetchRegistryVersions(name);
  // --from/--to: inclusive semver window (surveys quote exact ranges);
  // falls back to the last N when no window is given
  const inWindow = versions.filter((v) =>
    (!from || compareVersions(v, from) >= 0) && (!to || compareVersions(v, to) <= 0));
  const chosen = inWindow.slice(-last);
  onProgress(`${chosen.length} version(s) to check: ${chosen[0]} .. ${chosen.at(-1)} (latest: ${latest})${stubEnv ? ' [stub-env]' : ''}`);

  const ran = [];
  const unreachable = [];
  for (const v of chosen) {
    onProgress(`running ${v} ...`);
    try {
      const c = await contractOfVersion(name, v, dist[v], { timeoutMs, stubEnv });
      ran.push(c);
    } catch (e) {
      unreachable.push({ version: v, reason: e.message });
    }
  }

  const pairs = [];
  for (let i = 1; i < ran.length; i++) {
    const findings = diffVersionContracts(ran[i - 1], ran[i]);
    // publish date of the NEWER version — when the change became live
    pairs.push({ from: ran[i - 1].version, to: ran[i].version, toPublishedAt: time[ran[i].version] ?? null, findings });
  }

  const silentChanges = pairs.reduce((n, p) => n + p.findings.length, 0);
  return {
    package: name,
    checked: ran.length,
    planned: chosen.length,
    unreachable,
    pairs,
    silentChanges,
    // a scan where NOTHING could be started must never read as clean —
    // "no data" is not "no changes" (review 34)
    clean: ran.length > 0 && silentChanges === 0,
  };
}
