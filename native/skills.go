// Package main — RugSnare native launcher.
//
// A single-binary port of the skills-security half of RugSnare (npm CLI):
// discover skill files across AI platforms, SHA-256 pin them, detect drift,
// classify severity, and open a self-contained HTML report in the browser.
//
// Wire format is pins.json-compatible with the npm CLI: this binary reads
// and writes the same `.rugsnare/pins.json` `skills` subtree, so both tools
// can be used interchangeably on the same machine.
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"strings"
)

// textExtensions mirrors skills-pin.js TEXT_EXTENSIONS.
var textExtensions = map[string]bool{
	".md": true, ".mdc": true, ".txt": true, ".yaml": true, ".yml": true,
	".json": true, ".sh": true, ".py": true, ".js": true, ".ts": true,
}

const (
	maxFileSize = 1024 * 1024 // 1MB per file, same as JS
	maxDepth    = 4
)

// SkillLocation mirrors SKILL_LOCATIONS in product/src/skills-pin.js.
// Order matters: first match wins after path dedup (same as JS).
type SkillLocation struct {
	App     string
	Scope   string // "user" | "project"
	Pattern string
}

var skillLocations = []SkillLocation{
	// Claude Code (Anthropic)
	{"claude-code", "user", ".claude/skills"},
	{"claude-code", "user", ".claude/commands"},
	{"claude-code", "project", ".claude/skills"},
	{"claude-code", "project", ".claude/commands"},
	// Cursor
	{"cursor", "project", ".cursor/rules"},
	{"cursor", "user", ".cursor/rules"},
	// Windsurf (ex-Codeium)
	{"windsurf", "project", ".windsurf/rules"},
	{"windsurf", "user", ".windsurf/rules"},
	// Continue
	{"continue", "project", ".continue"},
	{"continue", "user", ".continue"},
	// Cline (VS Code extension)
	{"cline", "project", ".cline"},
	// ZCode
	{"zcode", "user", ".zcode/cli/plugins/cache"},
	// GitHub Copilot
	{"copilot", "project", ".github/copilot-instructions.md"},
	// OpenAI Codex
	{"codex", "project", ".codex"},
	// Amp (Anthropic)
	{"amp", "project", ".amp"},
	// Kiro (AWS)
	{"kiro", "project", ".kiro"},
	// OpenCode
	{"opencode", "project", ".opencode"},
	// Antigravity (Google)
	{"antigravity", "project", ".antigravity"},
	// Aider (convention files)
	{"aider", "project", "CONVENTIONS.md"},
	// Devin
	{"devin", "project", ".devin"},
}

// Skill is one discovered skill file.
type Skill struct {
	Path     string // absolute-ish path as constructed from base
	App      string
	Scope    string
	Relative string // path relative to the location base
}

// DiscoverSkills walks all known skill locations. cwd is the project
// directory (project-scope locations resolve against it), home the user
// directory (user-scope locations).
func DiscoverSkills(cwd, home string) []Skill {
	var found []Skill
	seen := map[string]bool{} // dedup by resolved absolute path

	for _, loc := range skillLocations {
		base := filepath.Join(home, filepath.FromSlash(loc.Pattern))
		if loc.Scope == "project" {
			base = filepath.Join(cwd, filepath.FromSlash(loc.Pattern))
		}
		if _, err := os.Stat(base); err != nil {
			continue
		}
		files := walkSkillDir(base, 0)
		for _, file := range files {
			resolved, err := filepath.Abs(file)
			if err != nil {
				resolved = file
			}
			if seen[resolved] {
				continue // same file found via multiple patterns
			}
			seen[resolved] = true
			found = append(found, Skill{
				Path:     file,
				App:      loc.App,
				Scope:    loc.Scope,
				Relative: relPath(base, file),
			})
		}
	}
	return found
}

// relPath is filepath.Rel with a fallback to the file path itself.
func relPath(base, file string) string {
	r, err := filepath.Rel(base, file)
	if err != nil {
		return file
	}
	return r
}

