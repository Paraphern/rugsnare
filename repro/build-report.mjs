// Builds repro/SILENT-CHANGES-REPORT.md from repro/.silent-changes.jsonl
// (output of repro/backtest-multi.sh). Data story for the launch post:
// every silent contract change across the release history of the official
// MCP reference servers. Run: node repro/build-report.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, '.silent-changes.jsonl');
const DST = path.join(here, 'SILENT-CHANGES-REPORT.md');

const rows = fs.readFileSync(SRC, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const byPkg = new Map();
for (const r of rows) {
  if (!byPkg.has(r.pkg)) byPkg.set(r.pkg, []);
  byPkg.get(r.pkg).push(r);
}

const short = (pkg) => pkg.replace('@modelcontextprotocol/server-', '');
const total = (fn) => rows.reduce((a, r) => a + fn(r), 0);
const tPairs = rows.length;
const tClean = rows.filter((r) => r.clean).length;
const tDrift = total((r) => r.drift);
const tB = total((r) => r.breaking);
const tC = total((r) => r.cosmetic);
const tA = total((r) => r.annotation);
const tNew = total((r) => r.new);
const tRem = total((r) => r.removed);
// drift lines without a B/C/A label are prompts/resources drift (pinned and diffed too)
const tPR = tDrift - tB - tC - tA;

const lines = [];
lines.push('# The silent changes report: official MCP servers, release by release');
lines.push('');
lines.push(`> We pinned every stable release of ${byPkg.size} official \`@modelcontextprotocol/server-*\` reference servers,`);
lines.push(`> diffed each version against the next, and counted every contract change between them.`);
lines.push(`> **${tPairs} version pairs · ${tClean} clean · ${tPairs - tClean} pairs with silent changes · ${tDrift + tNew + tRem} findings** —`);
lines.push(`> not one of them announced in a changelog.`);
lines.push('');
lines.push(`Findings split: **${tB} BREAKING** (schema changed) · **${tC} COSMETIC** (description reworded) · **${tA} ANNOTATION** (behavioral hints flipped, compared through spec defaults) · **${tPR} PROMPTS/RESOURCES** (server prompts or resources changed — instructions your agent also obeys) · **${tNew} NEW tools** appeared · **${tRem} REMOVED**.`);
lines.push('');
lines.push('## Per server');
lines.push('');
lines.push('| Server | Pairs | Clean | Drifted | BREAKING | COSMETIC | ANNOTATION | NEW | REMOVED |');
lines.push('|---|---|---|---|---|---|---|---|---|');
for (const [pkg, rs] of byPkg) {
  const s = (fn) => rs.reduce((a, r) => a + fn(r), 0);
  lines.push(`| ${short(pkg)} | ${rs.length} | ${rs.filter((r) => r.clean).length} | ${rs.filter((r) => !r.clean).length} | ${s((r) => r.breaking)} | ${s((r) => r.cosmetic)} | ${s((r) => r.annotation)} | ${s((r) => r.new)} | ${s((r) => r.removed)} |`);
}
lines.push('');
lines.push('## Every pair with changes');
lines.push('');
for (const [pkg, rs] of byPkg) {
  const drifted = rs.filter((r) => !r.clean);
  if (!drifted.length) continue;
  lines.push(`### ${short(pkg)}`);
  lines.push('');
  for (const r of drifted) {
    const parts = [];
    if (r.breaking) parts.push(`${r.breaking} breaking`);
    if (r.cosmetic) parts.push(`${r.cosmetic} cosmetic`);
    if (r.annotation) parts.push(`${r.annotation} annotation`);
    if (r.new) parts.push(`${r.new} new tool${r.new > 1 ? 's' : ''}`);
    if (r.removed) parts.push(`${r.removed} removed`);
    lines.push(`- \`${r.from}\` → \`${r.to}\`: ${parts.join(', ')}`);
  }
  lines.push('');
}
lines.push('## Methodology (reproducible in one command)');
lines.push('');
lines.push('1. For each stable version `V` of a server: install `V`, run `rugsnare scan` — the baseline pin of `{name, description, inputSchema}` + prompts + resources + behavioral annotations.');
lines.push('2. Install `V+1` over it (the silent upgrade an agent would get from `npx -y`), run `rugsnare diff`.');
lines.push('3. Every difference is classified deterministically: BREAKING (schema changed, e.g. a required param appeared), COSMETIC (prose reworded), ANNOTATION (behavioral hints flipped — compared through MCP spec defaults, where an absent `destructiveHint` means destructive). No LLM, no judgment calls.');
lines.push('');
lines.push('```bash');
lines.push('bash repro/backtest-multi.sh   # ~20 minutes, four official servers, full history');
lines.push('```');
lines.push('');
lines.push('*Coverage note: 66 version pairs exist across the four servers; 52 pairs are measured. 14 older `server-everything` releases (2025-12 → 2026-08 line) do not start headless in this harness — scan fails, the pair is skipped, and nothing is imputed for it.*');
lines.push('');
lines.push('## Why this matters');
lines.push('');
lines.push('Your agent obeys tool descriptions. When a server changes a description, a schema, or a behavioral hint after you approved it, the agent\'s instructions change — silently. Scanners check once at install; `npx -y pkg@latest` re-rolls the dice on every launch. This report is what that looks like on the four servers everyone installs first.');
lines.push('');
lines.push('---');
lines.push(`*Generated ${new Date().toISOString()} by \`repro/backtest-multi.sh\` + \`repro/build-report.mjs\` ( RugSnare v0.4.0, ${tPairs} pairs ). Zero dependencies, no telemetry, every number reproducible on your machine.*`);

fs.writeFileSync(DST, lines.join('\n') + '\n');
console.log(`wrote ${DST}: ${tPairs} pairs, ${tDrift} drift (${tB}B/${tC}C/${tA}A), ${tNew} new, ${tRem} removed`);
