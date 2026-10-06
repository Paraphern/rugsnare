// Drift detection and severity classification — port of the diff half of
// product/src/skills-pin.js (diffSkills, diffLines, classifySeverity).

package main

import (
	"os"
	"regexp"
)

// dangerousPatterns mirrors DANGEROUS_PATTERNS in skills-pin.js, except the
// external-URL rule which needs code (RE2 has no negative lookahead) and
// lives in containsExternalURL.
var dangerousPatterns = []*regexp.Regexp{
	// "token" alone false-positives on LLM prose ("count the tokens"), so it
	// requires credential context
	regexp.MustCompile(`(?i)\.env|credentials?|api[_-]?key|secrets?|passwords?|\b(api|access|auth|refresh|session)[_-]?tokens?\b|\btokens?\s*[:=]`),
	// (external URL rule: containsExternalURL)
	regexp.MustCompile(`(?i)do\s+not\s+tell|don'?t\s+tell|do\s+not\s+inform|don'?t\s+inform|hide\s+from\s+(the\s+)?(user|owner)`),
	regexp.MustCompile(`(?i)\b(curl|wget|rm\s+-rf|chmod\s+777|eval|exec|system\s*\()`),
	regexp.MustCompile(`(?i)ignore\s+(all\s+)?(previous|prior|above|system)\s+(instructions?|prompt|rules?)`),
	regexp.MustCompile(`(?i)base64[ -]?(encode|decoded?)|exfiltrat|upload\s+to|send\s+to|forward\s+to`),
}

var urlPattern = regexp.MustCompile(`(?i)https?://`)

// urlAllowlist mirrors the JS lookahead exemption list.
var urlAllowlist = regexp.MustCompile(`(?i)github\.com|npmjs|readthedocs|wikipedia`)

// containsExternalURL is per-line: a line that carries an http(s) URL without
// an allowlisted host. The JS regex was position-based lookahead; per-line is
// the closest deterministic RE2 equivalent (a URL on the same line as a
// github.com mention is treated as explained, matching the intent).
func containsExternalURL(text string) bool {
	for _, line := range splitLines(text) {
		if urlPattern.MatchString(line) && !urlAllowlist.MatchString(line) {
			return true
		}
	}
	return false
}

var safePatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)^(typo|fix|format|cleanup|docs?|readme|comment)`),
}

// Changes mirrors the { added, removed } shape of diffLines in JS.
type Changes struct {
	Added   []string `json:"added"`
	Removed []string `json:"removed"`
}

func splitLines(s string) []string {
	var out []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			out = append(out, s[start:i])
			start = i + 1
		}
	}
	out = append(out, s[start:])
	return out
}

// DiffLines is a simple line-membership diff, same semantics as JS:
// added = lines present in new but not in old (by value), removed = inverse.
func DiffLines(oldText, newText string) Changes {
	oldLines := splitLines(oldText)
	newLines := splitLines(newText)
	oldSet := map[string]bool{}
	for _, l := range oldLines {
		oldSet[l] = true
	}
	newSet := map[string]bool{}
	for _, l := range newLines {
		newSet[l] = true
	}
	var ch Changes
	for _, l := range newLines {
		if !oldSet[l] {
			ch.Added = append(ch.Added, l)
		}
	}
	for _, l := range oldLines {
		if !newSet[l] {
			ch.Removed = append(ch.Removed, l)
		}
	}
	return ch
}

// ClassifySeverity classifies by what was ADDED (not the whole file).
// Mirrors classifySeverity in skills-pin.js.
// ClassifySeverity classifies by what changed. Added lines drive the
// DANGEROUS checks; pure deletions are REVIEW at minimum — silently REMOVED
// safety language (the "Requires confirmation" strip) must never read as SAFE.
func ClassifySeverity(ch Changes) string {
	added := ch.Added
	if len(added) == 0 {
		if len(ch.Removed) > 0 {
			return "REVIEW"
		}
		return "SAFE"
	}
	addedText := joinLines(added)

	for _, p := range dangerousPatterns {
		if p.MatchString(addedText) {
			return "DANGEROUS"
		}
	}
	if containsExternalURL(addedText) {
		return "DANGEROUS"
	}

	if len(added) > 5 {
		return "REVIEW" // significant text changes
	}
	for _, p := range safePatterns {
		if p.MatchString(addedText) {
			return "SAFE"
		}
	}
	return "REVIEW" // default for any change without a clear signal
}

func joinLines(lines []string) string {
	res := ""
	for i, l := range lines {
		if i > 0 {
			res += "\n"
		}
		res += l
	}
	return res
}

// DiffResult is one row of the skills diff.
type DiffResult struct {
	Key      string    `json:"key"`
	Status   string    `json:"status"` // UNCHANGED | DRIFT | NEW | REMOVED
	OldHash  *string   `json:"oldHash"`
	NewHash  *string   `json:"newHash"`
	Severity *string   `json:"severity"`
	Changes  *Changes  `json:"changes"`
	Advisory *Advisory `json:"advisory"`
	App      string    `json:"app,omitempty"`
}

func strPtr(s string) *string { return &s }
func sevPtr(s string) *string { return &s }

// DiffSkills compares pinned skills against current files. Mirrors
// diffSkills in skills-pin.js.
func DiffSkills(pins SkillPinMap, cwd, home string) []DiffResult {
	var results []DiffResult
	current := DiscoverSkills(cwd, home)
	currentMap := map[string]Skill{}
	for _, s := range current {
		currentMap[SkillKey(s)] = s
	}

	for key, pin := range pins {
		live, ok := currentMap[key]
		if !ok {
			results = append(results, DiffResult{
				Key: key, Status: "REMOVED", OldHash: strPtr(pin.Hash),
				NewHash: nil, Severity: nil, Changes: &Changes{}, Advisory: nil, App: pin.App,
			})
			continue
		}
		newHash, err := HashSkillFile(live.Path)
		if err != nil {
			newHash = ""
		}
		if newHash == pin.Hash {
			results = append(results, DiffResult{
				Key: key, Status: "UNCHANGED", OldHash: strPtr(pin.Hash),
				NewHash: strPtr(newHash), Severity: nil, Changes: &Changes{}, Advisory: nil, App: pin.App,
			})
		} else {
			// DRIFT: analyze the change using the PINNED content (not the live file)
			newContentBytes, err := os.ReadFile(live.Path)
			newContent := ""
			if err == nil {
				newContent = string(newContentBytes)
			}
			oldContent := pin.Content
			if oldContent == "" {
				if b, err := os.ReadFile(pin.Path); err == nil {
					oldContent = string(b)
				}
			}
			ch := DiffLines(oldContent, newContent)
			sev := ClassifySeverity(ch)
			results = append(results, DiffResult{
				Key: key, Status: "DRIFT", OldHash: strPtr(pin.Hash), NewHash: strPtr(newHash),
				Severity: sevPtr(sev), Changes: &ch, Advisory: ScanContentAdvisory(newContent), App: pin.App,
			})
		}
		delete(currentMap, key) // handled
	}

	// anything left in currentMap is NEW (not pinned)
	for key, s := range currentMap {
		contentBytes, err := os.ReadFile(s.Path)
		content := ""
		if err == nil {
			content = string(contentBytes)
		}
		adv := ScanContentAdvisory(content)
		hash, _ := HashSkillFile(s.Path)
		var sev *string
		if adv != nil {
			sev = sevPtr("REVIEW")
		}
		results = append(results, DiffResult{
			Key: key, Status: "NEW", OldHash: nil, NewHash: strPtr(hash),
			Severity: sev, Changes: &Changes{}, Advisory: adv, App: s.App,
		})
	}
	return results
}
