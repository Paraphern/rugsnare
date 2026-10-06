// Tests for the self-update check (updatecheck.go) — the native launcher's
// half of the "no silent updates" promise.

package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestIsNewerVersion(t *testing.T) {
	cases := []struct {
		current, latest string
		want            bool
	}{
		{"1.1.0-native.1", "1.1.0-native.2", true},
		{"1.1.0-native.2", "1.1.0-native.2", false},
		{"1.1.0-native.3", "1.1.0-native.2", false}, // running ahead: not newer
		{"1.0.9", "1.1.0", true},
		{"1.1.0", "1.0.9", false},
		{"1.1.0", "1.1.0", false},
		{"1.1", "1.1.0", false}, // missing fields pad to zero
		{"2.0.0-native.1", "2.0.0-native.2", true},
	}
	for _, c := range cases {
		if got := isNewerVersion(c.current, c.latest); got != c.want {
			t.Errorf("isNewerVersion(%q, %q) = %v, want %v", c.current, c.latest, got, c.want)
		}
	}
}

func TestUpdateNoticeRendering(t *testing.T) {
	if updateNotice("") != "" {
		t.Fatal("empty line renders nothing")
	}
	line := "Update available: 1.1.0-native.9 (this report was made by 1.1.0-native.2) - rugsnare.com"
	html := updateNotice(line)
	if !strings.Contains(html, "Update available") || !strings.Contains(html, "rugsnare.com") {
		t.Fatalf("notice missing content: %s", html)
	}
	// and it lands in the report footer when passed through GenerateReport
	results := []DiffResult{{Key: "k", Status: "UNCHANGED", Changes: &Changes{}}}
	body, _ := GenerateReport(results, nowUTC(), line)
	if !strings.Contains(body, "Update available: 1.1.0-native.9") {
		t.Fatal("GenerateReport must embed the update notice")
	}
	// clean report without a notice must not mention updates
	bodyClean, _ := GenerateReport(results, nowUTC(), "")
	if strings.Contains(bodyClean, "Update available") {
		t.Fatal("no notice must render when none given")
	}
}

func TestUpdateCheckDisabled(t *testing.T) {
	if !updateCheckDisabled(true) {
		t.Fatal("flag must disable")
	}
	t.Setenv("RUGSNARE_NO_UPDATE_CHECK", "1")
	if !updateCheckDisabled(false) {
		t.Fatal("env var must disable")
	}
}

func TestFetchLatestNativeVersionAgainstServer(t *testing.T) {
	// serves the version file like the site does
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "9.9.9-native.1\n")
	}))
	defer srv.Close()
	if got := fetchLatestNativeVersion(srv.URL); got != "9.9.9-native.1" {
		t.Fatalf("got %q", got)
	}

	// 404 -> silence
	srv404 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(404)
	}))
	defer srv404.Close()
	if got := fetchLatestNativeVersion(srv404.URL); got != "" {
		t.Fatalf("404 must yield empty, got %q", got)
	}

	// unreachable -> silence, fast
	if got := fetchLatestNativeVersion("http://127.0.0.1:1/none"); got != "" {
		t.Fatalf("unreachable must yield empty, got %q", got)
	}
}
