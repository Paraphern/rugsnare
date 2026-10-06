# RugSnare native launcher (Go)

A single-binary version of RugSnare **Skills Security** for people who do not
live in a terminal: no Node.js, no npm, no installation. Download, double-click,
get a report in your browser.

```
3.5 MB  windows-amd64 .exe
3.2 MB  macos-arm64
3.4 MB  macos-amd64
3.4 MB  linux-amd64
```

## What it does

The same three things as `rugsnare skills` in the npm CLI, plus one:

| command | behavior |
|---|---|
| `rugsnare-skills scan` | discover and pin all skill files (SHA-256 baseline) |
| `rugsnare-skills diff` | compare files against the baseline, exit 1 on findings |
| `rugsnare-skills report` | diff + self-contained HTML report, opens in browser |
| `rugsnare-skills check` *(default, or double-click)* | scan if there is no baseline yet, then diff + report |

Covers the same 14 platforms as the npm CLI: Claude Code, Cursor, Windsurf,
Continue, Cline, ZCode, Copilot, Codex, Amp, Kiro, OpenCode, Antigravity,
Aider, Devin. Same discovery rules (text files, <=1MB, depth 4, noise dirs
skipped), same severity classification (DANGEROUS / REVIEW / SAFE), same
plain-language HTML report.

## Wire compatibility

Reads and writes the same `.rugsnare/pins.json` `skills` subtree as the npm
CLI. The two are interchangeable on the same machine:

- pin with `npx rugsnare skills scan`, check with the native binary (or vice versa)
- the `servers` subtree (MCP pins) is passed through byte-identical; this
  binary never touches anything outside the `skills` key

One nuance: pin keys use native path separators (backslash on Windows),
exactly like the npm CLI - do not "normalize" them, the keys must match.

## Building

Requires Go >= 1.27 (any recent Go works; no third-party dependencies -
stdlib only, same philosophy as the npm package):

```bash
cd native
go test ./...
go build -trimpath -ldflags "-s -w" -o rugsnare-skills .
```

Cross-compile everything:

```bash
mkdir -p bin
GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o bin/rugsnare-skills-windows-amd64.exe .
GOOS=darwin  GOARCH=arm64 go build -trimpath -ldflags "-s -w" -o bin/rugsnare-skills-macos-arm64 .
GOOS=darwin  GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o bin/rugsnare-skills-macos-amd64 .
GOOS=linux   GOARCH=amd64 go build -trimpath -ldflags "-s -w" -o bin/rugsnare-skills-linux-amd64 .
```

## Layout

| file | contents |
|---|---|
| `skills.go` | platform locations, discovery walk, SHA-256 pinning |
| `pinsfile.go` | pins.json load/save preserving foreign subtrees |
| `diff.go` | line diff, severity patterns, drift results |
| `advisory.go` | content advisory signals (A01-A18 port) |
| `report.go` | self-contained HTML report |
| `util.go` | regex cache, browser opener |
| `main.go` | CLI (scan/diff/report/check) |
| `skills_test.go` | tests mirroring `product/test/skills-pin.test.js` |

## Known deltas vs the npm CLI (deliberate)

- No MCP half: the binary does not spawn servers or speak JSON-RPC. MCP
  drift detection stays in the npm CLI (and the report's MCP section is
  npm-CLI-only as well).
- The external-URL danger rule is evaluated per line instead of via a regex
  lookahead (Go's RE2 has no lookahead); same allowlist, same intent.
- Report cards are ordered severity-first then by key; the JS version keeps
  insertion order within a severity group.
