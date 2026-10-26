#!/usr/bin/env node
// delta-report.js <outdir> <minStars> <since> <huntRoot> <reportPath>
// Merges raw.tsv + star-cache, filters minStars, dedupes against seen-issues,
// marks NEW/KNOWN vs known-repos, emits markdown report. Updates caches.
const fs = require('fs');
const path = require('path');
const [outdir, minStars, since, huntRoot, reportPath] = process.argv.slice(2);
const MIN = +minStars || 50;

const readLines = (p) => { try { return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean); } catch (e) { return []; } };

const stars = new Map();
for (const l of readLines(path.join(huntRoot, 'star-cache.tsv'))) {
  const p = l.split('\t'); if (p.length === 2) stars.set(p[1], +p[0]);
}
const seen = new Set(readLines(path.join(huntRoot, 'seen-issues.txt')).map(s => s.trim()));
const known = new Set(readLines(path.join(huntRoot, 'known-repos.txt')).map(s => s.trim()));

const rows = [];
for (const l of readLines(path.join(outdir, 'raw.tsv'))) {
  const p = l.split('\t'); if (p.length < 4) continue;
  const repo = p[0], date = p[1], title = p[2], url = p[3];
  const st = stars.get(repo) || 0;
  if (st < MIN) continue;
  if (seen.has(url)) continue; // already reported in an earlier run
  rows.push({ repo, st, date, title, url, known: known.has(repo) });
}
rows.sort((a, b) => b.st - a.st);

// severity heuristics for quick triage
const sev = (t) => {
  const s = t.toLowerCase();
  if (/exfiltrat|leak|credential|token|secret|backdoor|malware|poison|skimmer|c2/.test(s)) return 'SEC';
  if (/broke|broken|missing|disappeared|silently|silent|fails?|error|hangs?|regression|invalid|crash/.test(s)) return 'BUG';
  if (/security|trust|audit|allowlist|approval|permission|access/.test(s)) return 'SEC-adj';
  return 'misc';
};
const bySev = { SEC: [], 'SEC-adj': [], BUG: [], misc: [] };
rows.forEach(r => bySev[sev(r.title)].push(r));

let out = [];
out.push(`# Дельта болей MCP (50+★), созданные с ${since}`);
out.push('');
out.push(`**Сгенерировано:** ${new Date().toISOString().slice(0, 16)} · порог ★: ${MIN} · запросов: 24 архетипа`);
out.push(`**Новое за прогон:** ${rows.length} issue (SEC: ${bySev.SEC.length}, SEC-adj: ${bySev['SEC-adj'].length}, BUG: ${bySev.BUG.length}, misc: ${bySev.misc.length}); новые репо: ${rows.filter(r => !r.known).length}.`);
out.push('');
for (const [cat, label] of [['SEC', '🔴 Security (экфильтрация/креды/яды)'], ['SEC-adj', '🟠 Security-смежные (доверие/права/аудит)'], ['BUG', '🟡 Поломки контрактов (broke/missing/silent)'], ['misc', '⚪ Прочее по ключевым словам']]) {
  if (!bySev[cat].length) continue;
  out.push(`## ${label} (${bySev[cat].length})`);
  out.push('');
  out.push('| ★ | Репо | Дата | Боль | Статус |');
  out.push('|---|---|---|---|---|');
  for (const r of bySev[cat]) {
    out.push(`| ${(r.st >= 1000 ? (r.st / 1000).toFixed(1) + 'k' : r.st)} | [${r.repo}](${path.dirname(r.url)}) | ${r.date} | [${r.title.slice(0, 90)}](${r.url}) | ${r.known ? 'известен' : '**NEW**'} |`);
  }
  out.push('');
}
out.push('---');
out.push('');
out.push('*Кэши обновлены: seen-issues (+всё выше), known-repos не менялся — новые цели дописываются вручную или командой ниже.*');

// упоминания rugsnare сторонними авторами
try {
  const m = readLines(path.join(outdir, 'mentions.tsv'));
  if (m.length) {
    out.push('');
    out.push(`## 🔔 Упоминания rugsnare сторонними авторами (${m.length})`);
    out.push('');
    out.push('| Репо | Дата | Автор | Что |');
    out.push('|---|---|---|---|');
    for (const l of m) {
      const p = l.split('\t'); if (p.length < 5) continue;
      out.push(`| [${p[0]}](https://github.com/${p[0]}) | ${p[1]} | @${p[2]} | [${p[3]}](${p[4]}) |`);
    }
  }
} catch (e) {}
fs.writeFileSync(reportPath, out.join('\n'));

// update caches: mark issues as seen
fs.appendFileSync(path.join(huntRoot, 'seen-issues.txt'), rows.map(r => r.url).join('\n') + '\n');
console.log(`report: ${rows.length} rows (SEC ${bySev.SEC.length} / SEC-adj ${bySev['SEC-adj'].length} / BUG ${bySev.BUG.length} / misc ${bySev.misc.length}); NEW repos: ${rows.filter(r => !r.known).length}`);
