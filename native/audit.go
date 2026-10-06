// Current-state audit — the cold-start answer (review 32 discussion).
//
// Pinning is TOFU: the first scan blesses whatever is on disk, including a
// skill that was poisoned BEFORE RugSnare was installed. Drift detection
// can't help there (nothing to diff against) — but the advisory signals can:
// they read the TEXT, not the change. This module surfaces "already
// suspicious" files at first contact, independent of any baseline.

package main

import "os"

// AuditFinding is one pre-existing risk in the current state.
type AuditFinding struct {
	Key     string // app/scope/relative, same key space as pins
	App     string
	Path    string
	Score   int
	Signals []string
}

// AuditCurrentSkills scans every discovered skill file's CONTENT with the
// advisory engine. Returns findings sorted by score (desc) then key.
// Files that trigger no advisory are not returned — clean stays quiet.
func AuditCurrentSkills(cwd, home string) []AuditFinding {
	var out []AuditFinding
	for _, s := range DiscoverSkills(cwd, home) {
		data, err := os.ReadFile(s.Path)
		if err != nil {
			continue
		}
		if adv := ScanContentAdvisory(string(data)); adv != nil {
			out = append(out, AuditFinding{
				Key: SkillKey(s), App: s.App, Path: s.Path,
				Score: adv.Score, Signals: adv.Signals,
			})
		}
	}
	sortAuditFindings(out)
	return out
}

func sortAuditFindings(f []AuditFinding) {
	for i := 1; i < len(f); i++ {
		for j := i; j > 0 && auditLess(f[j], f[j-1]); j-- {
			f[j], f[j-1] = f[j-1], f[j]
		}
	}
}

func auditLess(a, b AuditFinding) bool {
	if a.Score != b.Score {
		return a.Score > b.Score
	}
	return a.Key < b.Key
}
