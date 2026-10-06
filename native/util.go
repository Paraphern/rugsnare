// Small shared helpers.

package main

import (
	"os/exec"
	"regexp"
	"runtime"
)

var regexCache = map[string]*regexp.Regexp{}

// regexpContains compiles-once-then-caches (report helpers hit the same
// patterns once per line; caching keeps report generation allocation-light).
func regexpContains(s, pattern string) bool {
	re, ok := regexCache[pattern]
	if !ok {
		re = regexp.MustCompile(pattern)
		regexCache[pattern] = re
	}
	return re.MatchString(s)
}

// openBrowser opens path (file://) in the default browser, best-effort.
func openBrowser(path string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		// rundll32 FileProtocolHandler: no shell, no quoting hazards
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", path)
	case "darwin":
		cmd = exec.Command("open", path)
	default:
		cmd = exec.Command("xdg-open", path)
	}
	return cmd.Start()
}
