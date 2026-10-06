// RugSnare native launcher — skills security in a single binary.
//
// Commands:
//   rugsnare-skills scan     pin all discovered skill files (baseline)
//   rugsnare-skills diff     compare current files against pins, exit 1 on findings
//   rugsnare-skills report   diff + write HTML report + open it in the browser
//   rugsnare-skills check    default: scan if no baseline, else diff; always report
//   rugsnare-skills install-schedule   register logon + daily checks (Task Scheduler)
//   rugsnare-skills remove-schedule    remove them
//
// Flags:
//   -cwd PATH    project directory (default: current directory)
//   -home PATH   home directory override (default: OS user home)
//   -no-browser  write the report but do not open it
//   -quiet       minimal output; open the browser only when findings exist
//                (used by the scheduled tasks)
//   -no-update-check  skip the version lookup (RUGSNARE_NO_UPDATE_CHECK works too)

package main

import (
	"fmt"
	"os"
	"path/filepath"
)

const version = "1.1.0-native.3"

func usage() {
	fmt.Fprint(os.Stderr, `RugSnare skills security (native launcher) `+version+`

Usage:
  rugsnare-skills [scan|diff|report|check] [-cwd PATH] [-home PATH] [-no-browser] [-quiet] [-no-update-check]
  rugsnare-skills install-schedule | remove-schedule

  scan     discover and pin all skill files (creates the baseline)
  diff     compare files against the baseline, exit 1 on any finding
  report   diff + self-contained HTML report, opens in your browser
  check    (default) scan if there is no baseline yet, then diff + report
  install-schedule   check automatically at every logon and daily at 12:00
                     (silent when clean, opens the report when something
                     changed; no resident process — run from the folder
                     holding your baseline, usually the exe's folder)
  remove-schedule    remove the automatic checks

Skill files are instruction files your AI agent reads (SKILL.md, .mdc,
rules, conventions). This tool pins them with SHA-256 and tells you, in
plain language, when one of them changed after you approved it. The first
run also audits what is ALREADY on your machine (pre-existing risk
patterns), because pinning alone would bless a poisoned skill that was
installed before this tool.

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
	noUpdateCheck := false
	quiet := false

	i := 0
	for i < len(args) {
		a := args[i]
		switch a {
		case "scan", "diff", "report", "check":
			cmd = a
		case "install-schedule", "remove-schedule":
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
		case "-no-update-check":
			noUpdateCheck = true
		case "-quiet":
			quiet = true
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
		cmdScan(cwd, home, quiet)
	case "diff":
		os.Exit(cmdDiff(cwd, home))
	case "report":
		os.Exit(cmdReport(cwd, home, noBrowser, noUpdateCheck, quiet))
	case "check":
		cmdCheck(cwd, home, noBrowser, noUpdateCheck, quiet)
	case "install-schedule":
		if err := installSchedule(cwd); err != nil {
			fmt.Fprintln(os.Stderr, "error:", err)
			os.Exit(2)
		}
	case "remove-schedule":
		if err := removeSchedule(); err != nil {
			fmt.Fprintln(os.Stderr, "error:", err)
			os.Exit(2)
		}
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

func cmdScan(cwd, home string, quiet bool) {
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
	if !quiet {
		fmt.Printf("Pinned %d skill file(s). Baseline: %s\n", n, pinsPath(cwd))
		fmt.Println("Run again any time to check for changes (diff), or just double-click this program (check).")
	}

	// cold-start audit: pinning blesses whatever is on disk — also tell the
	// user what ALREADY looks suspicious before the baseline existed
	audit := AuditCurrentSkills(cwd, home)
	if len(audit) > 0 {
		fmt.Printf("\n%d file(s) in your current skills contain risk patterns (they were like this BEFORE pinning — not update drift):\n", len(audit))
		for j, f := range audit {
			if j >= 10 {
				fmt.Printf("  ... +%d more\n", len(audit)-10)
				break
			}
			fmt.Printf("  [!] %s (score %d: %s)\n", f.Key, f.Score, joinStrings(f.Signals))
		}
		fmt.Println("Run `report` (or plain double-click) to see them highlighted in the report.")
	}
}

func joinStrings(ss []string) string {
	res := ""
	for i, s := range ss {
		if i > 0 {
			res += ", "
		}
		res += s
	}
	return res
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

func cmdReport(cwd, home string, noBrowser, noUpdateCheck, quiet bool) int {
	pins, err := LoadSkillPins(cwd)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(2)
	}
	if len(pins) == 0 {
		if !quiet {
			fmt.Println("No baseline yet. Run scan first (or just run with no arguments).")
		}
		return 0
	}
	results := DiffSkills(pins, cwd, home)
	updateLine := ""
	if !updateCheckDisabled(noUpdateCheck) {
		updateLine = checkForUpdate()
		if updateLine != "" && !quiet {
			fmt.Println(updateLine)
		}
	}
	audit := AuditCurrentSkills(cwd, home)
	findings := countsFindings(results)
	reportPath, counts, err := WriteReport(results, cwd, updateLine, audit)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error writing report:", err)
		os.Exit(2)
	}
	if quiet {
		// scheduled mode: say nothing when clean, everything when not
		if findings == 0 {
			return 0
		}
	}
	if !quiet {
		fmt.Printf("Report: %s\n", reportPath)
		fmt.Printf("  %d dangerous, %d review, %d safe, %d unchanged\n",
			counts.Dangerous, counts.Review, counts.Safe, counts.Unchanged)
		if len(audit) > 0 {
			fmt.Printf("  %d pre-existing risk file(s) (already on your machine before the baseline)\n", len(audit))
		}
	}
	if !noBrowser || (quiet && findings > 0) {
		if err := openBrowser(reportPath); err != nil && !quiet {
			fmt.Println("Open this file in your browser:", reportPath)
		}
	}
	// any drift finding fails the run, matching `diff`; audit informs, not blocks
	if findings > 0 {
		return 1
	}
	return 0
}

func countsFindings(results []DiffResult) int {
	n := 0
	for _, r := range results {
		if r.Status != "UNCHANGED" {
			n++
		}
	}
	return n
}

// cmdCheck is the double-click flow: baseline if needed, then always report.
func cmdCheck(cwd, home string, noBrowser, noUpdateCheck, quiet bool) {
	pins, err := LoadSkillPins(cwd)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(2)
	}
	if len(pins) == 0 {
		if !quiet {
			fmt.Println("First run: creating your baseline...")
		}
		cmdScan(cwd, home, quiet)
		pins, err = LoadSkillPins(cwd)
		if err != nil || len(pins) == 0 {
			os.Exit(2)
		}
	}
	results := DiffSkills(pins, cwd, home)
	updateLine := ""
	if !updateCheckDisabled(noUpdateCheck) {
		updateLine = checkForUpdate()
		if updateLine != "" && !quiet {
			fmt.Println(updateLine)
		}
	}
	audit := AuditCurrentSkills(cwd, home)
	findings := countsFindings(results)
	reportPath, counts, err := WriteReport(results, cwd, updateLine, audit)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error writing report:", err)
		os.Exit(2)
	}
	if quiet && findings == 0 {
		return // clean: silent, no window content, exit 0 (audit-only stays quiet too)
	}
	if !quiet {
		fmt.Printf("Report: %s\n", reportPath)
		fmt.Printf("  %d dangerous, %d review, %d safe, %d unchanged, %d new, %d removed\n",
			counts.Dangerous, counts.Review, counts.Safe, counts.Unchanged, counts.New, counts.Removed)
		if len(audit) > 0 {
			fmt.Printf("  %d pre-existing risk file(s) (already on your machine before the baseline)\n", len(audit))
		}
	}
	if !noBrowser || (quiet && findings > 0) {
		if err := openBrowser(reportPath); err != nil && !quiet {
			fmt.Println("Open this file in your browser:", reportPath)
		}
	}
	// any drift finding (DRIFT/NEW/REMOVED) fails the run, matching `diff`;
	// audit findings inform but do not block (they predate the baseline)
	if findings > 0 {
		os.Exit(1)
	}
}
