#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { toolHash, short } from './hash.js';
import { discoverConfigs, discoverZCodePlugins, serverCommand } from './discovery.js';
import { fetchTools } from './rpc.js';
import {
  loadPins, savePins, ensureServer, pinTool, compareTools, commandDisplay, detectShadows,
} from './pins.js';
import { loadConfig, saveConfig } from './alerts.js';
import { logEvent, eventsPath } from './events.js';
import { verifyArtifact, DEFAULT_RPCS, DEFAULT_CONTRACTS } from './onchain.js';
import { createProxy } from './proxy.js';
import { readJsonFile } from './jsonfile.js';
import { buildSarif } from './sarif.js';
import { scanToolsForAdvisories, scanToolDescription } from './advisory.js';
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
  rugsnare scan [--config <mcp.json>] [--server <name>] [--chameleon] [--json]
                                                         --chameleon: re-list tools as claude-desktop/cursor;
                                                         different contract per client = CHAMELEON, exit 1
                                                         --json: machine-readable baseline inventory
  rugsnare scan --server <name> --url <https://remote/mcp> [--header "Name: Value"]...
                                                         ad-hoc: pin a remote server BEFORE adding it to any config
  rugsnare diff [--config <mcp.json>] [--server <name>] [--json] [--sarif] [--schema-only] [--prose-only]
                [--expect-tool <t>]... [--forbid-tool <t>]...   contract assertions (forbid catches shadow injection)
                [--allow-unsigned-pins]   skip the pins.sig check when no signature exists (bootstrap)
                                                         signed pins: an edited pins.json (CI attacker) fails with exit 2
  rugsnare diff --server <name> --url <https://remote/mcp>    compare pins against THIS endpoint (overrides config)
  rugsnare approve <server> [--config <mcp.json>]
  rugsnare unpin <server>             drop a departed server's pins (stops SHADOW/REMOVED ghosts)
  rugsnare skills scan | diff | report   pin, diff, and visually report on AI agent
                                                         skill files (SKILL.md, .mdc) across Claude Code,
                                                         Cursor, Windsurf, ZCode, Copilot, and others.
                                                         report generates HTML and opens your browser
  rugsnare history <npm-package> [--last N] [--json]
                                                         scan the WHOLE published history of an npm MCP
                                                         server for silent contract changes: downloads
                                                         and runs each version locally, diffs tool
                                                         contracts pair by pair; exit 1 = silent changes
  rugsnare audit --input <file-or-dir> [--json] [--airgap]
                                                         scan local files (AI chat exports, notes, .env) for
                                                         leaked secrets — redacted screen-only output; exit 1 = HIGH
  rugsnare vault set <NAME> [VALUE] | get | list | rm   secret vault: model sends {{VAULT:NAME}}, proxy injects
                                                         the real value to the server and scrubs it from results
  rugsnare verify <file> --version <v> --contract <0x...> [--chain base|base-sepolia] [--rpc <url>]
  rugsnare report [--live] [--json]   fleet inventory (never exits 1)
  rugsnare version                   print the running version (doctor compares it to npm)
  rugsnare doctor                    self-diagnosis: configs, pins, approvals, receipts chain
                                                         --check-update: also compare your version against npm (one GET)
  rugsnare events [count]            event log size (append-only; local)
  rugsnare events trim --keep-last <n>   shrink the log (receipts stay intact)
  rugsnare config [list] | get <k> | set <k> <v>   validated edits to .rugsnare/config.json
                                                (mode, failMode, alertWebhook, logCallArgs, canaryRecord, loopThreshold, resultThreshold)
  rugsnare mcp                        run rugsnare itself as a read-only MCP server (drift_feed_status, pins_report)
  rugsnare hook install               git pre-commit hook: block commits when contracts have drifted
  rugsnare run --name <server> [--mode observe|enforce] [--fail-closed] -- <command> [args...]
                                                         live stdio proxy (defaults: observe, fail-open)
  rugsnare run --name <server> --url <https://remote/mcp> [--mode observe|enforce] [--port <n>]
                                                         live HTTP reverse proxy on localhost (Streamable HTTP);
                                                         auth from the server config entry (headers/auth) or MCP_AUTH_TOKEN;
                                                         point your MCP client at the printed URL; --port for wrap mode
  rugsnare canary record --name <server> [--url <https://...>] -- <command>   record tool-call traces (opt-in, local file)
  rugsnare canary replay --name <server> [--strict] [--include <tool>]... [--all-calls] [--url <https://...>] -- <command>
                                                         replay corpus vs new version (stdio or HTTP); read-only calls by default;
                                                         --include/--all-calls replay write-class (sandbox only); exit 1 = breaking
  rugsnare wrap <server-name>                            insert the RugSnare proxy into your MCP config
  rugsnare unwrap <server-name>                          restore the original (undo wrap)
  rugsnare receipts sign                                 Ed25519 hash-chain over the event log
  rugsnare receipts verify [--pub <pem>]                 check the chain; exit 1 = tampered
  rugsnare receipts export                               auditor dossier (md + json, AAT -05 fields)

verify: checks a local release artifact against the on-chain ReleaseLog pin
        (https only; non-public RPC hosts are refused).

Files (all local, gitignore .rugsnare/ or commit pins.json deliberately):
  .rugsnare/pins.json     pin store
  .rugsnare/config.json   mode + alert webhook
  .rugsnare/events.jsonl  append-only event log

Exit codes: 0 = clean, 1 = drift detected, 2 = config error, 3 = infrastructure error (no drift, but couldn't reach a server).
Modes: --schema-only = only BREAKING drift (schema changes) fails the build; --prose-only = only COSMETIC drift (description changes) fails. Default: both.`;

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
    else if (a === '--url') flags.url = argv[++i];
    else if (a === '--header') { (flags.header ??= []).push(argv[++i]); }
    else if (a === '--port') flags.port = Number(argv[++i]);
    else if (a === '--keep-last') flags.keepLast = parseInt(argv[++i], 10);
    else if (a === '--input') flags.input = argv[++i];
    else if (a === '--airgap') flags.airgap = true;
    else if (a === '--check-update') flags.checkUpdate = true;
    else if (a === '--allow-unsigned-pins') flags.allowUnsignedPins = true;
    else if (a === '--timeout') flags.timeout = parseInt(argv[++i], 10) || 15000;
    else if (a === '--last') flags.last = argv[++i];
    else if (a === '--from') flags.from = argv[++i];
    else if (a === '--to') flags.to = argv[++i];
    else if (a === '--stub-env') flags.stubEnv = true;
    else if (a === '--schema-only') flags.schemaOnly = true;
    else if (a === '--prose-only') flags.proseOnly = true;
    else if (a === '--fail-closed') flags.failClosed = true;
    else if (a === '--chameleon') flags.chameleon = true;
    else if (a === '--all-calls') flags.allCalls = true;
    else if (a === '--include') { (flags.include ??= []).push(argv[++i]); }
    else if (a === '--expect-tool') { (flags.expectTool ??= []).push(argv[++i]); }
    else if (a === '--forbid-tool') { (flags.forbidTool ??= []).push(argv[++i]); }
    else if (a === '--max-ms') flags.maxMs = parseInt(argv[++i], 10) || 0;
    else if (a === '--from') flags.from = argv[++i];
    else if (a === '--pub') flags.pub = argv[++i];
    else if (a === '--strict') flags.strict = true;
    else flags._.push(a);
  }
  return flags;
}

function readServersFromConfigFile(file) {
  const json = readJsonFile(file);
  const servers = json.mcpServers ?? {};
  // Accept both stdio (command) and HTTP (url) servers
  return Object.fromEntries(Object.entries(servers).filter(([, v]) => v && (typeof v.command === 'string' || typeof v.url === 'string')));
}

/**
 * Ad-hoc remote server (pre-install recon): `scan/diff --server <name> --url <https://...>`
 * [--header "Name: Value"]... — check a remote MCP server BEFORE adding it to
 * any config. Same trust model as curl: the operator names the target, so
 * local hosts are legitimate (local HTTP MCP servers); only the scheme is
 * restricted — http/https only, everything else is refused.
 */
function adhocServerEntry(flags) {
  if (!flags.url) return null;
  if (!flags.server) {
    console.error('--url needs --server <name> (the name the pins will be stored under)');
    process.exit(2);
  }
  let scheme;
  try { scheme = new URL(flags.url).protocol; } catch { scheme = null; }
  if (scheme !== 'http:' && scheme !== 'https:') {
    console.error(`--url must be http(s), got: ${flags.url}`);
    process.exit(2);
  }
  const entry = { url: flags.url };
  if (flags.header) {
    entry.headers = {};
    for (const h of flags.header) {
      const idx = h.indexOf(':');
      if (idx <= 0) { console.error(`--header expects "Name: Value", got: ${h}`); process.exit(2); }
      entry.headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    }
  }
  return entry;
}

function collectServers(flags) {
  // Ad-hoc: --server <name> + --url <https://...> overrides every config source
  const adhoc = adhocServerEntry(flags);
  if (adhoc) return { source: `--url ${adhoc.url}`, servers: { [flags.server]: adhoc } };
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
    if (!sp.cmd) continue;
    // HTTP transport: restore the url; stdio: restore the structured command
    fromPins[name] = sp.cmd.url ? { url: sp.cmd.url } : { command: sp.cmd.command, args: sp.cmd.args };
  }
  return { source: 'pins', servers: fromPins };
}

const STATUS_ICON = { UNCHANGED: 'ok ', DRIFT: 'DRIFT', NEW: 'NEW ', REMOVED: 'GONE', BREAKING: 'BRK ', COSMETIC: 'COS ' };

function printVerdict(server, verdicts, json) {
  if (json) {
    console.log(JSON.stringify({ server, verdicts }, null, 2));
    return;
  }
  for (const v of verdicts) {
    const hashes = v.oldHash ? ` ${short(v.oldHash)} -> ${short(v.hash)}` : v.hash ? ` ${short(v.hash)}` : '';
    const driftLabel = v.driftType ? ` (${v.driftType})` : '';
    // prompt/resource verdicts carry {item, kind}; tools carry {tool}
    const target = v.tool ?? `${v.item}${v.kind ? ` (${v.kind})` : ''}`;
    console.log(`  [${STATUS_ICON[v.status] ?? v.status}] ${target}${driftLabel}${hashes}`);
    // human-readable schema changes ("added required parameter 'mode'" not just "schema changed")
    if (v.schemaChanges && v.schemaChanges.length > 0) {
      for (const sc of v.schemaChanges) {
        const text = typeof sc === 'string' ? sc : sc.text;
        const dir = typeof sc === 'string' ? '' : ` [${sc.direction}]`;
        console.log(`      ${text}${dir}`);
      }
    }
    // notation-only drift ($schema dialect): the schema bytes changed but no
    // parameter did — shown softer, not scary
    if (v.driftType === 'NOTATION' && v.notationChanges) {
      for (const nc of v.notationChanges) console.log(`      ~ ${nc} (parameters unchanged)`);
    }
    // LOOSENED: constraints dropped — still drift, different failure mode
    if (v.driftType === 'LOOSENED') {
      console.log(`      ↳ validation loosened (constraints removed, exit 1)`);
    }
    // was/became text: what the agent actually read then vs reads now.
    // tools gate on proseChanged (schema-only drift keeps its old description);
    // prompts/resources have no proseChanged field and are pure prose.
    if (v.status === 'DRIFT'
      && typeof v.oldDescription === 'string' && typeof v.newDescription === 'string'
      && v.oldDescription !== v.newDescription
      && (v.proseChanged === undefined || v.proseChanged)) {
      console.log(`      WAS: ${oneLine(v.oldDescription)}`);
      console.log(`      NOW: ${oneLine(v.newDescription)}`);
    }
    // annotation flips render as key=value pairs (destructiveHint=false -> true)
    if (v.status === 'DRIFT' && v.driftType === 'ANNOTATION') {
      const fmt = (a) => (a && typeof a === 'object' && Object.keys(a).length)
        ? Object.entries(a).map(([k, val]) => `${k}=${val}`).join(' ')
        : '(none)';
      console.log(`      WAS annotations: ${fmt(v.oldAnnotations)}`);
      console.log(`      NOW annotations: ${fmt(v.newAnnotations)}`);
    }
  }
}

function oneLine(s) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > 200 ? `${t.slice(0, 197)}...` : t;
}

function badVerdicts(verdicts, flags) {
  let bad = verdicts.filter((v) => v.status !== 'UNCHANGED');
  // Schema-only: only BREAKING drift (schema changes) blocks the build
  if (flags?.schemaOnly) bad = bad.filter((v) => v.status !== 'DRIFT' || v.driftType === 'BREAKING');
  // Prose-only: only COSMETIC drift (description changes) blocks
  if (flags?.proseOnly) bad = bad.filter((v) => v.status !== 'DRIFT' || v.driftType === 'COSMETIC');
  return bad;
}

async function cmdScan(flags) {
  const { source, servers } = collectServers(flags);
  const pins = loadPins();
  const names = flags.server ? [flags.server] : Object.keys(servers);
  if (names.length === 0) { console.error('No MCP servers found. Pass --config <file> or run `rugsnare init`.'); process.exit(2); }
  if (!flags.json) console.log(`Scanning ${names.length} server(s) from: ${source}`);
  const report = []; // --json: machine-readable baseline inventory
  let failed = 0;
  let chameleonCount = 0;
  for (const name of names) {
    const entry = servers[name];
    if (!entry) { console.error(`  Server not found in sources: ${name}`); failed++; continue; }
    try {
      let tools, prompts, resources;
      let serverCmd;
      // hoisted so --chameleon can re-list under spoofed clients on either transport
      let command, args, env = {};
      let httpHeaders = {};

      if (typeof entry.url === 'string') {
        // HTTP transport (Streamable HTTP, spec 2025-06-18)
        const { fetchToolsHttp } = await import('./rpc-http.js');
        const { resolveAuth, authHelp } = await import('./auth.js');
        httpHeaders = resolveAuth(entry);
        env = entry.env ?? {};
        try {
          ({ tools, prompts, resources } = await fetchToolsHttp({ url: entry.url, headers: httpHeaders, env, timeoutMs: flags.timeout }));
        } catch (authErr) {
          if (/401|403|no permission|unauthorized/i.test(String(authErr))) {
            console.error(`  [AUTH] ${name}: server requires authentication`);
            console.error(`        ${authHelp(entry).split('\n').join('\n        ')}`);
          }
          throw authErr;
        }
        serverCmd = { url: entry.url };
      } else {
        // stdio transport
        ({ command, args, env } = serverCommand(entry));
        ({ tools, prompts, resources } = await fetchTools({ command, args, env, cwd: process.cwd(), timeoutMs: flags.timeout }));
        serverCmd = { command, args };
      }

      const serverPin = ensureServer(pins, name, serverCmd);
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
        if (!flags.json) console.error(`  [ADVISORY] ${name}/${adv.tool} — score ${adv.score}: ${adv.signals.map((s) => s.desc).join('; ')}`);
        logEvent({ kind: 'advisory', server: name, tool: adv.tool, score: adv.score, signals: adv.signals.map((s) => s.id) });
      }

      // prompts are instructions too — the same advisory signals apply to
      // prompt descriptions, not just tool descriptions
      const promptAdvisories = [];
      for (const p of prompts ?? []) {
        const r = scanToolDescription(p.description ?? '');
        if (r.advisory) {
          if (!flags.json) console.error(`  [ADVISORY] ${name}/prompt:${p.name} — score ${r.score}: ${r.signals.map((s) => s.desc).join('; ')}`);
          promptAdvisories.push({ prompt: p.name, score: r.score, signals: r.signals.map((s) => s.id) });
          logEvent({ kind: 'advisory', server: name, prompt: p.name, score: r.score, signals: r.signals.map((s) => s.id) });
        }
      }

      // floating-version advisory: unpinned npx/uvx/docker = auto-upgrade rug-pull vector
      const floating = [];
      if (typeof entry.command === 'string') {
        const { checkFloatingVersion } = await import('./floating.js');
        const floats = checkFloatingVersion({ command: entry.command, args: entry.args ?? [] });
        for (const f of floats) {
          if (!flags.json) console.error(`  [FLOATING] ${name}: ${f}`);
          floating.push(String(f));
          logEvent({ kind: 'floating-version', server: name, detail: f });
        }
      }

      if (!flags.json) console.log(`  pinned ${name}: ${tools.length} tool(s) -> ${tools.map((t) => t.name).join(', ')}`);
      logEvent({ kind: 'scan', server: name, tools: tools.length });

      // chameleon check (opt-in): does this server serve a different contract
      // when it thinks a real client is asking? Bait-and-switch per client.
      let chameleonFindings = [];
      if (flags.chameleon) {
        const { CHAMELEON_CLIENTS, compareAcrossClients } = await import('./chameleon.js');
        const perClient = {};
        for (const client of CHAMELEON_CLIENTS) {
          try {
            if (typeof entry.url === 'string') {
              // HTTP: per-client serving is trivially easy for a remote server —
              // the chameleon check matters MORE here than over stdio
              const { fetchToolsHttp } = await import('./rpc-http.js');
              perClient[client] = (await fetchToolsHttp({ url: entry.url, headers: httpHeaders, env, timeoutMs: flags.timeout, clientName: client })).tools;
            } else {
              perClient[client] = (await fetchTools({ command, args, env, cwd: process.cwd(), timeoutMs: flags.timeout, clientName: client })).tools;
            }
          } catch { /* client-specific listing failed — skip that client, not the scan */ }
        }
        const found = compareAcrossClients(tools, perClient);
        chameleonFindings = found;
        for (const f of found) {
          if (!flags.json) console.error(`  [CHAMELEON] ${name}/${f.tool} serves a ${f.kind === 'different' ? 'DIFFERENT contract' : f.kind === 'missing' ? 'contract WITHOUT this tool' : 'an EXTRA tool'} to client "${f.client}"`);
          logEvent({ kind: 'chameleon', server: name, tool: f.tool, client: f.client, mode: f.kind });
        }
        if (found.length > 0) chameleonCount += found.length;
      }

      report.push({
        server: name,
        transport: typeof entry.url === 'string' ? 'http' : 'stdio',
        tools: tools.map((t) => t.name),
        prompts: (prompts ?? []).map((p) => p.name),
        resources: (resources ?? []).map((r) => r.name ?? r.uri ?? '(unnamed)'),
        advisories: advisories.map((a) => ({ tool: a.tool, score: a.score, signals: a.signals.map((s) => s.id) })),
        promptAdvisories,
        floating,
        chameleon: chameleonFindings,
      });
    } catch (err) {
      if (!flags.json) console.error(`  FAILED ${name}: ${err.message}`);
      report.push({ server: name, error: String(err.message) });
      failed++;
    }
  }
  savePins(pins);
  // pins signing happens at the human-review points (scan/approve/unpin);
  // best-effort: machines without a receipts key simply skip the signature
  (await import('./receipts.js')).signPinsFile();
  const shadows = detectShadows(pins);
  for (const s of shadows) {
    if (!flags.json) console.error(`  [SHADOW] tool "${s.tool}" is exposed by multiple servers: ${s.servers.join(', ')} — the client's resolution order decides which one runs`);
    logEvent({ kind: 'shadow', tool: s.tool, servers: s.servers });
  }

  // skill scanning: SKILL.md / .mdc / rule files can carry poisoned instructions
  // just like tool descriptions (Snyk agent-scan popularized this check)
  let skillFindings = [];
  try {
    const { scanSkills } = await import('./skills.js');
    skillFindings = scanSkills();
    for (const sk of skillFindings) {
      if (!flags.json) console.error(`  [SKILL-ADVISORY] ${sk.app}/${path.basename(sk.file)} — score ${sk.score}: ${sk.signals.map((s) => s.desc).join('; ')}`);
      logEvent({ kind: 'skill-advisory', app: sk.app, file: sk.file, score: sk.score, signals: sk.signals.map((s) => s.id) });
    }
    if (skillFindings.length > 0 && !flags.json) {
      console.error(`rugsnare scan: ${skillFindings.length} skill file(s) with advisory findings (see above)`);
    }
  } catch { /* skills dir not found or permission — fine */ }

  if (flags.json) {
    // machine-readable baseline inventory; exit semantics identical to human mode
    console.log(JSON.stringify({
      scanned: names.length,
      failed,
      chameleonCount,
      servers: report,
      shadows,
      skills: skillFindings.map((sk) => ({ app: sk.app, file: path.basename(sk.file), score: sk.score, signals: sk.signals.map((s) => s.id) })),
    }, null, 2));
    if (chameleonCount > 0) process.exit(1);
    process.exit(failed > 0 ? 2 : 0);
  }

  if (!flags.json) console.log('');
  if (chameleonCount > 0) {
    console.error(`rugsnare scan: CHAMELEON findings: ${chameleonCount} (server serves different contracts per client)`);
    process.exit(1);
  }
  if (failed === names.length) {
    console.log('  ❌ All servers failed — no pins created. Check your config paths and server commands.');
  } else if (failed > 0) {
    console.log(`  ⚠️ Partially pinned: ${names.length - failed}/${names.length} succeeded, ${failed} failed.`);
  } else {
    console.log('  ✅ Pinned. Next steps:');
    console.log('     1. Commit .rugsnare/pins.json to your repo (this is your baseline)');
    console.log('     2. Add to CI:  rugsnare diff --config <your-config>  (exit 1 = build fails)');
    console.log('     3. Optional: use the PR-diff Action for human-readable contract review:');
    console.log('        https://github.com/Paraphern/rugsnare#pr-contract-review');
  }
  process.exit(failed > 0 ? 2 : 0);
}

