#!/usr/bin/env node
/**
 * RugSnare drift-feed: canary monitoring of popular MCP servers.
 *
 * Runs on a schedule (GitHub Actions cron), scans a curated list of npm
 * packages that expose MCP servers, records their tool/prompt/resource
 * contracts, and logs any changes since the previous snapshot to a public
 * JSONL feed. This creates a unique, verifiable record of how the MCP
 * ecosystem's contracts evolve - or quietly mutate.
 *
 * Usage: node driftfeed.mjs [--servers servers.json] [--output feed-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { toolHash } from './hash.js';
import { promptHash, resourceHash } from './prompts.js';
import { scanToolDescription } from './advisory.js';

const exec = promisify(execFile);

const DEFAULT_SERVERS = [
  { name: 'server-filesystem', pkg: '@modelcontextprotocol/server-filesystem', args: ['/tmp'] },
  { name: 'server-memory', pkg: '@modelcontextprotocol/server-memory', args: [] },
  { name: 'server-fetch', pkg: '@modelcontextprotocol/server-fetch', args: [] },
  { name: 'server-everything', pkg: '@modelcontextprotocol/server-everything', args: [] },
  { name: 'server-sequential-thinking', pkg: '@modelcontextprotocol/server-sequential-thinking', args: [] },
  { name: 'server-git', pkg: '@modelcontextprotocol/server-git', args: ['/tmp'] },
];

async function getLatestVersion(pkg) {
  const { stdout } = await exec('npm', ['view', pkg, 'version'], { timeout: 30000 });
  return stdout.trim();
}

/**
 * R30: hosted (remote HTTP) endpoints in the public feed. stdio npm packages
 * cover a third of the registry; the majority is hosted, and hosted servers
 * change contracts WITHOUT any release (server-side deploy) - the only
 * protection is continuous monitoring with a public log.
 *
 * Coverage rule (stated in the feed README so silence is never read as
 * cleanliness): a PUBLIC Actions feed cannot carry auth tokens, so only
 * endpoints whose tools/list answers WITHOUT authentication are monitored -
 * a common MCP pattern (list open, call gated). Auth-gated endpoints are
 * excluded by design, not by oversight.
 *
 * One polite request per endpoint per day; failures are logged events
 * (HOSTED_ERROR / HOSTED_GONE), never fatal - hosted flakiness is not drift.
 */
async function scanHosted(server) {
  const { fetchToolsHttp } = await import('./rpc-http.js');
  const { tools = [], prompts = [], resources = [] } = await fetchToolsHttp({
    url: server.url,
    headers: server.headers ?? {},
    timeoutMs: 30000,
  });
  return {
    server: server.name,
    url: server.url,
    transport: 'http',
    // no "version" concept: hosted contracts change without releases, which
    // is exactly why they need watching - the snapshot hash IS the version
    version: 'hosted',
    tools: tools.map((t) => ({ name: t.name, hash: toolHash(t), description: t.description ?? '', advisory: scanToolDescription(t.description ?? '').advisory })),
    prompts: prompts.map((p) => ({ name: p.name, hash: promptHash(p) })),
    resources: resources.map((r) => ({ name: r.name ?? r.uri, hash: resourceHash(r) })),
  };
}

async function installAndScan(server, dir) {
  const pkgDir = path.join(dir, server.name);
  fs.mkdirSync(pkgDir, { recursive: true });
  const version = await getLatestVersion(server.pkg);
  await exec('npm', ['init', '-y'], { cwd: pkgDir, timeout: 30000 });
  await exec('npm', ['install', '--no-audit', '--no-fund', '--silent', `${server.pkg}@${version}`], { cwd: pkgDir, timeout: 120000 });

  // find the entry point
  const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, 'node_modules', server.pkg, 'package.json'), 'utf8'));
  const entry = pkgJson.main ?? pkgJson.bin?.[Object.keys(pkgJson.bin)[0]] ?? 'index.js';
  const entryPath = path.join(pkgDir, 'node_modules', server.pkg, entry);

  // dynamic import of fetchTools
  const { fetchTools } = await import('./rpc.js');
  const { tools = [], prompts = [], resources = [] } = await fetchTools({
    command: 'node',
    args: [entryPath, ...server.args],
    cwd: pkgDir,
    timeoutMs: 30000,
  });

  return {
    server: server.name,
    package: server.pkg,
    version,
    tools: tools.map((t) => ({ name: t.name, hash: toolHash(t), description: t.description ?? '', advisory: scanToolDescription(t.description ?? '').advisory })),
    prompts: prompts.map((p) => ({ name: p.name, hash: promptHash(p) })),
    resources: resources.map((r) => ({ name: r.name ?? r.uri, hash: resourceHash(r) })),
  };
}

