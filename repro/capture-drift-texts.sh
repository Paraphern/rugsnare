#!/usr/bin/env bash
# Captures the actual was/became TEXTS for every drifted pair in the
# silent-changes data: re-pins pair.from, diffs against pair.to with --json,
# extracts old/new descriptions + annotations into repro/silent-changes-texts.json.
# Only drifted pairs are re-run (clean pairs have nothing to show).
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLI="$ROOT/product/src/cli.js"
DATA="$ROOT/repro/silent-changes-data.jsonl"
OUT="$ROOT/repro/silent-changes-texts.json"
TMP="${RUGSNARE_BACKTEST_TMP:-$ROOT/repro/.texts-tmp}"
rm -rf "$TMP" 2>/dev/null || true
mkdir -p "$TMP"
TMPM="$(cygpath -m "$TMP" 2>/dev/null || echo "$TMP")"
trap 'rm -rf "$TMP" 2>/dev/null || true' EXIT

OUT_PATH="$OUT" node - "$DATA" "$TMPM" "$CLI" "$OUT" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const [, , dataPath, tmpNative, cliPath, outPath] = process.argv;
const rows = fs.readFileSync(dataPath, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const drifted = rows.filter((r) => !r.clean);
const out = [];

const run = (cmd, args, opts) => execFileSync(cmd, args, { encoding: 'utf8', timeout: 90000, windowsHide: true, ...opts });

for (const [idx, r] of drifted.entries()) {
  const label = `${r.pkg.replace('@modelcontextprotocol/server-', '')} ${r.from} -> ${r.to}`;
  process.stderr.write(`[${idx + 1}/${drifted.length}] ${label} ... `);
  try {
    const pkgDir = path.join(tmpNative, `p${idx}`);
    fs.mkdirSync(pkgDir, { recursive: true });
    // npm is a .cmd on Windows: execFileSync EINVALs without a shell.
    // Args are constant pkg@version strings from our own data file — safe to shell-quote.
    const npm = (args2) => run('npm', args2, { cwd: pkgDir, stdio: 'ignore', timeout: 180000, shell: true });
    npm(['init', '-y']);
    npm(['install', '--no-audit', '--no-fund', '--silent', `${r.pkg}@${r.from}`, 'zod-to-json-schema']);
    const entry = path.join(pkgDir, 'node_modules', r.pkg, 'dist', 'index.js');
    const cfg = path.join(pkgDir, 'mcp.json');
    fs.writeFileSync(cfg, JSON.stringify({ mcpServers: { t: { command: 'node', args: [entry, 'C:/Windows/Temp'] } } }));
    const scan = run('node', [cliPath, 'scan', '--config', cfg, '--timeout', '30000'], { cwd: pkgDir });
    if (!/pinned/.test(scan)) { process.stderr.write('SCAN FAILED, skip\n'); continue; }
    npm(['install', '--no-audit', '--no-fund', '--silent', `${r.pkg}@${r.to}`]);
    // diff exits 1 when drift is found — that IS the payload, not an error
    let diffJson;
    try {
      diffJson = run('node', [cliPath, 'diff', '--config', cfg, '--json', '--timeout', '30000'], { cwd: pkgDir });
    } catch (e) {
      if (e.status === 1 && e.stdout) diffJson = e.stdout;
      else throw e;
    }
    const report = JSON.parse(diffJson);
    const texts = [];
    for (const server of report) {
      for (const v of server.verdicts ?? []) {
        if (v.status === 'UNCHANGED') continue;
        texts.push({
          name: v.tool ?? v.item,
          of: v.kind ?? 'tool',
          status: v.status,
          driftType: v.driftType ?? null,
          oldDescription: v.oldDescription ?? null,
          newDescription: v.newDescription ?? null,
          oldAnnotations: v.oldAnnotations ?? null,
          newAnnotations: v.newAnnotations ?? null,
        });
      }
    }
    out.push({ pkg: r.pkg, from: r.from, to: r.to, texts });
    process.stderr.write(`${texts.length} item(s)\n`);
  } catch (e) {
    process.stderr.write(`ERROR: ${String(e.message).slice(0, 80)} — skipped\n`);
  }
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n');
process.stderr.write(`wrote ${outPath}: ${out.length} pairs with texts\n`);
NODE
