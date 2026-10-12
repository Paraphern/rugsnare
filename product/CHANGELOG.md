# Changelog

## [1.3.0] - 2026-10-12

Deep schema analysis: recursive traversal, router-union intelligence,
and scanner hardening from field scans of 10+ npm MCP servers.

### Recursive schema analysis (R21, the headline feature)

- **schemaDiff now recurses into `properties`, `items`, `anyOf`/`oneOf` at
  ANY depth**, with the full path in the message. Previously only top-level
  properties were compared; changes at depth 2+ (Netlify `selectSchema.required`,
  MongoDB `$vectorSearch` at depth 5 through `pipeline.items.anyOf`) were
  invisible to direction grading (schemaHash caught them but classified as
  NOTATION). Now correctly graded as BREAKING or LOOSENED.
- **Union branches matched by const discriminator** (operation name) with
  index-based fallback for non-discriminated unions.

### Router-union intelligence (R2, R4, R5)

- **R4: anyOf <-> oneOf detection**: when the union keyword changes but
  branches are identical (MongoDB's SDK wave), graded as a notation-level
  keyword swap - not spurious removed+added branches. When branches differ,
  compared as a merged union across keywords.
- **R2: cross-tool branch movement**: when a union branch (operation)
  disappears from one tool and appears in another - Netlify's
  `initialize-database` moving from updater to reader - both tools'
  findings are annotated with `moved branch 'X' from tool A to tool B`.
- **R5: nested required** - covered by R21's recursion (Netlify's
  `selectSchema.required` losing `params` now grades LOOSENED).

### Skills coverage and integrations

- **R25: canonical `skills/` directory** - `skills scan` now discovers
  `skills/<name>/SKILL.md` at the repo root, the layout of the most
  popular skills repos on GitHub (297k+ stars). Previously only
  platform-specific directories (.claude/skills, .cursor/rules, etc.) were
  scanned; repos using the canonical layout were invisible.
- **R26: advisory-layer parity** - `rugsnare scan`'s skill advisory scan
  now uses the SAME location table as the pin layer (`SKILL_LOCATIONS`),
  covering all 16 platforms in project and user scope. Before R26 the
  advisory layer had its own hand-copied list of 3 platforms, so R25's
  canonical `skills/` dir was pinned but never advisory-scanned; two
  lists always drift, so now there is one. The native launcher's Go copy
  of the table gained the R25 entry in the same pass.
- **R27: the `.agents/skills` standard** (user + project scope) - Zed
  (91.6k+ stars) reads `~/.agents/skills` with five open skill bugs about
  it; superpowers ships `.agents/` at repo root; the native launcher's
  copy of the location table is updated too.
