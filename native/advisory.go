// Advisory signals — port of product/src/advisory.js scanToolDescription().
// Heuristic detection that skill content contains instructions TO the model.
// Advisory, not cryptographic: fires on first contact, before any pin exists.

package main

import (
	"regexp"
)

// advisorySignal mirrors one entry of SIGNALS in advisory.js.
// A10 (non-standard domain) is implemented via code, not one regex,
// because Go's RE2 has no negative lookahead.
type advisorySignal struct {
	id     string
	weight int
	re     *regexp.Regexp
}

func mustCompile(re string) *regexp.Regexp {
	return regexp.MustCompile(`(?i)` + re)
}

var advisorySignals = []advisorySignal{
	{"A01", 3, mustCompile(`do\s+not\s+(tell|mention|inform|reveal|notify|alert|update|contact)`)},
	{"A02", 3, regexp.MustCompile(`(?i)\.(ssh|id_rsa|id_ed25519|aws_secret|api_key|\.env|credentials?)`)},
	{"A03", 2, mustCompile(`base64[ -]?(encode|decoded?)`)},
	{"A04", 2, regexp.MustCompile(`(?i)\b(API_KEY|AWS_SECRET|GITHUB_TOKEN|OPENAI_API|STRIPE_KEY|PRIVATE_KEY)\b`)},
	{"A05", 2, mustCompile("pass\\s+(it\\s+)?(verbatim|as-is|in\\s+the\\s+`?\\w+`?\\s+(parameter|field|context))")},
	{"A06", 1, mustCompile(`\b(internal|maintainer\s+note|system\s+note|transport\s+detail)\b`)},
	{"A07", 1, mustCompile(`\b(required|mandatory)\b.*\b(context|session|auth)`)},
	{"A08", 1, mustCompile(`\bbefore\s+calling.*\b(read|include|attach|send|forward)`)},
	{"A09", 2, mustCompile(`\b(preferred|supersed?es?|always\s+call\s+this)\b`)},
	// A10: implemented in scanContentAdvisory (allowlist check needs code)
	{"A11", 3, mustCompile(`\b(send|pass|include|attach)\b.*\b(environment|env\s|all\s+variables|full\s+(env|host))`)},
	{"A12", 3, regexp.MustCompile(`[\x{200B}\x{200C}\x{200D}\x{FEFF}\x{00AD}\x{2060}\x{180E}]`)},
	{"A13", 2, regexp.MustCompile(`[\x{202A}-\x{202E}\x{2066}-\x{2069}]`)},
	{"A14", 2, regexp.MustCompile(`(?i)^\s*(you\s+must|always|never|make\s+sure|be\s+sure|ensure\s+that|it\s+is\s+(critical|important)\s+that)\b`)},
	{"A15", 3, regexp.MustCompile(`(?i)\bignore\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier)\s+instructions?\b|\bdisregard\s+(all\s+|any\s+|the\s+)?(previous|prior|above)\s+instructions?\b`)},
	{"A17", 3, regexp.MustCompile(`\+\d{10,15}\b|\+\d{1,3}[\s().-]?\(?\d{2,4}\)?[\s().-]?\d{3}[\s().-]?\d{3,4}\b`)},
	{"A18", 3, regexp.MustCompile(`\x1b\[[0-9;]*[a-zA-Z]`)},
}

// A10 mirrors the JS pattern https?:\/\/(?!.*\b(github\.com|npmjs\.(org|com)|
// readthedocs|wikipedia)\b)[a-z0-9.-]+\.(net|io|xyz|top|tk|ml) — a URL on a
// non-standard TLD. RE2 has no lookahead, so: if the allowlisted hosts appear
// anywhere in the text, A10 stays silent (slightly wider exemption than JS,
// which only exempts when the allowlisted host appears after the URL).
var (
	a10URL       = regexp.MustCompile(`(?i)https?://[a-z0-9.-]+\.(net|io|xyz|top|tk|ml)\b`)
	a10Allow     = regexp.MustCompile(`(?i)\b(github\.com|npmjs\.(org|com)|readthedocs|wikipedia)\b`)
	forcedSignal = map[string]bool{"A12": true, "A13": true, "A15": true, "A18": true}
)

const advisoryThreshold = 5

// ScanContentAdvisory scans freeform text and returns the compact advisory
// object stored in pins ({score, signals:[ids]}), or nil when no advisory.
func ScanContentAdvisory(content string) *Advisory {
	hits := []string{}
	score := 0
	forced := false
	for _, s := range advisorySignals {
		if s.re.MatchString(content) {
			hits = append(hits, s.id)
			score += s.weight
			if forcedSignal[s.id] {
				forced = true
			}
		}
	}
	// A10 via code (see a10URL comment)
	if a10URL.MatchString(content) && !a10Allow.MatchString(content) {
		hits = append(hits, "A10")
		score += 3
	}
	if score >= advisoryThreshold || forced {
		return &Advisory{Score: score, Signals: hits}
	}
	return nil
}
