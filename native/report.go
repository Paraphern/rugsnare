// HTML report — port of product/src/skills-report.js (skills half).
// Self-contained: inline CSS, opens in any browser, no external assets.
// Plain-language was/became, severity badges, actionable recommendations.

package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

func nowUTC() time.Time { return time.Now().UTC() }

func esc(s string) string {
	r := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&quot;")
	return r.Replace(s)
}

func severityBadge(sev string) string {
	switch sev {
	case "DANGEROUS":
		return `<span style="background:#dc2626;color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;margin-left:8px">🔴 DANGEROUS</span>`
	case "REVIEW":
		return `<span style="background:#f59e0b;color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;margin-left:8px">🟡 REVIEW</span>`
	case "SAFE":
		return `<span style="background:#10b981;color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;margin-left:8px">🟢 SAFE</span>`
	}
	return ""
}

func statusIcon(status string) string {
	switch status {
	case "UNCHANGED":
		return "✅"
	case "DRIFT":
		return "⚠️"
	case "NEW":
		return "🆕"
	case "REMOVED":
		return "🗑️"
	}
	return "❓"
}

// plainLanguageReason mirrors plainLanguageReason in skills-report.js.
func plainLanguageReason(ch *Changes) []string {
	if ch == nil {
		return nil
	}
	var reasons []string
	seen := map[string]bool{}
	add := func(r string) {
		if !seen[r] {
			seen[r] = true
			reasons = append(reasons, r)
		}
	}
	for _, line := range ch.Added {
		if regexpContains(line, `(?i)\.env|credential|api[_-]?key|secret|password`) {
			add("References sensitive files (passwords, API keys)")
		}
		if regexpContains(line, `(?i)https?://`) && !regexpContains(line, `(?i)github\.com|npmjs`) {
			add("Communicates with an external server")
		}
		if regexpContains(line, `(?i)do\s+not\s+tell|hide\s+from`) {
			add("Instructs the AI to hide information from you")
		}
		if regexpContains(line, `(?i)curl|wget|rm\s+-rf|exec|eval`) {
			add("Executes dangerous commands")
		}
		if regexpContains(line, `(?i)ignore.*instructions`) {
			add("Attempts to override system instructions")
		}
	}
	if len(reasons) > 3 {
		reasons = reasons[:3]
	}
	return reasons
}

func recommendation(sev string) string {
	switch sev {
	case "DANGEROUS":
		return `<div style="background:#fef2f2;border:1px solid #dc2626;border-radius:8px;padding:12px;margin:10px 0">
<b style="color:#dc2626">🚨 What you should do:</b>
<p style="margin:6px 0 0;color:#374151">Do NOT update this skill. Restore the previous version immediately. This change could expose your passwords, API keys, or other sensitive data.</p></div>`
	case "REVIEW":
		return `<div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin:10px 0">
<b style="color:#b45309">⚠️ Recommended:</b>
<p style="margin:6px 0 0;color:#374151">Review the changes below before accepting this update. If you didn't expect this change, ask the person who maintains this skill.</p></div>`
	case "SAFE":
		return `<div style="background:#f0fdf4;border:1px solid #10b981;border-radius:8px;padding:12px;margin:10px 0">
<b style="color:#059669">✅ Looks safe:</b>
<p style="margin:6px 0 0;color:#374151">This appears to be a minor edit (typo fix, formatting, or documentation). No dangerous patterns detected.</p></div>`
	}
	return ""
}

func formatDiffBlock(ch *Changes) string {
	if ch == nil || (len(ch.Added) == 0 && len(ch.Removed) == 0) {
		return ""
	}
	var b strings.Builder
	b.WriteString(`<div style="background:#1a1a2e;border-radius:8px;padding:14px;margin:10px 0;font-family:monospace;font-size:13px;overflow-x:auto">`)
	n := 0
	for i, line := range ch.Removed {
		if i >= 10 {
			break
		}
		fmt.Fprintf(&b, `<div style="color:#ef4444;padding:1px 0">- %s</div>`, esc(truncate(strings.TrimSpace(line), 120)))
		n++
	}
	for i, line := range ch.Added {
		if i >= 10 {
			break
		}
		fmt.Fprintf(&b, `<div style="color:#22c55e;padding:1px 0">+ %s</div>`, esc(truncate(strings.TrimSpace(line), 120)))
		n++
	}
	total := len(ch.Added) + len(ch.Removed)
	if total > 20 {
		fmt.Fprintf(&b, `<div style="color:#64748b;padding:4px 0">... and %d more changes</div>`, total-20)
	}
	b.WriteString("</div>")
	return b.String()
}

