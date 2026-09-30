#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { toolHash, short } from './hash.js';
import { discoverConfigs, discoverZCodePlugins, serverCommand } from './discovery.js';
import { fetchTools } from './rpc.js';
import {
  loadPins, savePins, ensureServer, pinTool, compareTools, commandDisplay, detectShadows,
} from './pins.js';
import { loadConfig, saveConfig } from './alerts.js';
import { logEvent } from './events.js';
import { verifyArtifact, DEFAULT_RPCS, DEFAULT_CONTRACTS } from './onchain.js';
import { createProxy } from './proxy.js';
import { readJsonFile } from './jsonfile.js';
import { buildSarif } from './sarif.js';
import { scanToolsForAdvisories } from './advisory.js';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  rugsnare report [--live] [--json]   fleet inventory (never exits 1)

verify: checks a local release artifact against the on-chain ReleaseLog pin
        (https only; non-public RPC hosts are refused).

Files (all local, gitignore .rugsnare/ or commit pins.json deliberately):
  .rugsnare/pins.json     pin store
  .rugsnare/config.json   mode + alert webhook
  .rugsnare/events.jsonl  append-only event log

Exit codes: 0 = clean, 1 = drift detected, 2 = config error, 3 = infrastructure error (no drift, but couldn't reach a server).`;

function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config') flags.config = argv[++i];
    else if (a === '--server') flags.server = argv[++i];
    else if (a === '--json') flags.json = true;
    else if (a === '--sarif') flags.sarif = true;
    else if (a === '--live') flags.live = true;
    else if (a === '--version') flags.version = argv[++i];
    else if (a === '--contract') flags.contract = argv[++i];
    else if (a === '--chain') flags.chain = argv[++i];
    else if (a === '--rpc') flags.rpc = argv[++i];
    else if (a === '--name') flags.name = argv[++i];
    else if (a === '--mode') flags.mode = argv[++i];
    else if (a === '--timeout') flags.timeout = parseInt(argv[++i], 10) || 15000;
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
      const { tools, prompts, resources } = await fetchTools({ command, args, env, cwd: process.cwd(), timeoutMs: flags.timeout });
      const serverPin = ensureServer(pins, name, { command, args });
      for (const tool of tools) pinTool(serverPin, tool, toolHash(tool), { approved: true });

      // pin prompts and resources too (if the server exposes them)
      if (!serverPin.prompts) serverPin.prompts = {};
      for (const p of prompts ?? []) {
        const { promptHash } = await import('./prompts.js');
        serverPin.prompts[p.name] = { hash: promptHash(p), description: p.description ?? '', firstSeen: new Date().toISOString() };
      }
      if (!serverPin.resources) serverPin.resources = {};
      for (const r of resources ?? []) {
        const { resourceHash } = await import('./prompts.js');
        const key = r.name ?? r.uri ?? '(unnamed)';
        serverPin.resources[key] = { hash: resourceHash(r), description: r.description ?? '', firstSeen: new Date().toISOString() };
      }

      // advisory signals: catch suspicious descriptions even on first contact
      const advisories = scanToolsForAdvisories(tools);
      for (const adv of advisories) {
        console.error(`  [ADVISORY] ${name}/${adv.tool} — score ${adv.score}: ${adv.signals.map((s) => s.desc).join('; ')}`);
        logEvent({ kind: 'advisory', server: name, tool: adv.tool, score: adv.score, signals: adv.signals.map((s) => s.id) });
      }

      console.log(`  pinned ${name}: ${tools.length} tool(s) -> ${tools.map((t) => t.name).join(', ')}`);
      logEvent({ kind: 'scan', server: name, tools: tools.length });
    } catch (err) {
      console.error(`  FAILED ${name}: ${err.message}`);
      failed++;
    }
  }
  savePins(pins);
  const shadows = detectShadows(pins);
  for (const s of shadows) {
    console.error(`  [SHADOW] tool "${s.tool}" is exposed by multiple servers: ${s.servers.join(', ')} — the client's resolution order decides which one runs`);
    logEvent({ kind: 'shadow', tool: s.tool, servers: s.servers });
  }
  console.log('');
  console.log('  ✅ Pinned. Next steps:');
  console.log('     1. Commit .rugsnare/pins.json to your repo (this is your baseline)');
  console.log('     2. Add to CI:  rugsnare diff --config <your-config>  (exit 1 = build fails)');
  console.log('     3. Optional: use the PR-diff Action for human-readable contract review:');
  console.log('        https://github.com/Paraphern/rugsnare#pr-contract-review');
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
  let infraErrorCount = 0; // exit 3: server unreachable/timeout (not drift)
  const shadows = detectShadows(pins).filter((s) => !flags.server || s.servers.includes(flags.server));
  driftCount += shadows.length;
  for (const s of shadows) {
    logEvent({ kind: 'shadow', tool: s.tool, servers: s.servers });
  }
  const report = [];
  for (const name of names) {
    const sp = pins.servers[name];
    const cmd = configServers?.[name] ? serverCommand(configServers[name]) : { command: sp.cmd.command, args: sp.cmd.args, env: {} };
    try {
      const { tools } = await fetchTools({ command: cmd.command, args: cmd.args, env: cmd.env ?? {}, cwd: process.cwd(), timeoutMs: flags.timeout });
      const verdicts = compareTools(sp, tools, toolHash);
      // also compare prompts and resources if pinned
      const { promptHash, resourceHash, comparePinned } = await import('./prompts.js');
      if (sp.prompts && Object.keys(sp.prompts).length > 0) {
        // re-fetch prompts for comparison
      }
      const { prompts: livePrompts = [], resources: liveResources = [] } = await fetchTools({ command: cmd.command, args: cmd.args, env: cmd.env ?? {}, cwd: process.cwd(), timeoutMs: flags.timeout });
      if (sp.prompts) verdicts.push(...comparePinned('prompt', sp.prompts, livePrompts, promptHash));
      if (sp.resources) verdicts.push(...comparePinned('resource', sp.resources, liveResources, resourceHash));
      for (const v of verdicts) {
        if (v.status === 'DRIFT') logEvent({ kind: 'drift', server: name, tool: v.tool, oldHash: v.oldHash, hash: v.hash });
        if (v.status === 'NEW') logEvent({ kind: 'new-tool', server: name, tool: v.tool, hash: v.hash });
      }
      const bad = badVerdicts(verdicts);
      driftCount += bad.length;
      if (!flags.json && !flags.sarif) {
        console.log(`${name}  (${[cmd.command, ...cmd.args].join(' ')})`);
        printVerdict(name, verdicts, false);
      }
      report.push({ server: name, verdicts });
    } catch (err) {
      if (!flags.json && !flags.sarif) console.error(`${name}: FAILED to reach server: ${err.message}`);
      report.push({ server: name, error: err.message });
      infraErrorCount++; // infrastructure error, not drift — separate exit code
    }
  }
  if (flags.sarif) {
    console.log(JSON.stringify(buildSarif(report, shadows), null, 2));
  } else if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const s of shadows) {
      console.log(`[SHADOW] tool "${s.tool}" is exposed by multiple servers: ${s.servers.join(', ')}`);
    }
  }
  const verdict = driftCount === 0 ? 'clean' : `DRIFT DETECTED (${driftCount} finding(s))`;
  console.error(`rugsnare diff: ${verdict}${infraErrorCount > 0 ? ` (+${infraErrorCount} infra error(s))` : ''}`);
  // Exit codes: 0=clean, 1=drift, 2=config error, 3=infrastructure error only (no drift detected)
  if (driftCount > 0) process.exit(1);
  if (infraErrorCount > 0) process.exit(3);
  process.exit(0);
}