- **ATR cross-references** - every advisory signal (A01-A18) and SARIF rule
  (RS001-RS004) now carries the ID of the [Agent Threat Rules](https://github.com/Agent-Threat-Rule/agent-threat-rules)
  rule covering the same technique (zero-width Unicode -> `ATR-2026-00129`,
  contract drift -> `ATR-2026-00581`, ...). Shown inline in CLI output, as an
  `atr` array in `--json`, and in `properties.atrRuleIds` in SARIF, so
  pre-invocation and runtime findings correlate in one pipeline. Full table:
  `docs/ATR-MAPPING.md` (three gap-proposals filed upstream for review).

## [1.2.0] - 2026-10-11

Four rounds of drift-gradation improvements from the KyttoMCP dialogue
(P3-P6, all from [@heyitsjakub](https://github.com/heyitsjakub)'s feedback), plus scanner robustness.

### Drift gradation (P3-P6: BREAKING / LOOSENED / EXPANDED / NOTATION)

- **Direction-aware grading** (P3+P4): schema drift now grades by direction.
  BREAKING = tighten (new required params, narrowed types, added constraints -
  agent must send more, new data channels are exfil-risk). LOOSENED = loosen
  (constraints dropped, types widened, parameters removed - validation
  weakened, still exit 1 but a distinct failure mode). NOTATION = semantically
  empty (dialect switch only). Mixed tighten+loosen = BREAKING (conservative).
  Validated on chrome-devtools-mcp 1.8.0-1.10.1: 30 former BREAKING findings
  now read 30 NOTATION + 0 BREAKING (the MCP SDK v2 migration wave was pure
  notation).
- **EXPANDED direction** (P5): a new *optional* parameter labels EXPANDED
  instead of riding under tighten - backwards-compatible for callers but
  attack surface widened (a new `context` param is a classic exfil vector).
  Same exit 1, same severity slot as BREAKING; the label just stops
  semver-literate reviewers from reading "breaking" on a non-breaking change.
- **Guard-parameter warnings** (P5+P6): when a schema removes, defangs, or
  flips the default of a guard parameter (dry_run, confirm, force,
  safe_mode...), the diff adds a context-specific warning. Conditional on
  additionalProperties (AP:false = loud failure, no silent-ignore warning).
- **Constraint keys** (R3, from MongoDB field scans): schemaDiff now detects
  minItems, maxItems, minimum, maximum, minLength, maxLength, pattern,
  multipleOf, uniqueItems, exclusiveMinimum/Maximum, and number-integer
  transitions. Previously invisible (NOTATION on real constraint changes).
- **Default value tracking** (P6): schemaDiff compares default values for
  all parameters (previously invisible - schemaHash changed but schemaDiff
  returned [], grade=NOTATION).

### Scanner robustness

- **Publish-time version ordering** (R10, playwright bug): history now
  sorts versions by npm publish timestamp, not semver. Packages with two
  versioning epochs (1.52.0-alpha from 2025 semver-older than 0.0.x from
  2026) no longer produce phantom cross-epoch pairs.
- **Rename inference** (R11, azure-devops flagship): GONE+NEW tool pairs
  with identical schema+prose hashes collapse into `RENAMED a -> b` -
  the azure case goes from 104 scattered lines to readable
  "renamed: N, really-gone: M, new: K".
- **Kill-switch classification** (R12, bybit case): unreachable versions
  now carry a cause (KILLSWITCH / GATED / GIT_DEPS / CRASH / TIMEOUT)
  based on stderr pattern matching - a remote kill-switch is visible as
  a systematic finding, not a generic "exited early".
- **`--server-args` flag for `rugsnare history`**: per-package launch
  arguments (e.g. LaunchDarkly needs `start --transport stdio`). Passed
  as a fixed array after the entry point - no shell, no interpolation.
- **`--stub-env` flag for `rugsnare history`**: injects presence-only dummy
  values for common credential env vars - servers that only check key
  presence at boot now enumerate their tools/list.
- **Version stamp in output**: `rugsnare diff` and `rugsnare history` print
  the running rugsnare version in the footer (prevents stale-binary
  debugging sessions when comparing outputs).
- **Pins-version mismatch warning** (R1/R9): `rugsnare scan` records the
  package version it scanned against; `rugsnare diff` warns when the pins
  were taken against a different version than what's currently installed
  ("if you just upgraded: re-scan first").
- **openai-mcp added to --chameleon rotation** (R6): Netlify officially
  serves 21 granular tools to openai-mcp vs 9 routers to other clients.

### Corpus and docs

- **Corpus 05: key-reorder fixture** (`corpus/05-key-reorder/`): two
  servers with semantically identical schemas in different key order;
  rugsnare diff reports clean (canonicalization proof). Requested by
  [@heyitsjakub](https://github.com/heyitsjakub) as a fixture for KyttoMCP#12.
- Open **Pin Format specification** drafted at `docs/PIN-SPEC.md` (internal;
  publication gated on ecosystem timing).
- Em-dash cleanup: all long dashes replaced with short hyphens across
  source files and documentation (575 replacements).

## [1.1.0] - 2026-10-07

- **Whole-history scanning** (new): `rugsnare history <package> [--last N]
  [--from X --to Y]` - downloads every published version from the registry
  (tarballs pulled directly, deps installed with --ignore-scripts and
  --legacy-peer-deps), actually runs each version, takes tools/list, and
  diffs consecutive versions with the same split-hash logic. Prints
  was/became per drifted tool; exit 1 on silent changes, exit 2 when no
  version could be started. On the web: the
  Runtime scan button runs the same CLI in an ephemeral GitHub Actions
  sandbox and publishes the result with a link to the public run log as
  evidence; every scan lands in the public archive at rugsnare.com/scans
  (the instant static scan was retired - runtime truth only).

- **Skills Security** (new): `rugsnare skills scan|diff|report` - pin, diff, and
  visually report on AI agent skill files (SKILL.md, .mdc, etc.) across Claude
  Code, Cursor, Windsurf, Continue, ZCode, Copilot, Codex, and Cline.
  Severity classification (DANGEROUS/REVIEW/SAFE) based on content analysis
  of changed lines. HTML report with plain-language was/became diffs and
  actionable recommendations - designed for non-technical users.
- **Native launcher** (new): a single Go binary (`native/`) with the whole
  skills-security half - no Node.js, no npm, double-click and get the HTML
  report in your browser. Reads/writes the same `.rugsnare/pins.json`
  `skills` subtree as this CLI (verified interop both directions); the
  `servers` subtree passes through untouched. Windows/macOS/Linux, ~7 MB.
- **No silent updates, applied to ourselves**: `rugsnare version` prints the
  running version; `rugsnare doctor --check-update` compares it against the
  npm registry (opt-in, one GET, nothing sent) and links the changelog -
  plain `doctor` stays fully offline. CI examples now pin the version - an
  unpinned `npx rugsnare` floats to latest on every launch, the exact vector
  our own floating-version check flags in MCP configs. The native launcher
  checks `rugsnare.com/latest-native.txt` before writing a report
  (opt-out: `-no-update-check`).
- **Undeclared tool detection** (new): the live proxy catches tools called by
  the agent that were never listed in tools/list (progressive-discovery servers).
  Blocked in enforce, one-time advisory in observe.
- `rugsnare diff` now prints the human-readable WAS/NOW description text for
  description drift (COSMETIC and ANNOTATION) instead of bare hashes - you see
  the exact sentence the agent used to read and the one it reads now.
- **Scheduled checks** (new, native launcher): `rugsnare-skills
  install-schedule` registers a logon check (Startup folder) and a daily
  check (Task Scheduler), no admin rights, no resident process - the binary
  runs and exits. Quiet mode (`-quiet`) stays silent when everything
  matches and opens the report only when something changed.
- **Cold-start audit** (new, both CLIs): pinning is trust-on-first-use - it
  would bless a skill poisoned before RugSnare was installed. Every skill
  file's content is now scanned by the advisory engine (A01-A18) at scan
  and report time; pre-existing risks render as a separate "Already on
  your machine" section that explicitly says these are not update drift.
- Security fixes (review 28): P0 canary leak via HTTP, P1 error scrubbing,
  committed verification key for CI, loud policies degradation, P2 guards.
- Review 32 fixes: P0 `os` not imported - every `rugsnare skills` command
  crashed for real users without `RUGSNARE_TEST_HOME` set (tests masked it);
  file-pattern skill locations (`.github/copilot-instructions.md`,
  `CONVENTIONS.md`) were never discovered (readdir on a file → ENOTDIR);
  pure-deletion drift is now REVIEW, not SAFE (silently removed safety
  language must never read as safe); bare "token" no longer trips the
  credential pattern ("count the tokens" is LLM prose); compareVersions
  follows semver prerelease ordering (`1.1.0-native.2` < `1.1.0`).

## [1.0.1] - 2026-10-04

- Fix: `DEFAULT_CONTRACTS.base` now defaults to the Base Mainnet ReleaseLog
  contract - `rugsnare verify --chain base` works out of the box. (In 1.0.0
  the published npm tarball was built one commit before the contract address
  was patched in; the tag pointed to the patched tree, creating an npm ↔
  Docker mismatch. 1.0.1 is the clean release from the correct commit.)

## [1.0.0] - 2026-10-04

Everything since 0.5.1, released together. The version number is a stability
commitment - see the contract at the bottom of this entry.

### Transport parity (0.6)
- stdio and HTTP (Streamable HTTP) are now first-class equals: `scan` / `diff`
  / `approve` / `unpin` / `run` / `wrap` / `canary record+replay` / call
  policies / loop detector / result inspection / chameleon check all work
  over both transports.
- Pre-install recon: `scan|diff|approve --server <name> --url <https://…>`
  checks a remote server BEFORE it enters any config (`--header` passthrough,
  http/https schemes only).
- HTTP `wrap`: the config entry is re-pointed at a local proxy (`--port`,
  chosen at wrap time); the original URL + auth live in the wrap marker;
  `run` reads auth from there.
- `doctor` - self-diagnosis: discovered configs, pin health, pins never
  reviewed, policy validity, receipts chain, pins signature.
- `config get/set/list` with validation; `events count|trim --keep-last N`
  (atomic, receipts untouched); `unpin` (drop a departed server's pins).
- SARIF carries prompt/resource drift too (was silently tool-only).
- Chameleon check over five client identities (claude-desktop, cursor,
  windsurf, zed, continue) and over HTTP, where per-client serving is
  trivially easy.

### AI Security Audit (0.7)
- `rugsnare audit --input <file-or-dir> [--json] [--airgap]` - zero-knowledge
  scan of AI chat exports and local files for leaked secrets: API keys
  (9 providers), private key blocks, Luhn-valid payment cards, BIP-39 seed
  phrases (embedded 2048-word list, cross-verified against two independent
  sources), DB URLs with credentials, internal infrastructure, contact PII,
  `.env`-style credential lines.
- Redacted by construction (first 4 chars + length); nothing written to
  disk; `--airgap` leaves no trace at all; exit 1 on HIGH findings -
  use it as a pre-share gate.

### Secret vault (0.7)
- `rugsnare vault set/get/list/rm` - the model writes `{{VAULT:NAME}}`
  placeholders; the live proxies (stdio + HTTP) inject real values on the
  way to the server and scrub them from results on the way back. Logging,
  canary traces, and policies all operate on the placeholder form; event
  entries carry names, never values.

### Call budgets + kill-switch (0.8)
- `policies.json`: `budgets: { tool: maxCallsPerSession }` (observe: one-time
  advisory past the cap; enforce: blocked) and `disabled: [tools]` - a
  kill-switched tool never runs in any mode and is hidden from the enforce
  contract. Same enforcement in both proxies.

### Signed pins (0.9)
- `scan`/`approve`/`unpin` sign `.rugsnare/pins.json` (Ed25519 over the exact
  bytes, key from `receipts`) into `pins.sig`. `diff` refuses tampered pins
  ALWAYS (exit 2), and unsigned pins when a signing key exists
  (`--allow-unsigned-pins` to bootstrap). Closes the CI-attacker threat
  (first external audit, finding #2).

### Fixes since 0.5.1
- `scan --chameleon` silently did nothing for every transport (ReferenceError
  swallowed per-client); `approve` could not handle HTTP servers and never
  re-pinned prompts/resources; the HTTP proxy kept pins in memory (lost on
  restart) and did not enforce policies; SARIF dropped prompt/resource
  drift; `collectServers` lost HTTP URLs in the pins fallback;
  `report --live` crashed on HTTP-pinned servers; diff spawned every server
  twice; broken `loadPolicies` export; stale hardcoded version in
  `rugsnare mcp`.
- Content: Reddit post sums now add to the published 140; the posted X-thread
  numbers carry a correction banner; READMEs state test counts that match CI.

### Stability contract (why 1.0)
Frozen unless a major version bump says otherwise:
- Exit codes: `0` clean, `1` drift, `2` config/integrity error (incl.
  tampered/unsigned pins), `3` infrastructure error.
- `.rugsnare/pins.json` schema `version: 1` - future changes are additive
  fields only; old pins remain readable by newer rugsnare.
- Advisory signal IDs (`A01…`, `R01…`, `AUD01…`) are stable identifiers;
  wording may evolve, IDs never get reused for different meanings.
- `{{VAULT:NAME}}` placeholder syntax; `pins.sig` envelope format.
- Zero npm dependencies, no telemetry, local files only - the trust posture
  is part of the API.

## [0.5.1] - 2026-10-03
- rpc-http hardening: settle-guards on abort/timeout/5MB (no more silent
  false-negatives), SSE correlation by request id, MCP-Protocol-Version
  header. Backtest harness exit-code based; 66/66 pair coverage; report
  updated to 140 findings on 66 pairs. CRLF normalization (.gitattributes).

## [0.5.0] - 2026-10-02
- HTTP transport for scan/diff (Streamable HTTP, SSE, auth passthrough),
  wrap/unwrap, SKILL.md scanning, human-readable schema diffs in pins,
  floating-version advisory, MCP Registry entry, Docker Hub image.

## [0.4.x] - 2026-10-01
- Canary record/replay (read-only default, deterministic verdicts), Ed25519
  signed receipts (hash-chain + auditor dossier), loop detector, chameleon
  check, advisory signals extended (imperative openers, instruction-hijack
  phrases, exfil-carrier params, phone numbers, ANSI escapes), dangerous-shell
  default policy, `rugsnare mcp` read-only MCP server.

## [0.3.x] - 2026-09-30
- Split hash (BREAKING vs COSMETIC, `--schema-only`/`--prose-only`), call
  policies + PII egress checks, `--timeout`, exit code 3, fail-closed mode,
  debounced summary alerts, PR-diff Action, drift-feed.

## [0.2.x] - 2026-09-30
- Full-contract pinning (name+description+inputSchema), live stdio proxy
  (observe/enforce quarantine), shadow detection, prompts/resources pinning,
  SARIF output, fleet report, pre-commit hook, 9 AI client configs discovered.

## [0.1.0] - 2026-09-29
- Hash pinning CI gate (`init/scan/diff/approve`), on-chain release
  verification (Base Sepolia ReleaseLog), attack corpus.
