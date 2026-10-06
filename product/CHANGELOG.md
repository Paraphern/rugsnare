# Changelog

## [1.1.0] — 2026-10-06

- **Skills Security** (new): `rugsnare skills scan|diff|report` — pin, diff, and
  visually report on AI agent skill files (SKILL.md, .mdc, etc.) across Claude
  Code, Cursor, Windsurf, Continue, ZCode, Copilot, Codex, and Cline.
  Severity classification (DANGEROUS/REVIEW/SAFE) based on content analysis
  of changed lines. HTML report with plain-language was/became diffs and
  actionable recommendations - designed for non-technical users.
- **Undeclared tool detection** (new): the live proxy catches tools called by
  the agent that were never listed in tools/list (progressive-discovery servers).
  Blocked in enforce, one-time advisory in observe.
- Security fixes (review 28): P0 canary leak via HTTP, P1 error scrubbing,
  committed verification key for CI, loud policies degradation, P2 guards.

## [1.0.1] — 2026-10-04

- Fix: `DEFAULT_CONTRACTS.base` now defaults to the Base Mainnet ReleaseLog
  contract — `rugsnare verify --chain base` works out of the box. (In 1.0.0
  the published npm tarball was built one commit before the contract address
  was patched in; the tag pointed to the patched tree, creating an npm ↔
  Docker mismatch. 1.0.1 is the clean release from the correct commit.)

## [1.0.0] — 2026-10-04

Everything since 0.5.1, released together. The version number is a stability
commitment — see the contract at the bottom of this entry.

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
- `doctor` — self-diagnosis: discovered configs, pin health, pins never
  reviewed, policy validity, receipts chain, pins signature.
- `config get/set/list` with validation; `events count|trim --keep-last N`
  (atomic, receipts untouched); `unpin` (drop a departed server's pins).
- SARIF carries prompt/resource drift too (was silently tool-only).
- Chameleon check over five client identities (claude-desktop, cursor,
  windsurf, zed, continue) and over HTTP, where per-client serving is
  trivially easy.

### AI Security Audit (0.7)
- `rugsnare audit --input <file-or-dir> [--json] [--airgap]` — zero-knowledge
  scan of AI chat exports and local files for leaked secrets: API keys
  (9 providers), private key blocks, Luhn-valid payment cards, BIP-39 seed
  phrases (embedded 2048-word list, cross-verified against two independent
  sources), DB URLs with credentials, internal infrastructure, contact PII,
  `.env`-style credential lines.
- Redacted by construction (first 4 chars + length); nothing written to
  disk; `--airgap` leaves no trace at all; exit 1 on HIGH findings —
  use it as a pre-share gate.

### Secret vault (0.7)
- `rugsnare vault set/get/list/rm` — the model writes `{{VAULT:NAME}}`
  placeholders; the live proxies (stdio + HTTP) inject real values on the
  way to the server and scrub them from results on the way back. Logging,
  canary traces, and policies all operate on the placeholder form; event
  entries carry names, never values.

### Call budgets + kill-switch (0.8)
- `policies.json`: `budgets: { tool: maxCallsPerSession }` (observe: one-time
  advisory past the cap; enforce: blocked) and `disabled: [tools]` — a
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
- `.rugsnare/pins.json` schema `version: 1` — future changes are additive
  fields only; old pins remain readable by newer rugsnare.
- Advisory signal IDs (`A01…`, `R01…`, `AUD01…`) are stable identifiers;
  wording may evolve, IDs never get reused for different meanings.
- `{{VAULT:NAME}}` placeholder syntax; `pins.sig` envelope format.
- Zero npm dependencies, no telemetry, local files only — the trust posture
  is part of the API.

## [0.5.1] — 2026-10-03
- rpc-http hardening: settle-guards on abort/timeout/5MB (no more silent
  false-negatives), SSE correlation by request id, MCP-Protocol-Version
  header. Backtest harness exit-code based; 66/66 pair coverage; report
  updated to 140 findings on 66 pairs. CRLF normalization (.gitattributes).

## [0.5.0] — 2026-10-02
- HTTP transport for scan/diff (Streamable HTTP, SSE, auth passthrough),
  wrap/unwrap, SKILL.md scanning, human-readable schema diffs in pins,
  floating-version advisory, MCP Registry entry, Docker Hub image.

## [0.4.x] — 2026-10-01
- Canary record/replay (read-only default, deterministic verdicts), Ed25519
  signed receipts (hash-chain + auditor dossier), loop detector, chameleon
  check, advisory signals extended (imperative openers, instruction-hijack
  phrases, exfil-carrier params, phone numbers, ANSI escapes), dangerous-shell
  default policy, `rugsnare mcp` read-only MCP server.

## [0.3.x] — 2026-09-30
- Split hash (BREAKING vs COSMETIC, `--schema-only`/`--prose-only`), call
  policies + PII egress checks, `--timeout`, exit code 3, fail-closed mode,
  debounced summary alerts, PR-diff Action, drift-feed.

## [0.2.x] — 2026-09-30
- Full-contract pinning (name+description+inputSchema), live stdio proxy
  (observe/enforce quarantine), shadow detection, prompts/resources pinning,
  SARIF output, fleet report, pre-commit hook, 9 AI client configs discovered.

## [0.1.0] — 2026-09-29
- Hash pinning CI gate (`init/scan/diff/approve`), on-chain release
  verification (Base Sepolia ReleaseLog), attack corpus.