async function cmdApprove(flags, serverName) {
  if (!serverName) { console.error('Usage: rugsnare approve <server>'); process.exit(2); }
  const pins = loadPins();
  const sp = pins.servers[serverName];
  const configEntry = flags.config ? readServersFromConfigFile(flags.config)[serverName] : null;
  if (!sp?.cmd && !configEntry) { console.error(`No pinned server named "${serverName}". Run \`rugsnare scan\` first.`); process.exit(2); }
  const cmd = configEntry ? serverCommand(configEntry) : { command: sp.cmd.command, args: sp.cmd.args, env: {} };
  const { tools } = await fetchTools({ command: cmd.command, args: cmd.args, env: cmd.env ?? {}, cwd: process.cwd(), timeoutMs: flags.timeout });
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
  // ZCode plugins (per-plugin .mcp.json)
  const zcodePlugins = discoverZCodePlugins();
  for (const z of zcodePlugins) {
    const count = Object.keys(z.servers).length;
    console.log(`  zcode/${z.scope}: ${z.file} (${count} server(s))`);
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

/**
 * rugsnare report — human-readable inventory of the pinned MCP server fleet.
 * For compliance, audits, and the natural entry into the hosted panel.
 * Use --live to also check each server against its pins (like diff, but never exits 1).
 */
async function cmdReport(flags) {
  const pins = loadPins();
  const names = Object.keys(pins.servers).filter((n) => pins.servers[n].tools && Object.keys(pins.servers[n].tools).length > 0);
  if (names.length === 0) { console.error('No pinned servers. Run `rugsnare scan` first.'); process.exit(2); }

  const shadows = detectShadows(pins);
  const json = { servers: [], shadows };

  console.log('RugSnare fleet report');
  console.log('=====================');
  console.log('');

  for (const name of names) {
    const sp = pins.servers[name];
    const toolCount = Object.keys(sp.tools).length;
    const approvedCount = Object.values(sp.tools).filter((t) => t.approved).length;
    const lastPinned = Object.values(sp.tools).reduce((latest, t) => (t.pinnedAt > latest ? t.pinnedAt : latest), '—');

    let liveStatus = '';
    if (flags.live && sp.cmd) {
      try {
        const { tools } = await fetchTools({ command: sp.cmd.command, args: sp.cmd.args, env: {}, cwd: process.cwd(), timeoutMs: flags.timeout });
        const verdicts = compareTools(sp, tools, toolHash);
        const bad = badVerdicts(verdicts);
        liveStatus = bad.length === 0 ? ' ✓ live' : ` ⚠ ${bad.length} finding(s)`;
        json.servers.push({ name, tools: toolCount, approved: approvedCount, lastPinned, live: badVerdicts(verdicts) });
      } catch (err) {
        liveStatus = ` ✗ unreachable`;
        json.servers.push({ name, tools: toolCount, approved: approvedCount, lastPinned, live: [{ tool: '(server)', status: 'UNREACHABLE' }] });
      }
    } else {
      json.servers.push({ name, tools: toolCount, approved: approvedCount, lastPinned, live: null });
    }

    console.log(`  ${name}${liveStatus}`);
    console.log(`    tools: ${toolCount} (${approvedCount} approved) | last pin: ${lastPinned.slice(0, 10)}`);
    console.log(`    command: ${commandDisplay(sp)}`);
    console.log('');
  }

  if (shadows.length > 0) {
    console.log('Cross-server tool shadowing:');
    for (const s of shadows) {
      console.log(`  [SHADOW] "${s.tool}" → ${s.servers.join(', ')}`);
    }
  } else {
    console.log('Cross-server tool shadowing: none ✓');
  }
  console.log('');

  if (flags.json) console.log(JSON.stringify(json, null, 2));
  console.log(`Fleet: ${names.length} server(s), ${names.reduce((acc, n) => acc + Object.keys(pins.servers[n].tools).length, 0)} tool(s), ${shadows.length} shadow(s)`);
  process.exit(0); // report never fails — it informs
}

/**
 * rugsnare hook install — sets up the pre-commit git hook.
 */
async function cmdHook(flags) {
  const action = flags._[0];
  if (action === 'install') {
    const gitDir = path.join(process.cwd(), '.git');
    if (!fs.existsSync(gitDir)) {
      console.error('Not a git repository (no .git directory found).');
      process.exit(2);
    }
    const hooksDir = path.join(gitDir, 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    const hookPath = path.join(hooksDir, 'pre-commit');

    if (fs.existsSync(hookPath)) {
      const existing = fs.readFileSync(hookPath, 'utf8');
      if (existing.includes('rugsnare')) {
        console.log('RugSnare pre-commit hook already installed ✓');
        process.exit(0);
      }
      const precommitPath = path.join(__dirname, 'precommit.mjs');
      console.error(`A pre-commit hook already exists at ${hookPath}.`);
      console.error('Append this line to it manually:');
      console.error(`  node "${precommitPath}"`);
      process.exit(2);
    }

    const precommitPath = path.join(__dirname, 'precommit.mjs');
    const hookContent = `#!/bin/sh\n# RugSnare pre-commit hook — blocks commits on MCP tool contract drift\nexec node "${precommitPath}"\n`;
    fs.writeFileSync(hookPath, hookContent);
    fs.chmodSync(hookPath, 0o755);
    console.log(`✅ Pre-commit hook installed at ${hookPath}`);
    console.log('   Next: rugsnare scan --config <your-config>  (creates the pins it checks)');
    console.log('   To remove: rm .git/hooks/pre-commit');
    process.exit(0);
  } else if (action === 'uninstall') {
    const hookPath = path.join(process.cwd(), '.git', 'hooks', 'pre-commit');
    if (fs.existsSync(hookPath)) {
      const content = fs.readFileSync(hookPath, 'utf8');
      if (content.includes('rugsnare')) {
        fs.unlinkSync(hookPath);
        console.log('✅ Pre-commit hook removed');
      } else {
        console.log('Pre-commit hook exists but is not RugSnare\'s — leaving it alone.');
      }
    } else {
      console.log('No pre-commit hook found.');
    }
    process.exit(0);
  } else {
    console.error('Usage: rugsnare hook install | rugsnare hook uninstall');
    process.exit(2);
  }
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
    case 'report': return cmdReport(flags);
    case 'hook': return cmdHook(flags);
    case undefined:
    case '--help':
    case 'help': console.log(HELP); return;
    default: console.error(`Unknown command: ${cmd}\n`); console.log(HELP); process.exit(2);
  }
}

main().catch((err) => { console.error(`rugsnare: ${err.message}`); process.exit(2); });
