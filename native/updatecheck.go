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

// isNewerVersion reports whether latest > current, semver-style: a
// prerelease ("1.1.0-native.2") is LOWER than the plain release ("1.1.0"),
// and two prereleases compare field by field (numeric fields numerically).
func isNewerVersion(current, latest string) bool {
	return compareVersionStrings(current, latest) < 0
}

func compareVersionStrings(a, b string) int {
	aCore, aPre := splitPre(a)
	bCore, bPre := splitPre(b)
	pa, pb := numericFields(aCore), numericFields(bCore)
	n := max(len(pa), len(pb))
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
	// cores equal: release beats prerelease
	if len(aPre) == 0 && len(bPre) > 0 {
		return 1
	}
	if len(aPre) > 0 && len(bPre) == 0 {
		return -1
	}
	// both prereleases: field by field
	m := max(len(aPre), len(bPre))
	for i := 0; i < m; i++ {
		var sa, sb string
		if i < len(aPre) {
			sa = aPre[i]
		}
		if i < len(bPre) {
			sb = bPre[i]
		}
		if sa == sb {
			continue
		}
		na, ea := strconv.Atoi(sa)
		nb, eb := strconv.Atoi(sb)
		if ea == nil && eb == nil {
			if na != nb {
				if na < nb {
					return -1
				}
				return 1
			}
			continue
		}
		if sa < sb {
			return -1
		}
		return 1
	}
	return 0
}

// splitPre divides "1.1.0-native.2" into ("1.1.0", ["native","2"]).
func splitPre(v string) (string, []string) {
	dash := strings.IndexByte(v, '-')
	if dash < 0 {
		return v, nil
	}
	return v[:dash], strings.FieldsFunc(v[dash+1:], func(r rune) bool { return r == '.' || r == '-' })
}

func numericFields(v string) []int {
	parts := strings.Split(v, ".")
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
