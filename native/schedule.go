// Scheduled checks — the "hands forget" answer without a resident process
// and without admin rights.
//
// Two registration points:
//   logon → a shortcut in the user's Startup folder (no elevation needed;
//           Task Scheduler ONLOGON triggers require admin, the Startup
//           folder is the unelevated equivalent)
//   daily  → a Task Scheduler task at 12:00 (schtasks, works unelevated)
// Both run `<exe> check -cwd <baseline dir> -quiet`: silent when clean,
// report + browser only when findings exist. The program still never stays
// resident — it runs and exits.

package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

const (
	taskNameDaily     = "RugSnare Skills check (daily)"
	startupScriptName = "rugsnare-skills-check.cmd"
)

// scheduledTR builds the command line both registration points run: the
// exact exe path plus the baseline directory, quoted for spaces, quiet.
func scheduledTR(exePath, baselineDir string) string {
	return fmt.Sprintf(`"%s" check -cwd "%s" -quiet`, exePath, baselineDir)
}

func runSchtasks(args ...string) (string, error) {
	out, err := exec.Command("schtasks", args...).CombinedOutput()
	return string(out), err
}

// startupDir resolves the per-user Startup folder.
func startupDir() (string, error) {
	appData := os.Getenv("APPDATA")
	if appData == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		appData = filepath.Join(home, "AppData", "Roaming")
	}
	return filepath.Join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "Startup"), nil
}

func startupScriptPath() (string, error) {
	dir, err := startupDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, startupScriptName), nil
}

// startupScriptContent builds the .cmd the Startup folder runs at logon.
func startupScriptContent(exePath, baselineDir string) string {
	return "@echo off\r\n" + scheduledTR(exePath, baselineDir) + "\r\n"
}

// installSchedule registers the logon shortcut and the daily task.
func installSchedule(cwd string) error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("scheduled checks are not implemented on %s yet — see docs/future.md", runtime.GOOS)
	}
	exePath, err := os.Executable()
	if err != nil {
		return err
	}

	// 1) logon: Startup folder script (unelevated by design)
	scriptPath, err := startupScriptPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(scriptPath), 0o755); err != nil {
		return fmt.Errorf("startup folder: %w", err)
	}
	if err := os.WriteFile(scriptPath, []byte(startupScriptContent(exePath, cwd)), 0o644); err != nil {
		return fmt.Errorf("write startup script: %w", err)
	}

	// 2) daily: Task Scheduler task
	if out, err := runSchtasks("/Create", "/F",
		"/TN", taskNameDaily,
		"/SC", "DAILY",
		"/ST", "12:00",
		"/TR", scheduledTR(exePath, cwd),
	); err != nil {
		// roll back the startup script so we never leave a half install
		os.Remove(scriptPath)
		return fmt.Errorf("schtasks (daily): %s: %w", out, err)
	}

	fmt.Println("Scheduled checks installed:")
	fmt.Println("  - at every logon (Startup folder shortcut)")
	fmt.Println("  - daily at 12:00 (Task Scheduler)")
	fmt.Printf("  - command: %s\n", scheduledTR(exePath, cwd))
	fmt.Println("  - silent when everything matches; opens the report only when something changed")
	fmt.Println("Remove any time with: rugsnare-skills remove-schedule")
	return nil
}

// removeSchedule deletes both registration points; missing pieces are fine.
func removeSchedule() error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("scheduled checks are not implemented on %s yet — see docs/future.md", runtime.GOOS)
	}
	if scriptPath, err := startupScriptPath(); err == nil {
		if err := os.Remove(scriptPath); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("remove startup script: %w", err)
		}
	}
	if _, err := runSchtasks("/Delete", "/TN", taskNameDaily, "/F"); err != nil {
		if _, qerr := runSchtasks("/Query", "/TN", taskNameDaily); qerr == nil {
			return fmt.Errorf("schtasks (delete): %w", err)
		}
		// task did not exist — fine
	}
	fmt.Println("Scheduled checks removed.")
	return nil
}
