// RugSnare native launcher — skills security in a single binary.
//
// Commands:
//   rugsnare-skills scan     pin all discovered skill files (baseline)
//   rugsnare-skills diff     compare current files against pins, exit 1 on findings
//   rugsnare-skills report   diff + write HTML report + open it in the browser
//   rugsnare-skills check    default: scan if no baseline, else diff; always report
//
// Flags:
//   -cwd PATH    project directory (default: current directory)
//   -home PATH   home directory override (default: OS user home)
//   -no-browser  write the report but do not open it

package main

import (
	"fmt"
	"os"
	"path/filepath"
)

const version = "1.1.0-native.1"

func usage() {
	fmt.Fprint(os.Stderr, `RugSnare skills security (native launcher) `+version+`

Usage:
  rugsnare-skills [scan|diff|report|check] [-cwd PATH] [-home PATH] [-no-browser]

  scan     discover and pin all skill files (creates the baseline)
  diff     compare files against the baseline, exit 1 on any finding
  report   diff + self-contained HTML report, opens in your browser
  check    (default) scan if there is no baseline yet, then diff + report

Skill files are instruction files your AI agent reads (SKILL.md, .mdc,
rules, conventions). This tool pins them with SHA-256 and tells you, in
plain language, when one of them changed after you approved it.

Works with Claude Code, Cursor, Windsurf, Continue, Cline, ZCode, Copilot,
Codex, Amp, Kiro, OpenCode, Antigravity, Aider, Devin.
`)
}

func main() {
	args := os.Args[1:]
	cmd := "check"
	cwd, _ := os.Getwd()
	home, _ := os.UserHomeDir()
	noBrowser := false

	i := 0
	for i < len(args) {
		a := args[i]
		switch a {
		case "scan", "diff", "report", "check":
			cmd = a
		case "-cwd":
			if i+1 < len(args) {
				i++
				cwd = args[i]
			}
		case "-home":
			if i+1 < len(args) {
				i++
				home = args[i]
			}
		case "-no-browser":
			noBrowser = true
		case "-h", "-help", "--help", "help":
			usage()
			return
		case "-v", "-version", "--version", "version":
			fmt.Println("rugsnare-skills " + version)
			return
		default:
			fmt.Fprintf(os.Stderr, "unknown argument: %s\n\n", a)
			usage()
			os.Exit(2)
		}
		i++
	}

	if err := absPaths(&cwd, &home); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(2)
	}

	switch cmd {
	case "scan":
		cmdScan(cwd, home)
	case "diff":
		os.Exit(cmdDiff(cwd, home))
	case "report":
		os.Exit(cmdReport(cwd, home, noBrowser))
	case "check":
		cmdCheck(cwd, home, noBrowser)
	}
}

func absPaths(cwd, home *string) error {
	var err error
	if *cwd, err = filepath.Abs(*cwd); err != nil {
		return fmt.Errorf("cwd: %w", err)
	}
	if *home, err = filepath.Abs(*home); err != nil {
		return fmt.Errorf("home: %w", err)
	}
	return nil
}

func cmdScan(cwd, home string) {
	pins, err := LoadSkillPins(cwd)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(2)
	}
	if pins == nil {
		pins = SkillPinMap{}
	}
	n := PinAllSkills(pins, cwd, home)
	if err := SaveSkillPins(cwd, pins); err != nil {
		fmt.Fprintln(os.Stderr, "error saving pins:", err)
		os.Exit(2)
	}
	fmt.Printf("Pinned %d skill file(s). Baseline: %s\n", n, pinsPath(cwd))
	fmt.Println("Run again any time to check for changes (diff), or just double-click this program (check).")
}

func cmdDiff(cwd, home string) int {
	pins, err := LoadSkillPins(cwd)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(2)
	}
	if len(pins) == 0 {
		fmt.Println("No baseline yet. Run scan first (or just run with no arguments).")
		return 0
	}
	results := DiffSkills(pins, cwd, home)
	findings := 0
	for _, r := range results {
		if r.Status == "UNCHANGED" {
			continue
		}
		findings++
		sev := ""
		if r.Severity != nil {
			sev = *r.Severity
		}
		fmt.Printf("  [%s] %s %s\n", r.Status, r.Key, sev)
		if r.Changes != nil {
			for j, line := range r.Changes.Added {
				if j >= 3 {
					fmt.Printf("    + ... (%d more)\n", len(r.Changes.Added)-3)
					break
				}
				fmt.Printf("    + %s\n", truncate(line, 80))
			}
		}
	}
	fmt.Printf("Skills: %d finding(s)\n", findings)
	if findings > 0 {
		return 1
	}
	fmt.Println("All pinned skills unchanged.")
	return 0
}

func cmdReport(cwd, home string, noBrowser bool) int {
	pins, err := LoadSkillPins(cwd)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(2)
	}
	if len(pins) == 0 {
		fmt.Println("No baseline yet. Run scan first (or just run with no arguments).")
		return 0
	}
	results := DiffSkills(pins, cwd, home)
	reportPath, counts, err := WriteReport(results, cwd)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error writing report:", err)
		os.Exit(2)
	}
	fmt.Printf("Report: %s\n", reportPath)
	fmt.Printf("  %d dangerous, %d review, %d safe, %d unchanged\n",
		counts.Dangerous, counts.Review, counts.Safe, counts.Unchanged)
	if !noBrowser {
		if err := openBrowser(reportPath); err != nil {
			fmt.Println("Open this file in your browser:", reportPath)
		}
	}
	if counts.Dangerous > 0 || counts.Review > 0 {
		return 1
	}
	return 0
}

// cmdCheck is the double-click flow: baseline if needed, then always report.
func cmdCheck(cwd, home string, noBrowser bool) {
	pins, err := LoadSkillPins(cwd)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(2)
	}
	if len(pins) == 0 {
		fmt.Println("First run: creating your baseline...")
		cmdScan(cwd, home)
		pins, err = LoadSkillPins(cwd)
		if err != nil || len(pins) == 0 {
			os.Exit(2)
		}
	}
	results := DiffSkills(pins, cwd, home)
	reportPath, counts, err := WriteReport(results, cwd)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error writing report:", err)
		os.Exit(2)
	}
	fmt.Printf("Report: %s\n", reportPath)
	fmt.Printf("  %d dangerous, %d review, %d safe, %d unchanged, %d new, %d removed\n",
		counts.Dangerous, counts.Review, counts.Safe, counts.Unchanged, counts.New, counts.Removed)
	if !noBrowser {
		if err := openBrowser(reportPath); err != nil {
			fmt.Println("Open this file in your browser:", reportPath)
		}
	}
	if counts.Dangerous > 0 || counts.Review > 0 {
		os.Exit(1)
	}
}
