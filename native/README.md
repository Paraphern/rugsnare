# RugSnare native launcher (Go)

A single-binary version of RugSnare **Skills Security** for people who do not
live in a terminal: no Node.js, no npm, no installation. Download, double-click,
get a report in your browser.

```
7.3 MB  windows-amd64 .exe
6.7 MB  macos-arm64
7.2 MB  macos-amd64
7.1 MB  linux-amd64
```

(Size is stdlib-only; the bulk is `net/http` + `crypto/tls` used for one
thing: the self-update check below.)

## What it does

The same three things as `rugsnare skills` in the npm CLI, plus one:

| command | behavior |
|---|---|
| `rugsnare-skills scan` | discover and pin all skill files (SHA-256 baseline) |
| `rugsnare-skills diff` | compare files against the baseline, exit 1 on findings |
| `rugsnare-skills report` | diff + self-contained HTML report, opens in browser |
| `rugsnare-skills check` *(default, or double-click)* | scan if there is no baseline yet, then diff + report |
| `rugsnare-skills install-schedule` | check automatically at logon and daily (no admin, no resident process) |
| `rugsnare-skills remove-schedule` | remove the automatic checks |

The first run (and every report) also runs a **cold-start audit**: each
skill's content is scanned by the advisory engine, and pre-existing risk
patterns show in an "Already on your machine" section — because pinning
alone would silently bless a skill that was poisoned before this tool
existed. Scheduled checks run `-quiet`: no output and no browser when
everything matches, the report opens only when something changed.

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

## Update check (no telemetry, both directions)

A downloaded binary never changes on disk — but it also never learns anything,
so before writing a report it fetches one static text file:

```
GET https://rugsnare.com/latest-native.txt     # plain version string, nothing else
```

Nothing is sent (no identifiers, no payload, no counting). If the file names a
newer version, the report footer and console say so; on any failure (offline,
404, slow) it stays silent. Opt out with `-no-update-check` or
`RUGSNARE_NO_UPDATE_CHECK=1`. Bump `site/latest-native.txt` when publishing a
new build.

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

## Windows icon

`rsrc_windows_amd64.syso` (committed) embeds the RugSnare icon into the
Windows exe — Go links any `*_windows_amd64.syso` automatically, no flags
needed. The binary itself stays stdlib-only; the tool below is build-time
only.

Regenerate after changing the icon:

```bash
# 1. sized PNGs from site/assets/icon-512.png (any resizer; System.Drawing works)
# 2. assemble multi-size .ico (16/32/48/256, PNG entries)
node make-ico.mjs
# 3. embed into a fresh .syso (build-time tool, pinned: github.com/akavel/rsrc@v0.10.2)
rsrc -arch amd64 -ico app.ico -o rsrc_windows_amd64.syso
```

No VERSIONINFO resource: goversioninfo's output is rejected by the Go 1.27
linker ("unknown relocation type 7"); the running version is printed by
`rugsnare-skills version` instead. macOS/Linux binaries carry no icon —
only .app bundles / .desktop files do, and we ship bare binaries.

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