function compareSnapshots(prev, curr) {
  if (!prev) return { changes: [], new_server: true };
  const changes = [];

  // version change
  if (prev.version !== curr.version) {
    changes.push({ type: 'VERSION', detail: `${prev.version} → ${curr.version}` });
  }

  // tool changes
  const prevTools = new Map(prev.tools.map((t) => [t.name, t]));
  for (const t of curr.tools) {
    const old = prevTools.get(t.name);
    if (!old) changes.push({ type: 'NEW_TOOL', tool: t.name });
    else if (old.hash !== t.hash) changes.push({ type: 'DRIFT', tool: t.name, oldHash: old.hash.slice(0, 16), newHash: t.hash.slice(0, 16) });
    if (t.advisory && !old?.advisory) changes.push({ type: 'ADVISORY_NEW', tool: t.name, note: 'advisory signal appeared' });
    if (!t.advisory && old?.advisory) changes.push({ type: 'ADVISORY_CLEARED', tool: t.name });
  }
  for (const [name] of prevTools) {
    if (!curr.tools.find((t) => t.name === name)) changes.push({ type: 'REMOVED_TOOL', tool: name });
  }

  // prompt changes
  const prevPrompts = new Set(prev.prompts.map((p) => p.name));
  for (const p of curr.prompts) if (!prevPrompts.has(p.name)) changes.push({ type: 'NEW_PROMPT', prompt: p.name });
  for (const name of prevPrompts) if (!curr.prompts.find((p) => p.name === name)) changes.push({ type: 'REMOVED_PROMPT', prompt: name });

  return { changes, new_server: false };
}

async function main() {
  const feedDir = process.env.DRIFT_FEED_DIR ?? path.join(process.cwd(), 'drift-feed');
  const serversFile = process.env.DRIFT_SERVERS ?? path.join(feedDir, 'servers.json');
  const servers = fs.existsSync(serversFile) ? JSON.parse(fs.readFileSync(serversFile, 'utf8')) : DEFAULT_SERVERS;

  const snapshotFile = path.join(feedDir, 'latest-snapshot.json');
  const feedFile = path.join(feedDir, 'changes.jsonl');
  const prevSnapshot = fs.existsSync(snapshotFile) ? JSON.parse(fs.readFileSync(snapshotFile, 'utf8')) : null;

  fs.mkdirSync(feedDir, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rugsnare-feed-'));

  const currentSnapshot = {};
  const allChanges = [];

  for (const server of servers) {
    // R30: two entry shapes share one loop - { name, pkg } (stdio npm) and
    // { name, url, headers? } (hosted HTTP). Errors are feed events either way.
    const hosted = Boolean(server.url);
    try {
      process.stderr.write(`scanning ${hosted ? server.url : server.pkg}...`);
      const data = hosted ? await scanHosted(server) : await installAndScan(server, tmpDir);
      currentSnapshot[server.name] = data;
      const comparison = compareSnapshots(prevSnapshot?.[server.name], data);
      for (const change of comparison.changes) {
        allChanges.push({ ts: new Date().toISOString(), server: server.name, ...(hosted ? { transport: 'http' } : {}), ...change });
      }
      if (comparison.new_server) {
        allChanges.push({ ts: new Date().toISOString(), server: server.name, ...(hosted ? { transport: 'http' } : {}), type: 'FIRST_SCAN', detail: `${hosted ? 'hosted, ' : `v${data.version}, `}${data.tools.length} tools` });
      }
      process.stderr.write(` done (${data.tools.length} tools, ${comparison.changes.length} changes)\n`);
    } catch (err) {
      process.stderr.write(` FAILED: ${err.message}\n`);
      if (hosted) {
        // A hosted endpoint dying or starting to demand auth is itself a
        // finding, not noise: "endpoint went dark" and "list now gated" are
        // both contract-relevant events for consumers.
        const gated = /401|403|unauthorized/i.test(String(err.message));
        allChanges.push({
          ts: new Date().toISOString(),
          server: server.name,
          transport: 'http',
          type: gated ? 'HOSTED_GATED' : 'HOSTED_ERROR',
          detail: err.message.slice(0, 200),
        });
        continue;
      }
      // A monitored package vanishing from npm is not a generic error - it is
      // the postmark-mcp incident class (package unpublished / renamed). Feed
      // consumers must be able to alert on it specifically.
      const gone = /E404|not found|404/i.test(String(err.message));
      allChanges.push({
        ts: new Date().toISOString(),
        server: server.name,
        type: gone ? 'PACKAGE_GONE' : 'ERROR',
        detail: err.message.slice(0, 200),
      });
    }
  }

  // save snapshot
  fs.writeFileSync(snapshotFile, JSON.stringify(currentSnapshot, null, 2));

  // append changes to feed
  if (allChanges.length > 0) {
    fs.appendFileSync(feedFile, allChanges.map((c) => JSON.stringify(c)).join('\n') + '\n');
  }

  // summary
  console.log(`\nDrift feed summary:`);
  console.log(`  servers scanned: ${Object.keys(currentSnapshot).length}`);
  console.log(`  changes logged: ${allChanges.length}`);
  for (const c of allChanges) {
    console.log(`  [${c.type}] ${c.server}${c.tool ? `/${c.tool}` : ''} ${c.detail ?? ''}`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}

main().catch((err) => { console.error(err); process.exit(1); });
