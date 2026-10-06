// Update check for the native launcher.
//
// Philosophy: no telemetry — the binary never sends anything anywhere. This
// is the mirror direction of "no silent updates": the user's copy is silent
// forever unless it can SEE that a newer build exists. One GET to a static
// text file on rugsnare.com (no identifiers, no payload), short timeout,
// fail-silent, opt-out via -no-update-check or RUGSNARE_NO_UPDATE_CHECK.

package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

const latestVersionURL = "https://rugsnare.com/latest-native.txt"

// updateCheckDisabled honors the opt-out flag and env var.
func updateCheckDisabled(flagSet bool) bool {
	if flagSet {
		return true
	}
	return os.Getenv("RUGSNARE_NO_UPDATE_CHECK") != ""
}

// fetchLatestNativeVersion returns the published version string, or "" on
// any failure (offline, slow, malformed — silence, never noise).
// The URL is a parameter so tests can point it at a local server.
func fetchLatestNativeVersion(url string) string {
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ""
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 64))
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(body))
}

// isNewerVersion reports whether latest > current. Both are dotted numeric
// strings, possibly with a prerelease tail ("1.1.0-native.2"): split on dots
// and dashes, compare numerically field by field, missing fields are zero.
func isNewerVersion(current, latest string) bool {
	return compareVersionStrings(current, latest) < 0
}

func compareVersionStrings(a, b string) int {
	pa := versionFields(a)
	pb := versionFields(b)
	n := len(pa)
	if len(pb) > n {
		n = len(pb)
	}
	for i := 0; i < n; i++ {
		var da, db int
		if i < len(pa) {
			da = pa[i]
		}
		if i < len(pb) {
			db = pb[i]
		}
		if da != db {
			if da < db {
				return -1
			}
			return 1
		}
	}
	return 0
}

func versionFields(v string) []int {
	parts := strings.FieldsFunc(v, func(r rune) bool { return r == '.' || r == '-' })
	out := make([]int, 0, len(parts))
	for _, p := range parts {
		n, err := strconv.Atoi(p)
		if err != nil {
			n = 0
		}
		out = append(out, n)
	}
	return out
}

// checkForUpdate runs the lookup and returns a footer line ("" = nothing to
// say). Called by the report flows only, after the local work is done, so an
// unreachable network can never slow down or break the actual check.
func checkForUpdate() string {
	latest := fetchLatestNativeVersion(latestVersionURL)
	if latest == "" || latest == version {
		return ""
	}
	if !isNewerVersion(version, latest) {
		return "" // running ahead of the published file (dev build)
	}
	return fmt.Sprintf("📦 Update available: %s (this report was made by %s) — rugsnare.com", latest, version)
}
