#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { toolHash, short } from './hash.js';
import { discoverConfigs, serverCommand } from './discovery.js';
import { fetchTools } from './rpc.js';
import {
  loadPins, savePins, ensureServer, pinTool, compareTools, commandDisplay,
} from './pins.js';
import { loadConfig, saveConfig } from './alerts.js';
import { logEvent } from './events.js';
import { verifyArtifact, DEFAULT_RPCS, DEFAULT_CONTRACTS } from './onchain.js';
import { createProxy } from './proxy.js';
import { readJsonFile } from './jsonfile.js';

/**
 * rugsnare v0.1 — CI-gate toolkit (the live proxy lands in the next release):
 *
 *   rugsnare init                     scaffold .rugsnare/ + show discovered MCP configs
 *   rugsnare scan [--config FILE]     pin current tool descriptions (baseline, approved)
 *   rugsnare diff [--json]            live tools vs pins -> exit 1 on drift/new/removed
 *   rugsnare approve <server>         re-pin after human review
 *
 * `rugsnare diff` in CI is the point: an MCP server that changed its tool
 * descriptions since your last review fails the build.
 */

const HELP = `rugsnare — runtime integrity for MCP tool descriptions

Usage:
  rugsnare init
  rugsnare scan [--config <mcp.json>] [--server <name>]
  rugsnare diff [--config <mcp.json>] [--server <name>] [--json]
  rugsnare approve <server> [--config <mcp.json>]
  rugsnare verify <file> --version <v> --contract <0x...> [--chain base|base-sepolia] [--rpc <url>]

verify: checks a local release artifact against the on-chain ReleaseLog pin
        (https only; non-public RPC hosts are refused).

Files (all local, gitignore .rugsnare/ or commit pins.json deliberately):
  .rugsnare/pins.json     pin store
  .rugsnare/config.json   mode + alert webhook
  .rugsnare/events.jsonl  append-only event log

Exit codes: 0 = clean, 1 = drift detected, 2 = error.`;

function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config') flags.config = argv[++i];
    else if (a === '--server') flags.server = argv[++i];
    else if (a === '--json') flags.json = true;
    else if (a === '--version') flags.version = argv[++i];
    else if (a === '--contract') flags.contract = argv[++i];
    else if (a === '--chain') flags.chain = argv[++i];
    else if (a === '--rpc') flags.rpc = argv[++i];
    else if (a === '--name') flags.name = argv[++i];
    else if (a === '--mode') flags.mode = argv[++i];
    else flags._.push(a);
  }
  return flags;
}

function readServersFromConfigFile(file) {
  const json = readJsonFile(file);
  const servers = json.mcpServers ?? {};
  return Object.fromEntries(Object.entries(servers).filter(([, v]) => v && typeof v.command === 'string'));
}

function collectServers(flags) {
  // Explicit --config wins; otherwise discovered client configs; otherwise pins.
  if (flags.config) return { source: flags.config, servers: readServersFromConfigFile(flags.config) };
  const discovered = discoverConfigs().filter((c) => c.servers && Object.keys(c.servers).length > 0);
  if (discovered.length > 0) {
    const merged = {};
    for (const c of discovered) Object.assign(merged, c.servers);
    return { source: discovered.map((c) => c.file).join(', '), servers: merged };
  }
  const pins = loadPins();
  const fromPins = {};
  for (const [name, sp] of Object.entries(pins.servers)) {
    if (sp.cmd) fromPins[name] = { command: sp.cmd.command, args: sp.cmd.args };
  }
  return { source: 'pins', servers: fromPins };
}

const STATUS_ICON = { UNCHANGED: 'ok ', DRIFT: 'DRIFT', NEW: 'NEW ', REMOVED: 'GONE' };

function printVerdict(server, verdicts, json) {
  if (json) {
    console.log(JSON.stringify({ server, verdicts }, null, 2));
    return;
  }
  for (const v of verdicts) {
    const hashes = v.oldHash ? ` ${short(v.oldHash)} -> ${short(v.hash)}` : v.hash ? ` ${short(v.hash)}` : '';
    console.log(`  [${STATUS_ICON[v.status] ?? v.status}] ${v.tool}${hashes}`);
  }
}

function badVerdicts(verdicts) {
  return verdicts.filter((v) => v.status !== 'UNCHANGED');
}