async function cmdDiff(flags) {
  const pins = loadPins();
  // Signed pins (v0.9): an attacker editing pins.json in the repo/CI to force
  // a "clean" diff is caught by the signature. tampered is ALWAYS fatal;
  // unsigned-with-key fails unless --allow-unsigned-pins (bootstrap override).
  const { verifyPinsFile } = await import('./receipts.js');
  const pinsVerdict = verifyPinsFile();
  if (pinsVerdict.status === 'tampered') {
    console.error(`rugsnare: pins.sig TAMPERED — ${pinsVerdict.reason}. Refusing to diff against a modified pin store.`);
    process.exit(2);
  }
  if (pinsVerdict.status === 'unsigned' && !flags.allowUnsignedPins) {
    console.error('rugsnare: pins.json is unsigned while a signing key exists on this machine. Run `rugsnare scan` (re-pins and signs) or pass --allow-unsigned-pins to override once.');
    process.exit(2);
  }
  if (pinsVerdict.status === 'ok' && !flags.json && !flags.sarif) {
    console.error(`pins: signature ok (${(pinsVerdict.signedAt ?? '').slice(0, 10) || '?'})`);
  }
  // With --config, check what the client would run RIGHT NOW (path/version
  // swaps included). Without it, check the pinned command itself (the
  // classic "package updated in place" rug pull).
  // --url (with --server) overrides the transport for that one server:
  // compare the pins against THIS endpoint, whatever the configs say.
  const adhoc = adhocServerEntry(flags);
  let configServers = flags.config ? readServersFromConfigFile(flags.config) : null;
  if (adhoc) configServers = { ...(configServers ?? {}), [flags.server]: adhoc };
  const pinnedNames = Object.keys(pins.servers).filter((n) => pins.servers[n].cmd || configServers?.[n]);  const names = flags.server ? pinnedNames.filter((n) => n === flags.server) : pinnedNames;
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
    const configEntry = configServers?.[name];
    const isHttp = Boolean(configEntry?.url || sp.cmd?.url);
    const httpUrl = configEntry?.url ?? sp.cmd?.url;
    const stdioCmd = !isHttp ? (configEntry ? serverCommand(configEntry) : { command: sp.cmd.command, args: sp.cmd.args, env: {} }) : null;
    const displayCmd = isHttp ? httpUrl : [stdioCmd.command, ...stdioCmd.args].join(' ');

    // auth-passthrough: resolve headers from config auth, env vars, or platform credentials
    let httpHeaders = {};
    if (isHttp) {
      const { resolveAuth } = await import('./auth.js');
      httpHeaders = resolveAuth(configEntry ?? { url: httpUrl, headers: sp.cmd?.headers });
    }

    async function connect() {
      if (isHttp) {
        const { fetchToolsHttp } = await import('./rpc-http.js');
        return fetchToolsHttp({ url: httpUrl, headers: httpHeaders, env: configEntry?.env ?? {}, timeoutMs: flags.timeout });
      }
      return fetchTools({ command: stdioCmd.command, args: stdioCmd.args, env: stdioCmd.env ?? {}, cwd: process.cwd(), timeoutMs: flags.timeout });
    }

    try {
      // one connection per server: fetchTools/fetchToolsHttp return tools AND
      // prompts AND resources — spawning the server twice per diff is waste
      // (and for HTTP, a second full handshake)
      const { tools, prompts: livePrompts = [], resources: liveResources = [] } = await connect();
      const allVerdicts = compareTools(sp, tools, toolHash);
      // Filter display based on --schema-only / --prose-only
      const verdicts = flags.schemaOnly
        ? allVerdicts.filter((v) => v.status !== 'DRIFT' || v.driftType === 'BREAKING')
        : flags.proseOnly
          ? allVerdicts.filter((v) => v.status !== 'DRIFT' || v.driftType === 'COSMETIC')
          : allVerdicts;
      const { promptHash, resourceHash, comparePinned } = await import('./prompts.js');
      if (sp.prompts) verdicts.push(...comparePinned('prompt', sp.prompts, livePrompts, promptHash));
      if (sp.resources) verdicts.push(...comparePinned('resource', sp.resources, liveResources, resourceHash));
      for (const v of verdicts) {
        if (v.status === 'DRIFT') logEvent({ kind: 'drift', server: name, tool: v.tool, oldHash: v.oldHash, hash: v.hash });
        if (v.status === 'NEW') logEvent({ kind: 'new-tool', server: name, tool: v.tool, hash: v.hash });
      }
      const bad = badVerdicts(verdicts);
      driftCount += bad.length;
      if (!flags.json && !flags.sarif) {
        console.log(`${name}  (${displayCmd})`);
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
      console.log(`[SHADOW] tool "${s.tool}" is exposed by multiple servers: ${s.servers.join(', ')} — the client's resolution order decides which one runs`);
    }
  }
  // CI contract assertions: --expect-tool X (must be present) / --forbid-tool Y (must NOT appear — catches shadow injection)
  let assertionFails = 0;
  if (flags.expectTool || flags.forbidTool) {
    for (const r of report) {
      if (r.error) continue;
      const liveNames = new Set(r.verdicts.filter((v) => v.status !== 'REMOVED').map((v) => v.tool));
      for (const want of flags.expectTool ?? []) {
        if (!liveNames.has(want)) { assertionFails++; console.error(`[CONTRACT] ${r.server}: expected tool "${want}" is MISSING from the live contract`); }
      }
      for (const ban of flags.forbidTool ?? []) {
        if (liveNames.has(ban)) { assertionFails++; console.error(`[CONTRACT] ${r.server}: forbidden tool "${ban}" is PRESENT in the live contract`); }
      }
    }
  }
  const verdict = driftCount === 0 && assertionFails === 0 ? 'clean' : `DRIFT DETECTED (${driftCount} finding(s)${assertionFails > 0 ? `, ${assertionFails} assertion failure(s)` : ''})`;
  console.error(`rugsnare diff: ${verdict}${infraErrorCount > 0 ? ` (+${infraErrorCount} infra error(s))` : ''}`);
  // Exit codes: 0=clean, 1=drift, 2=config error, 3=infrastructure error only (no drift detected)
  if (driftCount > 0 || assertionFails > 0) process.exit(1);
  if (infraErrorCount > 0) process.exit(3);
  process.exit(0);
}