func walkSkillDir(dir string, depth int) []string {
	if depth > maxDepth {
		return nil
	}
	var out []string
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}
	for _, entry := range entries {
		full := filepath.Join(dir, entry.Name())
		if entry.IsDir() {
			// skip noise directories (same rules as JS)
			name := entry.Name()
			if name == "node_modules" || name == ".git" || strings.HasPrefix(name, "__") {
				continue
			}
			out = append(out, walkSkillDir(full, depth+1)...)
			continue
		}
		if !entry.Type().IsRegular() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(entry.Name()))
		if !textExtensions[ext] {
			continue
		}
		if info, err := entry.Info(); err == nil {
			if info.Size() > 0 && info.Size() <= maxFileSize {
				out = append(out, full)
			}
		}
	}
	return out
}

// HashSkillFile returns the sha-256 hex of the file bytes.
func HashSkillFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:]), nil
}

// SkillPin is one entry of the `skills` subtree in .rugsnare/pins.json.
// Field names and shapes mirror pinSkillFile() in skills-pin.js.
// Note: `size` is the byte length here; the JS CLI stores UTF-16 code-unit
// length of the decoded string (identical for ASCII, informational only).
type SkillPin struct {
	Hash      string    `json:"hash"`
	App       string    `json:"app"`
	Scope     string    `json:"scope"`
	Relative  string    `json:"relative"`
	Path      string    `json:"path"`
	Size      int       `json:"size"`
	Content   string    `json:"content"`
	FirstSeen string    `json:"firstSeen"`
	PinnedAt  string    `json:"pinnedAt"`
	Approved  bool      `json:"approved"`
	Advisory  *Advisory `json:"advisory"`
}

// Advisory mirrors the compact advisory object stored by the JS CLI.
type Advisory struct {
	Score   int      `json:"score"`
	Signals []string `json:"signals"`
}

// isoNow mirrors JS new Date().toISOString().
func isoNow() string {
	return nowUTC().Format("2006-01-02T15:04:05.000Z")
}

// PinSkill builds a pin entry from a discovered skill file.
func PinSkill(skill Skill) (*SkillPin, error) {
	data, err := os.ReadFile(skill.Path)
	if err != nil {
		return nil, err
	}
	sum := sha256.Sum256(data)
	content := string(data)
	adv := ScanContentAdvisory(content)
	return &SkillPin{
		Hash:      hex.EncodeToString(sum[:]),
		App:       skill.App,
		Scope:     skill.Scope,
		Relative:  skill.Relative,
		Path:      skill.Path,
		Size:      len(data),
		Content:   content,
		FirstSeen: isoNow(),
		PinnedAt:  isoNow(),
		Approved:  false,
		Advisory:  adv,
	}, nil
}

// SkillKey mirrors the JS key format: app/scope/relative, where relative
// keeps NATIVE path separators (the npm CLI stores them native: backslash
// on Windows). Do NOT normalize to slashes — the keys must match byte-for-byte
// with pins written by the JS CLI on the same platform.
func SkillKey(s Skill) string {
	return s.App + "/" + s.Scope + "/" + s.Relative
}

// PinAllSkills pins every discovered skill, preserving firstSeen/approved
// from an existing pin for the same key (same as pinAllSkills in JS).
// Returns the number of pinned files.
func PinAllSkills(pins SkillPinMap, cwd, home string) int {
	skills := DiscoverSkills(cwd, home)
	count := 0
	for _, skill := range skills {
		key := SkillKey(skill)
		entry, err := PinSkill(skill)
		if err != nil {
			continue // unreadable file: skip, same spirit as JS walk guards
		}
		if existing, ok := pins[key]; ok {
			entry.FirstSeen = existing.FirstSeen // preserve
			entry.Approved = existing.Approved   // preserve
		}
		pins[key] = *entry
		count++
	}
	return count
}