async function cmdScan(flags) {
  const { source, servers } = collectServers(flags);
  const pins = loadPins();
  const names = flags.server ? [flags.server] : Object.keys(servers);
  if (names.length === 0) { console.error('No MCP servers found. Pass --config <file> or run `rugsnare init`.'); process.exit(2); }
  console.log(`Scanning ${names.length} server(s) from: ${source}`);
  let failed = 0;
  for (const name of names) {
    const entry = servers[name];
    if (!entry) { console.error(`  Server not found in sources: ${name}`); failed++; continue; }
    try {
      const { command, args, env } = serverCommand(entry);
      const tools = await fetchTools({ command, args, env, cwd: process.cwd() });
      const serverPin = ensureServer(pins, name, { command, args });
      for (const tool of tools) pinTool(serverPin, tool, toolHash(tool), { approved: true });
      console.log(`  pinned ${name}: ${tools.length} tool(s) -> ${tools.map((t) => t.name).join(', ')}`);
      logEvent({ kind: 'scan', server: name, tools: tools.length });
    } catch (err) {
      console.error(`  FAILED ${name}: ${err.message}`);
      failed++;
    }
  }
  savePins(pins);
  process.exit(failed > 0 ? 2 : 0);
}

async function cmdDiff(flags) {
  const pins = loadPins();
  // With --config, check what the client would run RIGHT NOW (path/version
  // swaps included). Without it, check the pinned command itself (the
  // classic "package updated in place" rug pull).
  const configServers = flags.config ? readServersFromConfigFile(flags.config) : null;
  const pinnedNames = Object.keys(pins.servers).filter((n) => pins.servers[n].cmd || configServers?.[n]);
  const names = flags.server ? pinnedNames.filter((n) => n === flags.server) : pinnedNames;
  if (names.length === 0) { console.error('No pinned servers. Run `rugsnare scan` first.'); process.exit(2); }

  let driftCount = 0;
  const report = [];
  for (const name of names) {
    const sp = pins.servers[name];
    const cmd = configServers?.[name] ? serverCommand(configServers[name]) : { command: sp.cmd.command, args: sp.cmd.args, env: {} };
    try {
      const tools = await fetchTools({ command: cmd.command, args: cmd.args, env: cmd.env ?? {}, cwd: process.cwd() });
      const verdicts = compareTools(sp, tools, toolHash);
      for (const v of verdicts) {
        if (v.status === 'DRIFT') logEvent({ kind: 'drift', server: name, tool: v.tool, oldHash: v.oldHash, hash: v.hash });
        if (v.status === 'NEW') logEvent({ kind: 'new-tool', server: name, tool: v.tool, hash: v.hash });
      }
      const bad = badVerdicts(verdicts);
      driftCount += bad.length;
      if (!flags.json) {
        console.log(`${name}  (${[cmd.command, ...cmd.args].join(' ')})`);
        printVerdict(name, verdicts, false);
      }
      report.push({ server: name, verdicts });
    } catch (err) {
      console.error(`${name}: FAILED to reach server: ${err.message}`);
      report.push({ server: name, error: err.message });
      driftCount++;
    }
  }
  if (flags.json) console.log(JSON.stringify(report, null, 2));
  const verdict = driftCount === 0 ? 'clean' : `DRIFT DETECTED (${driftCount} finding(s))`;
  console.error(`rugsnare diff: ${verdict}`);
  process.exit(driftCount === 0 ? 0 : 1);
}

async function cmdApprove(flags, serverName) {
  if (!serverName) { console.error('Usage: rugsnare approve <server>'); process.exit(2); }
  const pins = loadPins();
  const sp = pins.servers[serverName];
  const configEntry = flags.config ? readServersFromConfigFile(flags.config)[serverName] : null;
  if (!sp?.cmd && !configEntry) { console.error(`No pinned server named "${serverName}". Run \`rugsnare scan\` first.`); process.exit(2); }
  const cmd = configEntry ? serverCommand(configEntry) : { command: sp.cmd.command, args: sp.cmd.args, env: {} };
  const tools = await fetchTools({ command: cmd.command, args: cmd.args, env: cmd.env ?? {}, cwd: process.cwd() });
  const serverPin = ensureServer(pins, serverName, { command: cmd.command, args: cmd.args });
  for (const tool of tools) pinTool(serverPin, tool, toolHash(tool), { approved: true });
  savePins(pins);
  logEvent({ kind: 'approve', server: serverName, tools: tools.length });
  console.log(`Re-pinned ${serverName}: ${tools.length} tool(s) approved.`);
}

