import fs from 'node:fs';
import path from 'node:path';
import { rugsnareDir } from './pins.js';

/**
 * HTML report generator - unified view for the whole product.
 * Covers MCP tool drift, skills drift, and audit findings in one page.
 * Self-contained: CSS inline, no external dependencies, opens in any browser.
 * Designed for non-technical users: plain-language "was/became", severity
 * badges, actionable recommendations.
 */

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function severityBadge(sev) {
  const map = {
    DANGEROUS: { bg: '#dc2626', label: '🔴 DANGEROUS' },
    REVIEW: { bg: '#f59e0b', label: '🟡 REVIEW' },
    SAFE: { bg: '#10b981', label: '🟢 SAFE' },
  };
  const m = map[sev];
  if (!m) return '';
  return `<span style="background:${m.bg};color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;margin-left:8px">${m.label}</span>`;
}

function statusIcon(status) {
  return { UNCHANGED: '✅', DRIFT: '⚠️', NEW: '🆕', REMOVED: '🗑️' }[status] ?? '❓';
}

function plainLanguageReason(changes) {
  const added = changes.added ?? [];
  const reasons = [];
  for (const line of added) {
    if (/\.env|credential|api[_-]?key|secret|password/i.test(line)) reasons.push('References sensitive files (passwords, API keys)');
    if (/https?:\/\//i.test(line) && !/github\.com|npmjs/i.test(line)) reasons.push(`Communicates with an external server`);
    if (/do\s+not\s+tell|hide\s+from/i.test(line)) reasons.push('Instructs the AI to hide information from you');
    if (/curl|wget|rm\s+-rf|exec|eval/i.test(line)) reasons.push('Executes dangerous commands');
    if (/ignore.*instructions/i.test(line)) reasons.push('Attempts to override system instructions');
  }
  return [...new Set(reasons)].slice(0, 3); // unique, max 3
}

function formatDiffBlock(changes) {
  if (!changes || (!changes.added?.length && !changes.removed?.length)) return '';
  let html = '<div style="background:#1a1a2e;border-radius:8px;padding:14px;margin:10px 0;font-family:monospace;font-size:13px;overflow-x:auto">';
  for (const line of (changes.removed ?? []).slice(0, 10)) {
    html += `<div style="color:#ef4444;padding:1px 0">- ${esc(line.trim().slice(0, 120))}</div>`;
  }
  for (const line of (changes.added ?? []).slice(0, 10)) {
    html += `<div style="color:#22c55e;padding:1px 0">+ ${esc(line.trim().slice(0, 120))}</div>`;
  }
  const total = (changes.added?.length ?? 0) + (changes.removed?.length ?? 0);
  if (total > 20) html += `<div style="color:#64748b;padding:4px 0">... and ${total - 20} more changes</div>`;
  html += '</div>';
  return html;
}

function recommendation(severity) {
  switch (severity) {
    case 'DANGEROUS':
      return `<div style="background:#fef2f2;border:1px solid #dc2626;border-radius:8px;padding:12px;margin:10px 0">
<b style="color:#dc2626">🚨 What you should do:</b>
<p style="margin:6px 0 0;color:#374151">Do NOT update this skill. Restore the previous version immediately. This change could expose your passwords, API keys, or other sensitive data.</p></div>`;
    case 'REVIEW':
      return `<div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin:10px 0">
<b style="color:#b45309">⚠️ Recommended:</b>
<p style="margin:6px 0 0;color:#374151">Review the changes below before accepting this update. If you didn't expect this change, ask the person who maintains this skill.</p></div>`;
    case 'SAFE':
      return `<div style="background:#f0fdf4;border:1px solid #10b981;border-radius:8px;padding:12px;margin:10px 0">
<b style="color:#059669">✅ Looks safe:</b>
<p style="margin:6px 0 0;color:#374151">This appears to be a minor edit (typo fix, formatting, or documentation). No dangerous patterns detected.</p></div>`;
    default: return '';
  }
}

/**
 * Generate a self-contained HTML report covering skills drift, MCP tool drift,
 * and optionally audit findings. Returns { html, counts }.
 */
export function generateSkillsReport(results, { generatedAt, mcpResults } = {}) {
  const dangerous = results.filter((r) => r.severity === 'DANGEROUS');
  const review = results.filter((r) => r.severity === 'REVIEW');
  const safe = results.filter((r) => r.severity === 'SAFE');
  const unchanged = results.filter((r) => r.status === 'UNCHANGED');
  const allNew = results.filter((r) => r.status === 'NEW');
  const removed = results.filter((r) => r.status === 'REMOVED');

  // MCP drift section (if provided)
  let mcpSection = '';
  let mcpBad = 0;
  if (mcpResults && mcpResults.length > 0) {
    const mcpFindings = [];
    for (const { server, verdicts = [] } of mcpResults) {
      for (const v of verdicts) {
        if (v.status === 'UNCHANGED') continue;
        mcpBad++;
        const sev = v.status === 'DRIFT' && v.driftType === 'BREAKING' ? 'DANGEROUS'
          : v.status === 'DRIFT' ? 'REVIEW'
          : v.status === 'NEW' ? 'REVIEW'
          : v.status === 'REMOVED' ? 'DANGEROUS'
          : 'REVIEW';
        mcpFindings.push(`
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin:10px 0">
  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
    <span style="font-size:16px">${statusIcon(v.status)}</span>
    <b>${esc(server)}/${esc(v.tool ?? v.item ?? '?')}</b>
    ${severityBadge(sev)}
    ${v.driftType ? `<span style="color:#64748b;font-size:11px">(${esc(v.driftType)})</span>` : ''}
  </div>
  ${v.oldDescription || v.newDescription ? `<div style="margin:8px 0;padding:8px;background:#f8fafc;border-radius:6px;font-size:12px">
    ${v.oldDescription ? `<div style="color:#ef4444">- ${esc(v.oldDescription.slice(0, 100))}</div>` : ''}
    ${v.newDescription ? `<div style="color:#22c55e">+ ${esc(v.newDescription.slice(0, 100))}</div>` : ''}
  </div>` : ''}
  ${v.schemaChanges?.length ? `<div style="color:#f59e0b;font-size:12px;margin:4px 0">Schema: ${v.schemaChanges.map(esc).join('; ')}</div>` : ''}
</div>`);
      }
    }
    if (mcpFindings.length > 0) {
      mcpSection = `
<h2 style="font-size:20px;color:#0f172a;margin:24px 0 8px;border-bottom:2px solid #e5e7eb;padding-bottom:8px">📡 MCP Tool Contracts</h2>
${mcpFindings.join('\n')}`;
    }
  }

  const cards = [];
  // DANGEROUS first
  for (const r of [...dangerous, ...review, ...safe]) {
    if (r.status === 'UNCHANGED') continue;
    const reasons = plainLanguageReason(r.changes);
    cards.push(`
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin:14px 0;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
    <div>
      <span style="font-size:18px">${statusIcon(r.status)}</span>
      <b style="font-size:16px;margin-left:6px">${esc(r.key)}</b>
      ${severityBadge(r.severity)}
    </div>
    <span style="color:#64748b;font-size:12px">${esc(r.app ?? '')}</span>
  </div>
  ${reasons.length ? `<div style="margin:10px 0;padding:10px;background:#f8fafc;border-radius:6px">
    <b style="font-size:13px;color:#334155">What changed:</b>
    <ul style="margin:6px 0 0 16px;padding:0;color:#475569;font-size:13px">
      ${reasons.map((reason) => `<li>${esc(reason)}</li>`).join('')}
    </ul>
  </div>` : ''}
  ${formatDiffBlock(r.changes)}
  ${recommendation(r.severity)}
  ${r.advisory ? `<div style="color:#94a3b8;font-size:11px;margin-top:6px">Advisory score: ${r.advisory.score} (${r.advisory.signals.join(', ')})</div>` : ''}
</div>`);
  }

  // Summary of unchanged
  if (unchanged.length > 0) {
    cards.push(`
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;margin:14px 0">
  <b style="color:#059669">✅ ${unchanged.length} skill${unchanged.length === 1 ? '' : 's'} unchanged</b>
  <span style="color:#64748b;font-size:13px;margin-left:8px">No changes detected since last check.</span>
</div>`);
  }

  if (allNew.length > 0) {
    cards.push(`
<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px;margin:14px 0">
  <b style="color:#2563eb">🆕 ${allNew.length} new skill${allNew.length === 1 ? '' : 's'} detected</b>
  <div style="color:#475569;font-size:13px;margin-top:4px">
    ${allNew.map((r) => esc(r.key)).join(', ')}
  </div>
  <div style="color:#94a3b8;font-size:12px;margin-top:6px">These files appeared since the last scan. Review them, then run <code style="background:#e2e8f0;padding:1px 4px;border-radius:3px">rugsnare scan</code> to pin.</div>
</div>`);
  }

  if (removed.length > 0) {
    cards.push(`
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;margin:14px 0">
  <b style="color:#dc2626">🗑️ ${removed.length} skill${removed.length === 1 ? '' : 's'} removed</b>
  <div style="color:#475569;font-size:13px;margin-top:4px">${removed.map((r) => esc(r.key)).join(', ')}</div>
</div>`);
  }

  const overallStatus = dangerous.length > 0 || mcpBad > 0 ? 'DANGER' : review.length > 0 ? 'REVIEW' : 'OK';
  const headerColor = overallStatus === 'DANGER' ? '#dc2626' : overallStatus === 'REVIEW' ? '#f59e0b' : '#10b981';
  const headerBg = overallStatus === 'DANGER' ? '#fef2f2' : overallStatus === 'REVIEW' ? '#fffbeb' : '#f0fdf4';
  const headerIcon = overallStatus === 'DANGER' ? '🚨' : overallStatus === 'REVIEW' ? '⚠️' : '✅';
  const headerText = overallStatus === 'DANGER'
    ? `${dangerous.length + mcpBad} dangerous change${dangerous.length + mcpBad === 1 ? '' : 's'} detected`
    : overallStatus === 'REVIEW'
      ? `${review.length} change${review.length === 1 ? '' : 's'} need${review.length === 1 ? 's' : ''} your review`
      : `All ${unchanged.length} skills are safe`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RugSnare Skills Report</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:720px;margin:0 auto;padding:20px">

  <div style="text-align:center;padding:30px 0 10px">
    <h1 style="font-size:28px;margin:0;color:#0f172a">🔍 Skills Security Report</h1>
    <p style="color:#64748b;font-size:14px;margin:8px 0 0">${new Date(generatedAt ?? Date.now()).toLocaleString()} · ${results.length} skill${results.length === 1 ? '' : 's'} checked</p>
  </div>

  <div style="background:${headerBg};border:2px solid ${headerColor};border-radius:14px;padding:20px;margin:16px 0;text-align:center">
    <div style="font-size:48px">${headerIcon}</div>
    <h2 style="font-size:20px;color:${headerColor};margin:10px 0 4px">${headerText}</h2>
    ${dangerous.length > 0 ? `<p style="color:#dc2626;font-size:14px;margin:4px 0">Your AI agent may be exposed to security risks.</p>` : ''}
  </div>

  ${mcpSection}

  ${cards.length > 0 ? `<h2 style="font-size:20px;color:#0f172a;margin:24px 0 8px;border-bottom:2px solid #e5e7eb;padding-bottom:8px">📝 Skill Files</h2>` : ''}

  ${cards.join('\n')}

  <div style="text-align:center;padding:24px 0;color:#94a3b8;font-size:12px">
    Generated by <a href="https://rugsnare.com" style="color:#64748b">RugSnare</a> · Open source, zero dependencies, no telemetry<br>
    <a href="https://github.com/Paraphern/rugsnare" style="color:#64748b">github.com/Paraphern/rugsnare</a>
  </div>

</div>
</body>
</html>`;

  return { html, counts: { total: results.length, dangerous: dangerous.length, review: review.length, safe: safe.length, unchanged: unchanged.length, new: allNew.length, removed: removed.length } };
}

/**
 * Write the report to a file and return the path.
 */
export function writeSkillsReport(results, cwd = process.cwd(), mcpResults = []) {
  const { html, counts } = generateSkillsReport(results, { mcpResults });
  const reportPath = path.join(rugsnareDir(cwd), 'skills-report.html');
  fs.mkdirSync(rugsnareDir(cwd), { recursive: true });
  fs.writeFileSync(reportPath, html);
  return { reportPath, counts };
}
