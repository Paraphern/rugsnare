/* RugSnare runtime-history UI — shared by the home page form and the /scans archive */
function card(cs, text) {
  var p = cs.split(',');
  return '<div style="background:' + p[0] + ';border:1px solid ' + p[1] + ';border-radius:10px;padding:12px;margin:8px 0;color:#374151;font-size:13px">' + text + '</div>';
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function timeAgo(d) {
  var s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
/* pair header meta: publish date of the newer version, when the registry has it */
function pairMeta(p) {
  if (!p.toPublishedAt) return '';
  return 'published ' + String(p.toPublishedAt).slice(0, 10) + ' · ';
}
/* findings list with expandable tail: first 12 inline, the rest behind a button */
var FINDINGS_SHOWN = 12;
var findingsSeq = 0;
function findingsHtml(findings, prefix) {
  var id = prefix + '-' + (++findingsSeq);
  var html = '';
  findings.slice(0, FINDINGS_SHOWN).forEach(function (f) { html += findingRow(f); });
  if (findings.length > FINDINGS_SHOWN) {
    html += '<div id="' + id + '" style="display:none">';
    findings.slice(FINDINGS_SHOWN).forEach(function (f) { html += findingRow(f); });
    html += '</div>';
    html += '<button type="button" id="' + id + '-btn" onclick="toggleFindings(\'' + id + '\')" '
      + 'style="margin-top:8px;padding:5px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#334155;font-size:12px;cursor:pointer">'
      + 'Show all ' + findings.length + '</button>';
  }
  return html;
}
function findingRow(f) {
  var html = '<div style="margin-top:6px;font-size:12px"><b>' + esc(f.tool) + '</b> [' + esc(f.status) + (f.driftType ? ' ' + esc(f.driftType) : '') + ']';
  if (f.oldDescription !== undefined && f.oldDescription !== f.newDescription) {
    // security-verdict coloring: WAS = the contract you approved (trusted),
    // NOW = what it silently became (the thing to review); changed words are
    // bold and a notch bigger in BOTH lines, so the edit is visible at a glance
    var d = wordDiff(String(f.oldDescription ?? ''), String(f.newDescription ?? ''));
    html += '<div style="color:#22c55e">WAS: ' + d.aHtml + '</div><div style="color:#ef4444">NOW: ' + d.bHtml + '</div>';
  }
  var c = findingConsequence(f);
  if (c) html += '<div style="margin-top:3px;padding:4px 8px;border-radius:6px;font-size:11.5px;background:' + c.bg + ';color:' + c.fg + '"><b>' + c.icon + '</b> ' + esc(c.text) + '</div>';
  return html + '</div>';
}
/* word-level diff: common backbone (LCS) stays plain, everything else is
   bold and slightly larger — in BOTH the old and the new line */
function wordDiff(aStr, bStr) {
  var A = String(aStr).match(/\S+\s*/g) || [];
  var B = String(bStr).match(/\S+\s*/g) || [];
  var n = A.length, m = B.length;
  var dp = [];
  for (var i = 0; i <= n; i++) { dp[i] = new Array(m + 1).fill(0); }
  for (var r = n - 1; r >= 0; r--) {
    for (var c = m - 1; c >= 0; c--) {
      dp[r][c] = (A[r].trim() === B[c].trim())
        ? dp[r + 1][c + 1] + 1
        : Math.max(dp[r + 1][c], dp[r][c + 1]);
    }
  }
  var aHtml = '', bHtml = '';
  var i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i].trim() === B[j].trim()) {
      aHtml += esc(A[i]); bHtml += esc(B[j]);
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      aHtml += mark(A[i]); i++;
    } else {
      bHtml += mark(B[j]); j++;
    }
  }
  while (i < n) { aHtml += mark(A[i]); i++; }
  while (j < m) { bHtml += mark(B[j]); j++; }
  return { aHtml: aHtml, bHtml: bHtml };
  function mark(t) { return '<b style="font-size:1.18em">' + esc(t) + '</b>'; }
}
function toggleFindings(id) {
  var box = document.getElementById(id);
  var btn = document.getElementById(id + '-btn');
  var open = box.style.display !== 'none';
  box.style.display = open ? 'none' : 'block';
  btn.textContent = open ? 'Show all' : 'Show less';
}
/* plain-language consequences: what this change means for the user's agent */
function findingConsequence(f) {
  var DANGER = { bg: '#fef2f2', fg: '#b91c1c', icon: '⚠' };
  var WARN = { bg: '#fffbeb', fg: '#b45309', icon: 'ⓘ' };
  var INFO = { bg: '#f1f5f9', fg: '#64748b', icon: 'ⓘ' };
  var was = String(f.oldDescription ?? '');
  var now = String(f.newDescription ?? '');
  var gone = function (re) { return re.test(was) && !re.test(now); };
  var came = function (re) { return re.test(now) && !re.test(was); };

  if (f.status === 'NEW') return { bg: WARN.bg, fg: WARN.fg, icon: WARN.icon, text: 'A tool your agent can now call that did not exist in the previous version — nobody has reviewed or approved it yet.' };
  if (f.status === 'REMOVED') return { bg: INFO.bg, fg: INFO.fg, icon: INFO.icon, text: 'This tool disappeared. Workflows that rely on it will break — and a vanishing tool can also be cleanup after something grabbed its access.' };
  if (f.driftType === 'BREAKING') return { bg: WARN.bg, fg: WARN.fg, icon: WARN.icon, text: 'The parameters changed (schema drift): calls that worked before may now fail — or silently behave differently.' };

  var lines = [];
  if (gone(/requires? confirmation|needs? (your )?approval|approval (is )?required|unless whitelisted|requires? review/i)) {
    lines.push('the agent is no longer told to ask you before this runs — it can execute straight away');
  }
  if (gone(/allowed\s*roots|allowedRemoteRoots|allowed director|path (is )?restricted|sandbox/i)) {
    lines.push('the stated path boundary vanished — the agent no longer knows this was supposed to stay limited');
  }
  if (gone(/no chaining|no pipes|no redirection|single command|one command per|no multiline/i)) {
    lines.push('the stated command limits (no chaining / pipes / redirection) were dropped from the text');
  }
  if (came(/https?:\/\/(?!.*(github\.com|npmjs|readthedocs|wikipedia))/i)) {
    lines.push('the new description points to an external URL');
  }
  if (came(/\.env|credentials?|api[_-]?key|secrets?|private key|id_rsa|passwords?|auth[_-]?tokens?\b/i)) {
    lines.push('the new text references credentials or secrets');
  }
  if (came(/do not tell|don'?t tell|hide (this )?from|without (telling|informing)/i)) {
    lines.push('the new text tells the agent to keep this from you');
  }
  if (came(/ignore (all|any|the)? ?(previous|prior|above) instructions/i)) {
    lines.push('instruction-hijack phrasing appeared');
  }

  if (lines.length > 0) {
    return { bg: DANGER.bg, fg: DANGER.fg, icon: DANGER.icon, text: 'Consequence: ' + lines.join('; ') + '.' };
  }
  return { bg: INFO.bg, fg: INFO.fg, icon: INFO.icon, text: 'Only the wording changed (schema intact) — but descriptions are the instructions your agent follows, so the edit still matters.' };
}
/* shared renderer: verdict + findings cards + evidence links (feed rows reuse it) */
function runtimeResultHtml(res) {
  var r = res.result || {};
  if (r.error) return card('#fef2f2,#dc2626', 'Scan failed: ' + esc(r.error) + ' — details in the <a href="' + esc(res.runUrl || '#') + '" target="_blank" rel="noopener">run log</a>.');
  if (!r.checked) {
    return card('#eff6ff,#3b82f6', 'ℹ️ ' + esc(res.package) + ': 0 of ' + esc(r.planned || '?') + ' version(s) could be started — this server needs specific environment (credentials, config files) to boot, so runtime contracts are unavailable. "No data" is not "no changes".');
  }
  var head = (r.silentChanges === 0)
    ? card('#f0fdf4,#10b981', '✅ ' + esc(res.package) + ': ' + r.checked + ' version(s) actually started and listed their tools — no silent contract changes.')
    : card('#fff7ed,#ea580c', '⚠️ ' + esc(res.package) + ': ' + r.silentChanges + ' silent change(s) found across ' + r.checked + ' runtime-checked version(s)');
  var body = '';
  (r.pairs || []).forEach(function (p, pi) {
    if (!p.findings || !p.findings.length) return;
    body += '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin:8px 0">';
    body += '<b style="font-size:13px">' + esc(p.from) + ' → ' + esc(p.to) + '</b> <span style="color:#64748b;font-size:12px">' + pairMeta(p) + p.findings.length + ' finding(s)</span>';
    body += findingsHtml(p.findings, 'r' + pi);
    body += '</div>';
  });
  if (r.unreachable && r.unreachable.length) {
    body += '<div style="color:#64748b;font-size:12px;margin-top:6px">' + r.unreachable.length + ' version(s) could not be started (no bin, missing env, crash) — excluded from the diff; see the log.</div>';
  }
  var slug = String(res.package || '').toLowerCase().replace(/^@/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  var evidence = '<div style="margin-top:10px;font-size:12px;color:#94a3b8">Runtime-exact — every version was actually started in an ephemeral sandbox. Public evidence: <a href="' + esc(res.runUrl || 'https://github.com/Paraphern/rugsnare/actions') + '" target="_blank" rel="noopener" style="color:#64748b">GitHub Actions run log</a> · <a href="https://github.com/Paraphern/rugsnare/blob/scans/history/' + esc(slug) + '.json" target="_blank" rel="noopener" style="color:#64748b">result JSON</a></div>';
  return head + body + evidence;
}
/* archive row expansion: lazily fetch the result once, then toggle */
var archiveLoaded = {};
var archiveSeq = 0;
function toggleArchiveRow(rowId, pkg) {
  var box = document.getElementById(rowId);
  if (!box) return;
  var open = box.style.display !== 'none';
  if (open) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  if (archiveLoaded[rowId] !== undefined) return;
  archiveLoaded[rowId] = null;
  box.innerHTML = '<div style="color:#64748b;font-size:12px">loading the scan result...</div>';
  fetch('/api/history-result?package=' + encodeURIComponent(pkg))
    .then(function (r) { return r.json(); })
    .then(function (res) {
      var html;
      if (res.status === 'pending') html = card('#eff6ff,#3b82f6', 'This scan has not landed yet — check again in a moment.');
      else html = runtimeResultHtml(res);
      archiveLoaded[rowId] = html;
      box.innerHTML = html;
    })
    .catch(function () {
      archiveLoaded[rowId] = undefined;
      box.innerHTML = card('#fef2f2,#dc2626', 'Could not load the result — try again.');
    });
}