func truncate(s string, n int) string {
	if len(s) > n {
		return s[:n-1] + "…"
	}
	return s
}

func plural(n int, one, many string) string {
	if n == 1 {
		return one
	}
	return many
}

// severityRank orders report cards: DANGEROUS first.
func severityRank(sev string) int {
	switch sev {
	case "DANGEROUS":
		return 0
	case "REVIEW":
		return 1
	case "SAFE":
		return 2
	}
	return 3
}

// GenerateReport renders the self-contained HTML report. updateLine, when
// non-empty, adds a self-update notice to the footer (see updatecheck.go).
func GenerateReport(results []DiffResult, generatedAt time.Time, updateLine string) (string, ReportCounts) {
	var dangerous, review, safe, unchanged, allNew, removed []DiffResult
	for _, r := range results {
		switch {
		case r.Severity != nil && *r.Severity == "DANGEROUS":
			dangerous = append(dangerous, r)
		case r.Severity != nil && *r.Severity == "REVIEW":
			review = append(review, r)
		case r.Severity != nil && *r.Severity == "SAFE":
			safe = append(safe, r)
		}
		switch r.Status {
		case "UNCHANGED":
			unchanged = append(unchanged, r)
		case "NEW":
			allNew = append(allNew, r)
		case "REMOVED":
			removed = append(removed, r)
		}
	}

	// deterministic order: severity rank, then key (JS kept insertion order)
	ordered := append(append(append([]DiffResult{}, dangerous...), review...), safe...)
	sort.SliceStable(ordered, func(i, j int) bool {
		return severityRank(deref(ordered[i].Severity)) < severityRank(deref(ordered[j].Severity))
	})

	var cards strings.Builder
	for _, r := range ordered {
		if r.Status == "UNCHANGED" {
			continue
		}
		var reasonsBlock strings.Builder
		reasons := plainLanguageReason(r.Changes)
		if len(reasons) > 0 {
			reasonsBlock.WriteString(`<div style="margin:10px 0;padding:10px;background:#f8fafc;border-radius:6px">
<b style="font-size:13px;color:#334155">What changed:</b>
<ul style="margin:6px 0 0 16px;padding:0;color:#475569;font-size:13px">`)
			for _, reason := range reasons {
				fmt.Fprintf(&reasonsBlock, "<li>%s</li>", esc(reason))
			}
			reasonsBlock.WriteString("</ul></div>")
		}
		sev := deref(r.Severity)
		advLine := ""
		if r.Advisory != nil {
			advLine = fmt.Sprintf(`<div style="color:#94a3b8;font-size:11px;margin-top:6px">Advisory score: %d (%s)</div>`,
				r.Advisory.Score, esc(strings.Join(r.Advisory.Signals, ", ")))
		}
		fmt.Fprintf(&cards, `
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin:14px 0;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
    <div>
      <span style="font-size:18px">%s</span>
      <b style="font-size:16px;margin-left:6px">%s</b>
      %s
    </div>
    <span style="color:#64748b;font-size:12px">%s</span>
  </div>
  %s
  %s
  %s
  %s
</div>`,
			statusIcon(r.Status), esc(r.Key), severityBadge(sev), esc(r.App),
			reasonsBlock.String(), formatDiffBlock(r.Changes), recommendation(sev), advLine)
	}

	if len(unchanged) > 0 {
		fmt.Fprintf(&cards, `
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;margin:14px 0">
  <b style="color:#059669">✅ %d skill%s unchanged</b>
  <span style="color:#64748b;font-size:13px;margin-left:8px">No changes detected since last check.</span>
</div>`, len(unchanged), plural(len(unchanged), "", "s"))
	}
	if len(allNew) > 0 {
		var keys []string
		for _, r := range allNew {
			keys = append(keys, esc(r.Key))
		}
		fmt.Fprintf(&cards, `
<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px;margin:14px 0">
  <b style="color:#2563eb">🆕 %d new skill%s detected</b>
  <div style="color:#475569;font-size:13px;margin-top:4px">%s</div>
  <div style="color:#94a3b8;font-size:12px;margin-top:6px">These files appeared since the last scan. Review them, then re-run a scan to pin.</div>
</div>`, len(allNew), plural(len(allNew), "", "s"), strings.Join(keys, ", "))
	}
	if len(removed) > 0 {
		var keys []string
		for _, r := range removed {
			keys = append(keys, esc(r.Key))
		}
		fmt.Fprintf(&cards, `
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px;margin:14px 0">
  <b style="color:#dc2626">🗑️ %d skill%s removed</b>
  <div style="color:#475569;font-size:13px;margin-top:4px">%s</div>
</div>`, len(removed), plural(len(removed), "", "s"), strings.Join(keys, ", "))
	}

	overall := "OK"
	if len(dangerous) > 0 {
		overall = "DANGER"
	} else if len(review) > 0 {
		overall = "REVIEW"
	}
	headerColor := "#10b981"
	headerBg := "#f0fdf4"
	headerIcon := "✅"
	headerText := fmt.Sprintf("All %d skills are safe", len(unchanged))
	if overall == "DANGER" {
		headerColor = "#dc2626"
		headerBg = "#fef2f2"
		headerIcon = "🚨"
		headerText = fmt.Sprintf("%d dangerous change%s detected", len(dangerous), plural(len(dangerous), "", "s"))
	} else if overall == "REVIEW" {
		headerColor = "#f59e0b"
		headerBg = "#fffbeb"
		headerIcon = "⚠️"
		headerText = fmt.Sprintf("%d change%s need your review", len(review), plural(len(review), "", "s"))
	}

	dangerNote := ""
	if len(dangerous) > 0 {
		dangerNote = `<p style="color:#dc2626;font-size:14px;margin:4px 0">Your AI agent may be exposed to security risks.</p>`
	}

	body := fmt.Sprintf(`<!DOCTYPE html>
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
    <p style="color:#64748b;font-size:14px;margin:8px 0 0">%s · %d skill%s checked</p>
  </div>

  <div style="background:%s;border:2px solid %s;border-radius:14px;padding:20px;margin:16px 0;text-align:center">
    <div style="font-size:48px">%s</div>
    <h2 style="font-size:20px;color:%s;margin:10px 0 4px">%s</h2>
    %s
  </div>

  %s

  %s

  %s

  <div style="text-align:center;padding:24px 0;color:#94a3b8;font-size:12px">
    Generated by <a href="https://rugsnare.com" style="color:#64748b">RugSnare</a> · Open source, zero dependencies, no telemetry<br>
    <a href="https://github.com/Paraphern/rugsnare" style="color:#64748b">github.com/Paraphern/rugsnare</a>
  </div>

</div>
</body>
</html>`,
		generatedAt.Format("1/2/2006, 3:04:05 PM"),
		len(results), plural(len(results), "", "s"),
		headerBg, headerColor, headerIcon, headerColor, headerText, dangerNote,
		map[bool]string{true: `<h2 style="font-size:20px;color:#0f172a;margin:24px 0 8px;border-bottom:2px solid #e5e7eb;padding-bottom:8px">📝 Skill Files</h2>`}[cards.Len() > 0],
		cards.String(),
		updateNotice(updateLine))

	return body, ReportCounts{
		Total: len(results), Dangerous: len(dangerous), Review: len(review),
		Safe: len(safe), Unchanged: len(unchanged), New: len(allNew), Removed: len(removed),
	}
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// updateNotice renders the self-update line above the footer ("" -> nothing).
func updateNotice(line string) string {
	if line == "" {
		return ""
	}
	return `<div style="text-align:center;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px;margin:16px 0;color:#2563eb;font-size:13px">` +
		esc(line) + `</div>`
}

// ReportCounts mirrors the counts object of writeSkillsReport in JS.
type ReportCounts struct {
	Total     int
	Dangerous int
	Review    int
	Safe      int
	Unchanged int
	New       int
	Removed   int
}

// WriteReport writes the report file and returns its path.
func WriteReport(results []DiffResult, cwd, updateLine string) (string, ReportCounts, error) {
	htmlBody, counts := GenerateReport(results, time.Now(), updateLine)
	dir := rugsnareDir(cwd)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", counts, err
	}
	reportPath := filepath.Join(dir, "skills-report.html")
	if err := os.WriteFile(reportPath, []byte(htmlBody), 0o644); err != nil {
		return "", counts, err
	}
	return reportPath, counts, nil
}