function cmdInit() {
  fs.mkdirSync('.rugsnare', { recursive: true });
  if (!fs.existsSync(path.join('.rugsnare', 'config.json'))) {
    saveConfig(loadConfig());
  }
  console.log('.rugsnare/ ready (mode: observe, no webhook).');
  console.log('\nDiscovered MCP configs:');
  for (const c of discoverConfigs()) {
    const count = c.servers ? Object.keys(c.servers).length : 0;
    console.log(`  ${c.app}/${c.scope}: ${c.file} ${c.exists ? (count ? `(${count} server(s))` : c.error ? '(unparseable)' : '(no mcpServers)') : '(not found)'}`);
  }
  console.log('\nNext: rugsnare scan   -> baseline pins\n     rugsnare diff    -> check for drift (exit 1 = fail the build)');
}

async function cmdVerify(flags) {
  const file = flags._[0];
  const { version, chain = 'base-sepolia', rpc } = flags;
  const rpcUrl = rpc ?? DEFAULT_RPCS[chain];
  const contract = flags.contract ?? DEFAULT_CONTRACTS[chain];
  if (!file || !version) {
    console.error('Usage: rugsnare verify <file> --version <v> [--chain base-sepolia] [--contract <0x...>] [--rpc <url>]');
    process.exit(2);
  }
  if (!rpcUrl) { console.error(`Unknown chain "${chain}". Pass --rpc <https url> or use base|base-sepolia.`); process.exit(2); }
  if (!contract) { console.error(`No default ReleaseLog contract for chain "${chain}" — pass --contract <0x...>.`); process.exit(2); }
  console.log(`verifying ${file}\n  version:  ${version}\n  contract: ${contract}\n  rpc:      ${rpcUrl}`);
  const result = await verifyArtifact({ file, rpc: rpcUrl, contract, version });
  logEvent({ kind: 'verify', file, version, verdict: result.verdict });
  // Exit via exitCode + drained loop: calling process.exit() while an undici
  // socket is closing trips a libuv assertion on Windows.
  const leave = (code, message, write = console.log) => {
    if (message) write(message);
    process.exitCode = code;
    setTimeout(() => process.exit(code), 1000).unref();
  };
  switch (result.verdict) {
    case 'verified':
      return leave(0, `  ✔ VERIFIED — local sha256 matches the on-chain pin (pinned at ${result.pinnedAt})`);
    case 'tampered':
      return leave(1, `  ✘ TAMPERED — local ${result.local} ≠ on-chain ${result.onchain}`, console.error);
    case 'unpinned':
      return leave(2, `  ? ${result.reason}`, console.error);
    default:
      return leave(2, `  ? ${result.reason}`, console.error);
  }
}

/**
 * rugsnare run --name <server> [--mode observe|enforce] -- <command> [args...]
 * Wraps a stdio MCP server with the live integrity proxy. Spawn logic lives
 * in ./spawn-server.js (created by the repo owner once — see setup card);
 * loaded lazily so the rest of the CLI works without it.
 */
async function cmdRun(flags) {
  const name = flags.name;
  const mode = flags.mode === 'enforce' ? 'enforce' : 'observe';
  const dashdash = flags._.indexOf('--');
  const argv = dashdash >= 0 ? flags._.slice(dashdash + 1) : flags._;
  const command = argv[0];
  const args = argv.slice(1).map(String);
  if (!name || !command) {
    console.error('Usage: rugsnare run --name <server> [--mode observe|enforce] -- <command> [args...]');
    process.exit(2);
  }
  let spawnServer;
  try {
    ({ spawnServer } = await import('./spawn-server.js'));
  } catch {
    console.error('Missing src/spawn-server.js — the repo owner creates this file once (see README, "What\'s inside").');
    process.exit(2);
  }
  const config = loadConfig();
  const child = spawnServer({
    command, args, env: {}, cwd: process.cwd(),
    onStdout: () => {},
    onStderr: () => {},
    onExit: () => {},
  });
  // the child process object itself carries real stdin/stdout/stderr streams
  // and exit/error handlers — the proxy consumes exactly that shape
  const streams = { clientIn: process.stdin, server: child };
  console.error(`[rugsnare] proxying "${name}" in ${mode} mode (Ctrl+C to stop)`);
  createProxy({ name, streams, mode, config, cwd: process.cwd() });
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const flags = parseArgs(rest);
  switch (cmd) {
    case 'init': return cmdInit();
    case 'scan': return cmdScan(flags);
    case 'diff': return cmdDiff(flags);
    case 'approve': return cmdApprove(flags, flags._[0]);
    case 'verify': return cmdVerify(flags);
    case 'run': return cmdRun(flags);
    case undefined:
    case '--help':
    case 'help': console.log(HELP); return;
    default: console.error(`Unknown command: ${cmd}\n`); console.log(HELP); process.exit(2);
  }
}

main().catch((err) => { console.error(`rugsnare: ${err.message}`); process.exit(2); });