async function cmdApprove(flags, serverName) {
  if (!serverName) { console.error('Usage: rugsnare approve <server>'); process.exit(2); }
  const pins = loadPins();
  const sp = pins.servers[serverName];
  // transport override, same as diff: rugsnare approve X --url <endpoint>
  const adhoc = adhocServerEntry(flags);
  const configServers = flags.config ? readServersFromConfigFile(flags.config) : null;
  let configEntry = configServers?.[serverName] ?? null;
  if (adhoc && flags.server === serverName) configEntry = adhoc;
  if (!sp?.cmd && !configEntry) { console.error(`No pinned server named "${serverName}". Run \`rugsnare scan\` first.`); process.exit(2); }

  const isHttp = Boolean(configEntry?.url || sp.cmd?.url);
  const httpUrl = configEntry?.url ?? sp.cmd?.url;
  let connect;
  let pinCmd;
  if (isHttp) {
    const { fetchToolsHttp } = await import('./rpc-http.js');
    const { resolveAuth } = await import('./auth.js');
    const headers = resolveAuth(configEntry ?? { url: httpUrl });
    pinCmd = { url: httpUrl };
    connect = () => fetchToolsHttp({ url: httpUrl, headers, env: configEntry?.env ?? {}, timeoutMs: flags.timeout });
  } else {
    const cmd = configEntry ? serverCommand(configEntry) : { command: sp.cmd.command, args: sp.cmd.args, env: {} };
    pinCmd = { command: cmd.command, args: cmd.args };
    connect = () => fetchTools({ command: cmd.command, args: cmd.args, env: cmd.env ?? {}, cwd: process.cwd(), timeoutMs: flags.timeout });
  }

  const { tools, prompts = [], resources = [] } = await connect();
  const serverPin = ensureServer(pins, serverName, pinCmd);
  for (const tool of tools) pinTool(serverPin, tool, toolHash(tool), { approved: true });

  // Approve re-baselines prompts and resources wholesale: the human reviewed
  // the NEW state, so entries the server dropped must not ghost as REMOVED on
  // every future diff — and drifted prompt hashes must actually clear.
  // ensureServer returns the same object: capture the old maps before rewrite.
  const { promptHash, resourceHash } = await import('./prompts.js');
  const prevPrompts = serverPin.prompts ?? {};
  const prevResources = serverPin.resources ?? {};
  const now = new Date().toISOString();
  const nextPrompts = {};
  for (const p of prompts) {
    nextPrompts[p.name] = { hash: promptHash(p), description: p.description ?? '', firstSeen: prevPrompts[p.name]?.firstSeen ?? now };
  }
  serverPin.prompts = nextPrompts;
  const nextResources = {};
  for (const r of resources) {
    const key = r.name ?? r.uri ?? '(unnamed)';
    nextResources[key] = { hash: resourceHash(r), description: r.description ?? '', firstSeen: prevResources[key]?.firstSeen ?? now };
  }
  serverPin.resources = nextResources;

  savePins(pins);
  (await import('./receipts.js')).signPinsFile();
  logEvent({ kind: 'approve', server: serverName, tools: tools.length });
  console.log(`Re-pinned ${serverName}: ${tools.length} tool(s), ${Object.keys(nextPrompts).length} prompt(s), ${Object.keys(nextResources).length} resource(s) approved.`);
}

function ensureGitignore() {
  // Local rugsnare state must never leak into a repo by accident: events.jsonl
  // (tool names), config.json (webhook URL) and canary/calls.jsonl (full call
  // args + responses) are user data. pins.json is the deliberate exception —
  // the CI-gate workflow expects the baseline in the repo.
  const file = '.gitignore';
  const block = '# rugsnare local state (pins may be committed deliberately)\n**/.rugsnare/*\n!**/.rugsnare/pins.json\n!**/.rugsnare/pins.sig\n!**/.rugsnare/pins.pub.pem\n';
  let current = '';
  try { current = fs.readFileSync(file, 'utf8'); } catch { /* no .gitignore yet */ }
  if (!current.includes('**/.rugsnare/*')) {
    fs.writeFileSync(file, (current ? current.replace(/\s*$/, '\n') : '') + block);
    return 'created/updated .gitignore (.rugsnare/ ignored, pins.json allowed)';
  }
  return null;
}

function cmdInit() {
  fs.mkdirSync('.rugsnare', { recursive: true });
  if (!fs.existsSync(path.join('.rugsnare', 'config.json'))) {
    saveConfig(loadConfig());
  }
  const ignored = ensureGitignore();
  if (ignored) console.log(ignored);
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
 * rugsnare run --name <server> [--mode observe|enforce] [--fail-closed] [--url <https://...>] -- <command> [args...]
 * Wraps a stdio or HTTP MCP server with the live integrity proxy.
 * With --url: starts an HTTP reverse proxy on a local port (point your client at the printed URL).
 * Without --url: stdio proxy (spawn-server.js).
 */
/**
 * Resolve the auth config for an HTTP proxy session (`run --url`,
 * `canary record --url`): from the server's config entry (headers / auth
 * block), with MCP_AUTH_TOKEN as the env fallback. A WRAPPED http entry
 * carries its remote auth inside the wrap marker — the live entry points at
 * localhost — so read it from there.
 */
async function httpAuthConfig(name, flags) {
  const { servers } = collectServers({ config: flags.config });
  const configEntry = servers[name];
  const { originalOf } = await import('./wrap.js');
  const original = originalOf(configEntry);
  const authSource = original?.url ? original : configEntry;
  return authSource && (authSource.headers || authSource.auth)
    ? authSource
    : { auth: process.env.MCP_AUTH_TOKEN ? { type: 'bearer', token: process.env.MCP_AUTH_TOKEN } : null };
}

async function cmdRun(flags) {
  const name = flags.name;
  const mode = flags.mode === 'enforce' ? 'enforce' : 'observe';

  // HTTP proxy mode: rugsnare run --name X --url https://remote/mcp
  if (flags.url) {
    const { startHttpProxy } = await import('./proxy-http.js');
    const config = loadConfig();
    if (flags.failClosed) config.failMode = 'closed';
    // Auth from the server's own config entry (headers / auth block), with
    // MCP_AUTH_TOKEN as the env fallback when the entry has neither.
    // NOTE: no adhocServerEntry here — in `run`, --url IS the target, not an
    // ad-hoc scan target; we only look the name up in real configs.
    const authConfig = await httpAuthConfig(name, flags);
    let started;
    try {
      started = await startHttpProxy({
        name, targetUrl: flags.url, mode, config, cwd: process.cwd(), authConfig, port: flags.port,
      });
    } catch (startErr) {
      console.error(`[rugsnare] ${startErr.message}`);
      process.exit(2);
    }
    const { port, url } = started;
    console.error(`[rugsnare] HTTP proxy for "${name}" listening on ${url} (${mode} mode)`);
    console.error(`[rugsnare] Point your MCP client at this URL. Ctrl+C to stop.`);
    if (mode === 'enforce') console.error(`[rugsnare] enforce: drifted tools will be quarantined mid-session`);
    return; // server keeps running
  }

  const dashdash = flags._.indexOf('--');
  const argv = dashdash >= 0 ? flags._.slice(dashdash + 1) : flags._;
  const command = argv[0];
  const args = argv.slice(1).map(String);
  if (!name || !command) {
    console.error('Usage: rugsnare run --name <server> [--mode observe|enforce] [--url <https://...>] -- <command> [args...]');
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
  if (flags.failClosed) config.failMode = 'closed';
  const child = spawnServer({
    command, args, env: {}, cwd: process.cwd(),
    onStdout: () => {},
    onStderr: () => {},
    onExit: () => {},
  });
  // the child process object itself carries real stdin/stdout/stderr streams
  // and exit/error handlers — the proxy consumes exactly that shape
  const streams = { clientIn: process.stdin, server: child };
  console.error(`[rugsnare] proxying "${name}" in ${mode} mode${config.failMode === 'closed' ? ' (fail-closed)' : ''} (Ctrl+C to stop)`);
  createProxy({ name, streams, mode, config, cwd: process.cwd() });
}

/**
 * rugsnare canary record --name <server> [--mode observe|enforce] -- <command> [args...]
 * Same live proxy as `run`, but with trace recording enabled FOR THIS SESSION
 * ONLY (the config file is never touched): every tool call that passes through
 * is written, id-correlated with its response, to .rugsnare/canary/calls.jsonl.
 * That corpus is later replayed by `rugsnare canary replay` against a new
 * version of the server. Local file, capped, gitignored — see src/canary.js.
 */
async function cmdCanaryRecord(flags) {
  const name = flags.name;
  const mode = flags.mode === 'enforce' ? 'enforce' : 'observe';
  const rest = flags._.slice(1); // drop the 'record' positional
  const dashdash = rest.indexOf('--');
  const argv = dashdash >= 0 ? rest.slice(dashdash + 1) : rest;
  const command = argv[0];
  const args = argv.slice(1).map(String);

  // HTTP transport: record through the HTTP reverse proxy (same capture
  // format as stdio — the replay engine takes either corpus)
  if (flags.url) {
    if (!name) { console.error('Usage: rugsnare canary record --name <server> --url <https://...>'); process.exit(2); }
    const config = { ...loadConfig(), canaryRecord: true }; // session-only override
    const authConfig = await httpAuthConfig(name, flags);
    const { startHttpProxy } = await import('./proxy-http.js');
    let started;
    try {
      started = await startHttpProxy({ name, targetUrl: flags.url, mode, config, cwd: process.cwd(), authConfig, port: flags.port });
    } catch (startErr) {
      console.error(`[rugsnare] ${startErr.message}`);
      process.exit(2);
    }
    console.error(`[rugsnare] recording "${name}" through the HTTP proxy on ${started.url} -> .rugsnare/canary/calls.jsonl (${mode} mode, Ctrl+C to stop)`);
    console.error(`[rugsnare] point your MCP client at ${started.url}`);
    return; // server keeps running
  }

  if (!name || !command) {
    console.error('Usage: rugsnare canary record --name <server> -- <command> [args...]   (or --url <endpoint>)');
    process.exit(2);
  }
  let spawnServer;
  try {
    ({ spawnServer } = await import('./spawn-server.js'));
  } catch {
    console.error('Missing src/spawn-server.js — the repo owner creates this file once (see README, "What\'s inside").');
    process.exit(2);
  }
  const config = { ...loadConfig(), canaryRecord: true }; // session-only override
  const child = spawnServer({
    command, args, env: {}, cwd: process.cwd(),
    onStdout: () => {},
    onStderr: () => {},
    onExit: () => {},
  });
  const streams = { clientIn: process.stdin, server: child };
  console.error(`[rugsnare] recording "${name}" to .rugsnare/canary/calls.jsonl (${mode} mode, Ctrl+C to stop)`);
  console.error('[rugsnare] the corpus stays on this machine — delete the file any time');
  createProxy({ name, streams, mode, config, cwd: process.cwd() });
}

/**
 * rugsnare canary replay --name <server> [--strict] [--json] [--timeout ms] -- <command> [args...]
 * Replays the recorded corpus against a (usually newer) server, diffs the
 * contract (split hash) AND the behavior (response shapes, error flips) —
 * deterministic rules only, no LLM, no crying wolf on value-only changes.
 * Exit codes: 0 = safe, 1 = breaking findings (or cosmetic with --strict),
 * 2 = no corpus / config error, 3 = replay infrastructure failure.
 */
async function cmdCanaryReplay(flags) {
  const name = flags.name;
  const rest = flags._.slice(1);
  const dashdash = rest.indexOf('--');
  const argv = dashdash >= 0 ? rest.slice(dashdash + 1) : rest;
  const timeoutMs = flags.timeout || 15000;
  const pins = loadPins();
  const serverPin = pins.servers?.[name];

  // transport: explicit --url beats the pinned command (remote servers)
  let url = flags.url ?? null;
  let command = argv[0];
  let args = argv.length > 1 ? argv.slice(1).map(String) : [];
  if (!command && !url && serverPin?.cmd?.url) url = serverPin.cmd.url;
  if (!command && !url && serverPin?.cmd) {
    command = serverPin.cmd.command;
    args = Array.isArray(serverPin.cmd.args) ? serverPin.cmd.args.map(String) : [];
  }
  if (!name || (!command && !url)) {
    console.error('Usage: rugsnare canary replay --name <server> [--strict] [--json] [--url <https://...>] -- <new-command> [args...]');
    console.error('(no -- command and no --url: falls back to the pinned command/url from .rugsnare/pins.json)');
    process.exit(2);
  }

  const traces = (await import('./canary.js')).readTraces();
  const corpus = traces.filter((t) => t.kind === 'call-trace' && t.server === name);
  if (corpus.length === 0) {
    console.error(`No recorded calls for "${name}". Run: rugsnare canary record --name ${name} -- <command>  (or --url <endpoint>)`);
    process.exit(2);
  }
  const recordedInfo = traces.find((t) => t.kind === 'server-info' && t.server === name);

  const { replayCorpus, classifyReplay } = await import('./canary-replay.js');
  const result = await replayCorpus({
    command, args, url, cwd: process.cwd(), corpus, timeoutMs,
    include: flags.include ?? [], allCalls: Boolean(flags.allCalls),
  });
  if (result.error) { console.error(`replay failed: ${result.error}`); process.exit(3); }

  const report = classifyReplay({
    serverPin: serverPin ?? { tools: {} },
    liveTools: result.tools,
    replayCalls: result.calls,
    maxMs: flags.maxMs ?? 0,
  });
  const summary = {
    server: name,
    recorded: { calls: corpus.length, serverInfo: recordedInfo?.serverInfo ?? null },
    live: { serverInfo: result.serverInfo, tools: result.tools.length },
    replayed: result.calls.length,
    sameShape: report.ok,
    findings: report.findings,
    verdict: report.verdict,
  };

  if (flags.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`RugSnare canary replay — "${name}"`);
    console.log(`recorded: ${corpus.length} call(s) against ${recordedInfo?.serverInfo?.version ?? 'unknown version'}`);
    console.log(`live:     ${result.serverInfo?.version ?? 'unknown version'} (${result.tools.length} tool(s))`);
    console.log('');
    for (const f of report.findings) {
      console.log(`  ${f.severity.padEnd(8)} ${f.where === 'call' ? `call ${f.tool}` : `${f.where} ${f.tool}`}: ${f.reason}`);
    }
    if (report.findings.length === 0) console.log('  (no contract or behavior changes found)');
    console.log(`  ${report.ok}/${result.calls.length} call(s) replayed with identical shape`);
    console.log('');
    if (report.skipped > 0) {
      console.log(`  ⚠ replay is read-only by default: ${report.skipped} call(s) NOT replayed (${report.skippedWrites} write-class, ${report.skippedDestructive} destructive-looking) — see the SKIPPED lines above`);
    }
    console.log(`verdict: ${report.verdict} (breaking: ${report.breaking}, cosmetic: ${report.cosmetic})`);
  }

  if (report.breaking > 0 || (flags.strict && report.cosmetic > 0) || (flags.maxMs > 0 && report.slow > 0)) process.exit(1);
}

/**
 * rugsnare receipts sign|verify|export (Phase B).
 * Tamper-evident audit trail: Ed25519 hash-chain over the local event log.
 * Keys are generated locally on first sign (.rugsnare/keys/, gitignored) —
 * they never leave the machine; the fingerprint identifies the key in exports.
 */
async function cmdReceiptsSign(flags) {
  const { ensureKeys, signEvents, receiptsPath } = await import('./receipts.js');
  const { readEvents } = await import('./events.js');
  const events = readEvents();
  if (events.length === 0) { console.error('No events in .rugsnare/events.jsonl — run the proxy or scan first.'); process.exit(2); }
  const { privateKey, publicKey, created, fingerprint } = ensureKeys();
  const receipts = signEvents(events, privateKey);
  const fsMod = await import('node:fs');
  fsMod.writeFileSync(receiptsPath(), receipts.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`signed ${receipts.length} entr(ies) -> .rugsnare/receipts.jsonl`);
  if (created) console.log(`new Ed25519 key generated (fingerprint ${fingerprint.slice(0, 16)}…) — back it up if receipts must stay verifiable after a machine loss`);
  console.log(`chain head: ${receipts[receipts.length - 1].entryHash}`);
}

async function cmdReceiptsVerify(flags) {
  const { verifyReceipts, receiptsPath, loadPublicKey, keyFingerprint } = await import('./receipts.js');
  const from = flags.from || receiptsPath();
  let receipts;
  try {
    receipts = (await import('node:fs')).readFileSync(from, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch { console.error(`cannot read ${from}`); process.exit(2); }
  if (receipts.length === 0) { console.error('no receipts — run `rugsnare receipts sign` first'); process.exit(2); }

  let publicKey;
  let fingerprint;
  if (flags.pub) {
    // verify against an exported public key (auditor / after machine loss)
    const fsMod = await import('node:fs');
    try {
      const pem = fsMod.readFileSync(flags.pub, 'utf8');
      publicKey = (await import('node:crypto')).createPublicKey(pem);
      fingerprint = keyFingerprint(pem);
    } catch { console.error(`cannot read public key ${flags.pub}`); process.exit(2); }
  } else {
    const local = loadPublicKey();
    if (!local) { console.error('no local signing key — pass --pub <ed25519.pub.pem> to verify with an exported key'); process.exit(2); }
    ({ publicKey, fingerprint } = local);
  }

  const result = verifyReceipts(receipts, publicKey);
  console.log(`key fingerprint: ${fingerprint.slice(0, 16)}…`);
  console.log(`entries: ${result.count}   span: ${result.first ?? '?'} → ${result.last ?? '?'}`);
  if (result.ok) {
    console.log('chain intact — every entry matches its hash, link, and signature');
  } else {
    console.error(`BROKEN: ${result.reason}`);
    process.exit(1);
  }
}

/**
 * rugsnare skills scan | skills diff | skills report
 * Pin, diff, and report on AI agent skill files (SKILL.md, .mdc, etc.)
 * across Claude Code, Cursor, Windsurf, Continue, ZCode, Copilot, and others.
 *
 *   rugsnare skills scan     → discover and pin all skill files
 *   rugsnare skills diff     → check for changes since last pin (exit 1 on drift)
 *   rugsnare skills report   → generate HTML report and open in browser
 */
/**
 * rugsnare history <package> — scan a package's whole published history
 * for silent contract changes (runtime truth: every version is run and
 * its tools/list is taken, exactly like a real MCP client would).
 */
async function cmdHistory(flags) {
  const { scanHistory, parsePackageName } = await import('./history.js');
  const raw = flags._[0];
  if (!raw) { console.error('Usage: rugsnare history <npm-package> [--last N] [--json]'); process.exit(2); }
  let name;
  try { name = parsePackageName(raw); } catch (e) { console.error(e.message); process.exit(2); }
  const last = Number(flags.last) > 0 ? Number(flags.last) : 10;
  const { from, to } = flags;

  console.error(`history scan: ${name} (last ${last} versions)`);
  console.error('NOTE: this downloads and RUNS each version locally — the same code you would run by installing it.');
  const result = await scanHistory(name, {
    last,
    from,
    to,
    stubEnv: Boolean(flags.stubEnv),
    onProgress: (m) => { if (!flags.json) console.error(`  ${m}`); },
  });

  if (flags.json) { console.log(JSON.stringify(result, null, 2)); }
  else {
    for (const { from, to, toPublishedAt, findings } of result.pairs) {
      if (findings.length === 0) continue;
      const pubDate = toPublishedAt ? ` (published ${String(toPublishedAt).slice(0, 10)})` : '';
      console.log(`\n${from} -> ${to}${pubDate}: ${findings.length} finding(s)`);
      for (const f of findings) {
        const driftLabel = f.driftType ? ` (${f.driftType})` : '';
        console.log(`  [${f.status}] ${f.tool}${driftLabel}`);
        if (f.oldDescription !== undefined && f.oldDescription !== f.newDescription) {
          console.log(`      WAS: ${String(f.oldDescription).replace(/\s+/g, ' ').slice(0, 200)}`);
          console.log(`      NOW: ${String(f.newDescription ?? '').replace(/\s+/g, ' ').slice(0, 200)}`);
        }
      }
    }
    if (result.unreachable.length > 0) {
      console.log(`\nunreachable versions (${result.unreachable.length}, excluded from the diff):`);
      for (const u of result.unreachable.slice(0, 5)) console.log(`  ${u.version}: ${u.reason}`);
      if (result.unreachable.length > 5) console.log(`  ... +${result.unreachable.length - 5} more`);
    }
    const verdict = result.checked === 0
      ? '— NO DATA (nothing could be scanned)'
      : result.clean ? '— CLEAN' : '— SILENT CHANGES FOUND';
    console.log(`\nhistory: ${result.checked} version(s) checked, ${result.silentChanges} silent change(s) ${verdict}`);
  }
  if (result.checked === 0) {
    console.error(`history: no version of ${result.package} could be scanned — "no data" is not "no changes" (exit 2)`);
    process.exit(2);
  }
  process.exit(result.clean ? 0 : 1);
}

async function cmdSkills(flags) {
  const sub = flags._[0];
  const { discoverSkills, pinAllSkills, diffSkills } = await import('./skills-pin.js');
  const { writeSkillsReport } = await import('./skills-report.js');
  const pins = loadPins();
  const cwd = process.cwd();

  if (sub === 'scan') {
    // respect HOME override for isolation (tests set HOME to tmp dir)
    const home = process.env.RUGSNARE_TEST_HOME ?? os.homedir?.() ?? process.env.HOME ?? process.env.USERPROFILE ?? '';
    const { pinned } = pinAllSkills(pins, cwd, home);
    savePins(pins);
    (await import('./receipts.js')).signPinsFile();
    console.log(`Pinned ${pinned} skill file(s).`);
    console.log(`Run \`rugsnare skills diff\` to check for changes, or \`rugsnare skills report\` for a visual report.`);
    // cold-start audit: pinning blesses whatever is on disk — also say what
    // ALREADY looks suspicious before the baseline existed
    const { auditCurrentSkills } = await import('./skills-pin.js');
    const audit = auditCurrentSkills(cwd, home);
    if (audit.length > 0) {
      console.log(`\n${audit.length} file(s) in your current skills contain risk patterns (they were like this BEFORE pinning — not update drift):`);
      for (const f of audit.slice(0, 10)) {
        console.log(`  [!] ${f.key} (score ${f.score}: ${f.signals.join(', ')})`);
      }
      if (audit.length > 10) console.log(`  ... +${audit.length - 10} more`);
      console.log('Run `rugsnare skills report` to see them highlighted in the report.');
    }
    return;
  }

  if (sub === 'diff' || sub === 'report') {
    if (!pins.skills || Object.keys(pins.skills).length === 0) {
      console.error('No skills pinned yet. Run `rugsnare skills scan` first.');
      process.exit(2);
    }
    const home = process.env.RUGSNARE_TEST_HOME ?? os.homedir?.() ?? process.env.HOME ?? process.env.USERPROFILE ?? '';
    const results = diffSkills(pins, cwd, home);
    const bad = results.filter((r) => r.status === 'DRIFT' || r.status === 'NEW' || r.status === 'REMOVED');

    if (sub === 'report') {
      // Include MCP drift results alongside skills for a unified report
      let mcpResults = [];
      if (Object.keys(pins.servers ?? {}).length > 0) {
        try {
          const { compareTools } = await import('./pins.js');
          const { toolHash } = await import('./hash.js');
          const configServers = flags.config ? readServersFromConfigFile(flags.config) : null;
          const pinNames = Object.keys(pins.servers).filter((n) => pins.servers[n].cmd || configServers?.[n]);
          for (const name of pinNames) {
            const sp = pins.servers[name];
            const isHttp = Boolean(configServers?.[name]?.url || sp.cmd?.url);
            const httpUrl = configServers?.[name]?.url ?? sp.cmd?.url;
            if (!isHttp) continue; // MCP-over-stdio needs spawn, skip in report (CLI diff covers it)
            const { fetchToolsHttp } = await import('./rpc-http.js');
            const { resolveAuth } = await import('./auth.js');
            const tools = (await fetchToolsHttp({ url: httpUrl, headers: resolveAuth({}), timeoutMs: flags.timeout })).tools;
            const verdicts = compareTools(sp, tools, toolHash);
            mcpResults.push({ server: name, verdicts: verdicts.filter((v) => v.status !== 'UNCHANGED') });
          }
        } catch { /* MCP fetch failed — skills report still works */ }
      }

      const { auditCurrentSkills } = await import('./skills-pin.js');
      const currentAudit = auditCurrentSkills(cwd, home);
      const { reportPath, counts } = writeSkillsReport(results, cwd, mcpResults, currentAudit);
      console.log(`Report: ${reportPath}`);
      const totalBad = counts.dangerous + mcpResults.reduce((n, r) => n + r.verdicts.length, 0);
      console.log(`  ${totalBad} total finding(s) (${counts.dangerous} dangerous skills, ${mcpResults.reduce((n, r) => n + r.verdicts.length, 0)} MCP contract changes)`);
      if (currentAudit.length > 0) {
        console.log(`  ${currentAudit.length} pre-existing risk file(s) (already on your machine before the baseline)`);
      }
      // open in browser: rundll32 FileProtocolHandler on Windows — no cmd
      // shell, no argument re-parsing (same approach as the Go launcher)
      const { execFile } = await import('node:child_process');
      const plat = process.platform;
      if (plat === 'win32') {
        execFile('rundll32', ['url.dll,FileProtocolHandler', reportPath], () => {});
      } else if (plat === 'darwin') {
        execFile('open', [reportPath], () => {});
      } else {
        execFile('xdg-open', [reportPath], () => {});
      }
      return;
    }

    // diff (CLI output)
    for (const r of results) {
      const icon = { UNCHANGED: 'ok ', DRIFT: 'DRIFT', NEW: 'NEW ', REMOVED: 'GONE' }[r.status] ?? '?';
      const sev = r.severity ? ` (${r.severity})` : '';
      console.log(`  [${icon}] ${r.key}${sev}`);
      if (r.status === 'DRIFT' && r.changes?.added?.length) {
        for (const line of r.changes.added.slice(0, 3)) {
          console.log(`    + ${line.trim().slice(0, 80)}`);
        }
      }
    }
    const summary = `Skills: ${bad.length} finding(s) (${results.filter((r) => r.severity === 'DANGEROUS').length} dangerous)`;
    console.error(`\nrugsnare skills diff: ${bad.length > 0 ? 'DRIFT DETECTED' : 'clean'} - ${summary}`);
    if (bad.length > 0) process.exit(1);
    return;
  }

  console.error('Usage: rugsnare skills <scan|diff|report>');
  console.error('  scan    - discover and pin all skill files');
  console.error('  diff    - check for changes (exit 1 = drift detected)');
  console.error('  report  - generate HTML report and open in browser');
  process.exit(2);
}

async function cmdReceiptsExport(flags) {
  const { exportDossier, readReceipts, loadPublicKey } = await import('./receipts.js');
  const receipts = readReceipts();
  if (receipts.length === 0) { console.error('no receipts — run `rugsnare receipts sign` first'); process.exit(2); }
  const local = loadPublicKey();
  if (!local) { console.error('no local signing key — receipts were signed elsewhere; export needs its public key context'); process.exit(2); }
  const { markdown, json } = exportDossier(receipts, { fingerprint: local.fingerprint });
  const fsMod = await import('node:fs');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const mdFile = `.rugsnare/dossier-${stamp}.md`;
  const jsonFile = `.rugsnare/dossier-${stamp}.json`;
  fsMod.mkdirSync('.rugsnare', { recursive: true });
  fsMod.writeFileSync(mdFile, markdown);
  fsMod.writeFileSync(jsonFile, JSON.stringify(json, null, 2) + '\n');
  console.log(`dossier written: ${mdFile}, ${jsonFile} (${receipts.length} actions)`);
}

/**
 * rugsnare mcp — run RugSnare itself as a read-only MCP server (stdio).
 * Marketplace distribution entry point: the same binary users install for
 * the CI gate doubles as an agent-callable tool (drift_feed_status over
 * public data, pins_report over the local pin store). See src/mcp-server.js.
 */
async function cmdMcp() {
  const { runMcpServer } = await import('./mcp-server.js');
  runMcpServer();
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
    const lastPinned = Object.values(sp.tools).reduce((latest, t) => (t.pinnedAt > latest ? t.pinnedAt : latest), '') || '—';

    let liveStatus = '';
    if (flags.live && sp.cmd) {
      try {
        let tools;
        if (sp.cmd.url) {
          const { fetchToolsHttp } = await import('./rpc-http.js');
          const { resolveAuth } = await import('./auth.js');
          tools = (await fetchToolsHttp({ url: sp.cmd.url, headers: resolveAuth({}), timeoutMs: flags.timeout })).tools;
        } else {
          ({ tools } = await fetchTools({ command: sp.cmd.command, args: sp.cmd.args, env: {}, cwd: process.cwd(), timeoutMs: flags.timeout }));
        }
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
 * rugsnare doctor — self-diagnosis of the local setup: environment, discovered
 * configs, pin-store health, unreviewed pins, policies, receipts chain, canary
 * corpus. Informational by design; exit 2 only when the setup itself is broken
 * (unusable environment, unreadable pin store, broken receipts chain).
 */
async function cmdDoctor(flags) {
  const problems = [];
  const warn = (m) => console.log(`  [warn] ${m}`);

  console.log(`node ${process.versions.node} (${process.platform})`);
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 18) problems.push(`node >= 18 required, running ${process.versions.node}`);

  // version section: the "no silent updates" promise, applied to ourselves.
  // Offline by default (doctor must never depend on the network); the registry
  // comparison is one user-initiated GET via --check-update, nothing is sent.
  const { getVersion, fetchLatestVersion, compareVersions } = await import('./version.js');
  const current = getVersion();
  if (flags?.checkUpdate) {
    const latest = await fetchLatestVersion({ timeoutMs: 5000 });
    if (latest === null) {
      console.log(`\nversion: ${current} (registry unreachable — try again later)`);
    } else if (compareVersions(current, latest) < 0) {
      console.log(`\nversion: ${current}`);
      warn(`newer release on npm: ${latest} — npx without a pin floats to latest every launch;`);
      warn(`  review the changelog, then pin: npx --yes rugsnare@${latest}`);
      console.log(`  changelog: https://github.com/Paraphern/rugsnare/blob/main/product/CHANGELOG.md`);
    } else if (compareVersions(current, latest) > 0) {
      console.log(`\nversion: ${current} (ahead of npm's ${latest} — local/dev build)`);
    } else {
      console.log(`\nversion: ${current} (up to date)`);
    }
  } else {
    console.log(`\nversion: ${current} (run \`rugsnare doctor --check-update\` to compare against npm)`);
  }

  const configs = discoverConfigs().filter((c) => c.servers && Object.keys(c.servers).length > 0);
  console.log(`\nconfigs: ${configs.length} source(s) with servers`);
  for (const c of configs.slice(0, 10)) console.log(`  ${c.app}/${c.scope}: ${Object.keys(c.servers).length} server(s)`);
  if (configs.length > 10) console.log(`  ... +${configs.length - 10} more`);
  if (configs.length === 0) warn('no MCP configs discovered — pass --config explicitly');

  let pins = null;
  try { pins = loadPins(); } catch (e) { problems.push(`pins.json unreadable: ${e.message}`); }
  if (pins) {
    const servers = Object.keys(pins.servers ?? {});
    let toolCount = 0;
    const unapproved = [];
    for (const [name, sp] of Object.entries(pins.servers ?? {})) {
      for (const [tool, pin] of Object.entries(sp.tools ?? {})) {
        toolCount += 1;
        if (!pin.approved) unapproved.push(`${name}/${tool}`);
      }
    }
    console.log(`\npins: ${servers.length} server(s), ${toolCount} tool(s)`);
    if (servers.length === 0) warn('nothing pinned — run `rugsnare scan`');
    if (unapproved.length > 0) {
      warn(`${unapproved.length} pinned but NEVER APPROVED (first sight, no human review yet):`);
      for (const u of unapproved.slice(0, 10)) console.log(`    ${u}`);
      if (unapproved.length > 10) console.log(`    ... +${unapproved.length - 10} more`);
      console.log('    review with `rugsnare diff`, then `rugsnare approve <server>`');
    }
  }

  const config = loadConfig();
  console.log(`\nmode: ${config.mode}, failMode: ${config.failMode}, webhook: ${config.alertWebhook ? 'configured' : 'none'}`);

  const policyFile = path.join(process.cwd(), '.rugsnare', 'policies.json');
  if (fs.existsSync(policyFile)) {
    try {
      const { validate: validatePolicies } = await import('./policies.js');
      validatePolicies(readJsonFile(policyFile));
      console.log('policies: valid');
    } catch (e) {
      warn(`policies.json invalid (${e.message}) — the live proxy falls back to built-in defaults`);
    }
  } else {
    console.log('policies: built-in defaults (no policies.json)');
  }

  const { loadPublicKey, readReceipts, verifyReceipts, verifyPinsFile } = await import('./receipts.js');
  const pinsSig = verifyPinsFile();
  if (pinsSig.status === 'ok') console.log(`pins signature: ok (${(pinsSig.signedAt ?? '').slice(0, 10) || '?'}, key: ${pinsSig.keySource ?? 'local'})`);
  else if (pinsSig.status === 'tampered') problems.push(`pins.sig TAMPERED: ${pinsSig.reason} — \`rugsnare diff\` will refuse these pins`);
  else if (pinsSig.status === 'unsigned') warn('pins.json unsigned while a verification key exists — run `rugsnare scan` to re-pin and sign');
  else if (pinsSig.status === 'nokey' && pinsSig.note) warn(pinsSig.note);
  // nokey without note: normal pre-signature state, silent
  const pub = loadPublicKey();
  if (!pub) {
    console.log('receipts: no signing key (`rugsnare receipts sign` creates one)');
  } else {
    const receipts = readReceipts();
    if (receipts.corrupt > 0) {
      problems.push(`receipts.jsonl has ${receipts.corrupt} unparseable line(s) — truncated or tampered audit trail; run \`rugsnare receipts sign\` to re-chain the readable part`);
    }
    if (receipts.length === 0) {
      console.log('receipts: key present, nothing signed yet');
    } else {
      const verdict = verifyReceipts(receipts, pub.publicKey);
      if (verdict.ok) console.log(`receipts: ${verdict.count} signed, chain intact (${verdict.first?.slice(0, 10)} → ${verdict.last?.slice(0, 10)})`);
      else problems.push(`receipts chain BROKEN: ${verdict.reason}`);
    }
  }

  const canaryFile = path.join(process.cwd(), '.rugsnare', 'canary', 'calls.jsonl');
  if (fs.existsSync(canaryFile)) {
    const traces = fs.readFileSync(canaryFile, 'utf8').split('\n').filter(Boolean).length;
    console.log(`canary corpus: ${traces} trace(s)`);
  }

  const evPath = eventsPath();
  if (fs.existsSync(evPath)) {
    const sizeMb = fs.statSync(evPath).size / (1024 * 1024);
    if (sizeMb > 10) warn(`events.jsonl is ${sizeMb.toFixed(1)} MB — trim old entries: rugsnare events trim --keep-last 5000 (receipts stay intact)`);
  }

  console.log('');
  if (problems.length > 0) {
    for (const p of problems) console.error(`  [PROBLEM] ${p}`);
    console.error('doctor: NOT OK');
    process.exit(2);
  }
  console.log('doctor: OK');
}

/**
 * rugsnare events trim --keep-last <n> — shrink the local event log to the
 * last n entries. Explicit operator action (the log is append-only by
 * contract); receipts.jsonl is hash-chained separately and is never touched.
 */
async function cmdEvents(flags) {
  const sub = flags._[0];
  const { trimEvents, readEvents, eventsPath } = await import('./events.js');
  if (sub === 'trim') {
    if (!Number.isInteger(flags.keepLast)) { console.error('Usage: rugsnare events trim --keep-last <n>'); process.exit(2); }
    const { kept, dropped } = trimEvents({ keepLast: flags.keepLast });
    console.log(`events: kept ${kept}, dropped ${dropped} (${eventsPath()})`);
    if (dropped > 0) console.log('receipts.jsonl was not touched — signed history stays verifiable');
    return;
  }
  if (sub === 'count' || !sub) {
    const events = readEvents();
    console.log(`events: ${events.length} entr(ies) in ${eventsPath()}`);
    const st = fs.existsSync(eventsPath()) ? fs.statSync(eventsPath()) : null;
    if (st) console.log(`size: ${(st.size / 1024).toFixed(1)} KiB`);
    return;
  }
  console.error('Usage: rugsnare events [count] | rugsnare events trim --keep-last <n>');
  process.exit(2);
}

/**
 * rugsnare config [list] | get <key> | set <key> <value>
 * Edit .rugsnare/config.json without hand-editing JSON. Values are validated:
 * a typo'd mode or a non-http webhook must fail here, not silently at runtime.
 */
async function cmdConfig(flags) {
  const [sub, key, ...rest] = flags._;
  const config = loadConfig();
  const ENUMS = { mode: ['observe', 'enforce'], failMode: ['open', 'closed'] };
  const BOOLEANS = ['logCallArgs', 'canaryRecord'];
  const INTS = ['loopThreshold', 'resultThreshold'];
  const URLS = ['alertWebhook'];
  const KEYS = [...Object.keys(ENUMS), ...BOOLEANS, ...INTS, ...URLS];
  const usage = () => { console.error(`Usage: rugsnare config [list] | get <key> | set <key> <value>\nKeys: ${KEYS.join(', ')}`); process.exit(2); };

  if (!sub || sub === 'list') {
    for (const k of KEYS) console.log(`${k}: ${JSON.stringify(config[k] ?? null)}`);
    return;
  }
  if (!KEYS.includes(key)) usage();

  if (sub === 'get') {
    console.log(JSON.stringify(config[key] ?? null));
    return;
  }
  if (sub !== 'set') usage();

  const raw = rest.join(' ');
  if (raw === '') usage();
  let value;
  if (ENUMS[key]) {
    if (!ENUMS[key].includes(raw)) { console.error(`"${key}" must be one of: ${ENUMS[key].join(', ')}`); process.exit(2); }
    value = raw;
  } else if (BOOLEANS.includes(key)) {
    if (raw !== 'true' && raw !== 'false') { console.error(`"${key}" must be true or false`); process.exit(2); }
    value = raw === 'true';
  } else if (INTS.includes(key)) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) { console.error(`"${key}" must be a non-negative integer`); process.exit(2); }
    value = n;
  } else if (URLS.includes(key)) {
    if (raw === 'none') value = null; // documented way to clear
    else {
      let u;
      try { u = new URL(raw); } catch { /* fall through */ }
      if (!u || (u.protocol !== 'https:' && u.protocol !== 'http:')) { console.error(`"${key}" must be an http(s) URL (or "none" to clear)`); process.exit(2); }
      value = raw;
    }
  }
  config[key] = value;
  saveConfig(config);
  console.log(`${key} = ${JSON.stringify(value)}`);
}

/**
 * rugsnare unpin <server> — drop a server's pins entirely. For servers that
 * left the config: stale pins ghost as SHADOW/REMOVED findings forever
 * otherwise. Destructive to the pin store only — nothing else is touched.
 */
async function cmdUnpin(flags, serverName) {
  if (!serverName) { console.error('Usage: rugsnare unpin <server>'); process.exit(2); }
  const pins = loadPins();
  const sp = pins.servers?.[serverName];
  if (!sp) { console.error(`No pinned server named "${serverName}".`); process.exit(2); }
  const toolCount = Object.keys(sp.tools ?? {}).length;
  delete pins.servers[serverName];
  savePins(pins);
  (await import('./receipts.js')).signPinsFile();
  logEvent({ kind: 'unpin', server: serverName, tools: toolCount });
  console.log(`Unpinned ${serverName} (${toolCount} tool(s)). diff/report will no longer track it.`);
}

/**
 * rugsnare audit --input <file-or-dir> [--json] [--airgap]
 * Zero-knowledge scan of local files (AI chat exports, notes, .env) for
 * leaked secrets: API keys, private key blocks, payment cards, crypto seed
 * phrases, DB URLs with credentials, internal infrastructure, contact PII,
 * .env-style credential lines. Screen-only BY DESIGN: findings are redacted
 * (first 4 chars + length), nothing is written to disk, the only trace is a
 * count-only event entry (--airgap skips even that). Exit 1 = HIGH findings
 * present, so it doubles as a pre-share gate.
 */
async function cmdAudit(flags) {
  const input = flags.input ?? flags._[0];
  if (!input || typeof input !== 'string') {
    console.error('Usage: rugsnare audit --input <file-or-dir> [--json] [--airgap]');
    console.error('Scans local text/JSON files (AI chat exports, notes, .env) for leaked secrets.');
    console.error('Screen-only, redacted output; exit 1 when HIGH findings exist.');
    process.exit(2);
  }
  if (!fs.existsSync(input)) { console.error(`No such file or directory: ${input}`); process.exit(2); }
  const { auditPath } = await import('./audit.js');
  const t0 = Date.now();
  const { results, counts, high, filesScanned } = auditPath(input);

  if (flags.json) {
    console.log(JSON.stringify({ input, filesScanned, high, counts, results }, null, 2));
  } else {
    console.log(`rugsnare audit — ${input} (${filesScanned} file(s), ${Date.now() - t0}ms)`);
    let anyShown = false;
    for (const r of results) {
      if (r.skipped) { console.log(`  ${r.file}: SKIPPED (${r.skipped})`); continue; }
      if (r.findings.length === 0) continue;
      anyShown = true;
      console.log(`  ${r.file}${r.note ? ` (${r.note})` : ''}:`);
      for (const f of r.findings) {
        console.log(`    [${f.severity}] ${f.id} ${f.kind} @ ${f.location} — ${f.preview}`);
      }
    }
    if (!anyShown) console.log('  (no findings)');
    console.log('');
    const parts = Object.entries(counts).map(([id, n]) => `${id}:${n}`).join('  ') || 'clean';
    console.log(`findings: ${parts}${high > 0 ? ` — ${high} HIGH` : ''}`);
    console.log(high > 0
      ? 'audit: SECRETS PRESENT — rotate them before sharing this export'
      : 'audit: no high-severity findings');
  }

  if (!flags.airgap) {
    // count-only trace: no paths, no previews — the promise is screen-only
    logEvent({ kind: 'audit', files: filesScanned, high, counts });
  }
  process.exit(high > 0 ? 1 : 0);
}

/** Hidden-input prompt (zero-dep): raw mode, Enter confirms, Ctrl-C aborts. */
function promptHidden(question) {
  return new Promise((resolve) => {
    if (!process.stdin.setRawMode || !process.stdin.isTTY) {
      // Non-interactive (pipe/CI): values must come via the VALUE argument
      resolve(null);
      return;
    }
    process.stdout.write(question);
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    let buf = '';
    const onData = (ch) => {
      const c = ch.toString('utf8');
      if (c === '\r' || c === '\n') {
        process.stdin.setRawMode(wasRaw ?? false);
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(buf);
      } else if (c === '\u0003') {
        process.exit(130);
      } else if (c === '\u007f' || c === '\b') {
        buf = buf.slice(0, -1);
      } else {
        buf += c;
      }
    };
    process.stdin.on('data', onData);
  });
}

/**
 * rugsnare vault set <NAME> [VALUE] | get <NAME> | list | rm <NAME>
 * Secret vault: the model writes {{VAULT:NAME}} placeholders, the live proxy
 * injects the real value on the way to the server and scrubs it from results
 * on the way back. Storage: .rugsnare/vault.json (chmod 600, gitignored).
 * With no VALUE given, `set` prompts with hidden input (TTY only; in scripts
 * pass the value as the argument).
 */
async function cmdVault(flags) {
  const [sub, name, ...rest] = flags._;
  const { loadVault, saveVault, vaultPath } = await import('./vault.js');
  const usage = () => { console.error('Usage: rugsnare vault set <NAME> [VALUE] | get <NAME> | list | rm <NAME>'); process.exit(2); };
  if (sub === 'set') {
    if (!name) usage();
    let value = rest[0];
    if (value === undefined) {
      value = await promptHidden(`value for ${name} (input hidden, Enter to confirm): `);
      if (value === null) { console.error('No TTY for hidden input — pass the value as an argument in scripts.'); process.exit(2); }
    }
    if (typeof value !== 'string' || value.length === 0) { console.error('Empty value — nothing written.'); process.exit(2); }
    const vault = loadVault() ?? {};
    vault[name] = value;
    saveVault(vault);
    console.log(`vault: ${name} set (${value.length} chars) -> ${vaultPath()}`);
    return;
  }
  if (sub === 'get') {
    if (!name) usage();
    const vault = loadVault();
    if (!vault || vault[name] === undefined) { console.error(`No vault entry "${name}".`); process.exit(2); }
    console.log(vault[name]);
    return;
  }
  if (sub === 'list') {
    const vault = loadVault();
    if (!vault) { console.log('vault: empty (no entries)'); return; }
    for (const [k, v] of Object.entries(vault)) console.log(`${k}: ${v.length} chars`);
    return;
  }
  if (sub === 'rm') {
    if (!name) usage();
    const vault = loadVault();
    if (!vault || vault[name] === undefined) { console.error(`No vault entry "${name}".`); process.exit(2); }
    delete vault[name];
    saveVault(vault);
    console.log(`vault: ${name} removed`);
    return;
  }
  usage();
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
    case 'unpin': return cmdUnpin(flags, flags._[0]);
    case 'audit': return cmdAudit(flags);
    case 'vault': return cmdVault(flags);
    case 'verify': return cmdVerify(flags);
    case 'run': return cmdRun(flags);
    case 'canary': {
      const sub = flags._[0]; // main() already stripped 'canary' itself
      if (sub === 'record') return cmdCanaryRecord(flags);
      if (sub === 'replay') return cmdCanaryReplay(flags);
      console.error('Usage: rugsnare canary <record|replay> --name <server> -- <command> [args...]');
      process.exit(2);
    }
    case 'receipts': {
      const sub = flags._[0];
      if (sub === 'sign') return cmdReceiptsSign(flags);
      if (sub === 'verify') return cmdReceiptsVerify(flags);
      if (sub === 'export') return cmdReceiptsExport(flags);
      console.error('Usage: rugsnare receipts <sign|verify|export> [--from <receipts.jsonl>]');
      process.exit(2);
    }
    case 'mcp': return cmdMcp();
    case 'wrap': {
      const name = flags._[0];
      if (!name) { console.error('Usage: rugsnare wrap <server-name>'); process.exit(2); }
      const { wrapServer } = await import('./wrap.js');
      const r = await wrapServer(name);
      if (r.error) { console.error(r.error); process.exit(2); }
      console.log(`wrapped "${r.server}" in ${r.file}`);
      console.log(`backup: ${r.backup}`);
      if (r.runCommand) {
        console.log(`HTTP mode: start the proxy and keep it running:`);
        console.log(`  ${r.runCommand}`);
        console.log(r.note);
      }
      console.log(`restart your MCP client to apply. unwrap: rugsnare unwrap ${r.server}`);
      return;
    }
    case 'unwrap': {
      const name = flags._[0];
      if (!name) { console.error('Usage: rugsnare unwrap <server-name>'); process.exit(2); }
      const { unwrapServer } = await import('./wrap.js');
      const r = unwrapServer(name);
      if (r.error) { console.error(r.error); process.exit(2); }
      console.log(`unwrapped "${r.server}" in ${r.file} — restored original command`);
      console.log(`restart your MCP client to apply.`);
      return;
    }
    case 'report': return cmdReport(flags);
    case 'skills': return cmdSkills(flags);
    case 'history': return cmdHistory(flags);
    case 'version':
    case '--version':
    case '-v': {
      const { getVersion } = await import('./version.js');
      console.log(`rugsnare ${getVersion()}`);
      return;
    }
    case 'doctor': return cmdDoctor(flags);
    case 'events': return cmdEvents(flags);
    case 'config': return cmdConfig(flags);
    case 'hook': return cmdHook(flags);
    case undefined:
    case '--help':
    case 'help': console.log(HELP); return;
    default: console.error(`Unknown command: ${cmd}\n`); console.log(HELP); process.exit(2);
  }
}

main().catch((err) => { console.error(`rugsnare: ${err.message}`); process.exit(2); });
