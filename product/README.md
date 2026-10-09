# rugsnare

[![npm version](https://img.shields.io/npm/v/rugsnare.svg)](https://www.npmjs.com/package/rugsnare)
[![Glama rating](https://glama.ai/mcp/servers/Paraphern/rugsnare/badges/score.svg)](https://glama.ai/mcp/servers/Paraphern/rugsnare)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Runtime integrity for MCP tool contracts.** Scanners check MCP servers *before* you install them. RugSnare checks what happens *after*: an approved tool whose description or schema silently changed is a rug pull, and it fails your build.

```
flights-search  (node ./server.js)
  [DRIFT] search_flights 8c5ab922df5932ba -> fcc6d291d8ef4ab2  (BREAKING: added required parameter 'mode')
  [NEW ] _search_flights_pro 589ef74a38bb8d07
  [DRIFT] get_booking 189261ab4cc7f0b6 -> 12da36af80ac39e5  (COSMETIC: description edited)
      WAS: Get booking details. Requires confirmation for paid bookings.
      NOW: Get booking details.
rugsnare diff: DRIFT DETECTED (3 finding(s))   # exit 1 — CI fails
```

## Why

MCP tool descriptions are instructions your agent obeys but nobody reads. They can change after you approve them (maintainer update, compromised registry, typosquatted package) — carrying hidden exfiltration orders. This attack class is codified as tool poisoning (OWASP MCP03:2025). Version pinning doesn't help when the version string doesn't change; scanning doesn't help after approval. Hash pinning does.

Our backtest over 66 consecutive version pairs of official `modelcontextprotocol/servers` releases found **140 silent tool-contract changes** — none of which a version bump alone would have flagged for review.

## Install

Zero dependencies. Node >= 18. Nothing leaves your machine.

> **This README documents `main`.** The latest npm release is **1.0.1**; if you installed 1.0.0, upgrade — it shipped without the Base Mainnet contract default (`verify --chain base` needed a manual `--contract`).

```bash
npx rugsnare init                    # scaffold .rugsnare/, show discovered MCP configs
npx rugsnare scan                    # baseline: pin current tool contracts (auto-discovers configs)
npx rugsnare diff                    # live check; exit 1 on drift/new/removed
npx rugsnare approve <server>        # re-pin after human review
npx rugsnare unpin <server>          # drop a departed server's pins (no more SHADOW/REMOVED ghosts)
```

Auto-discovers configs for Claude Code (`~/.claude.json`, `.mcp.json`), Cursor, Windsurf, VS Code, Zed, Cline, and ZCode plugin configs — including HTTP servers (`"url": "..."`). `--config <file>` overrides discovery.

**CI (the point):** commit `.rugsnare/pins.json` to the repo, then:

```yaml
- run: npx --yes rugsnare@1.1.0 diff --config .mcp.json
```

Pin the version in CI. An unpinned `npx rugsnare` floats to the latest release on every launch — the exact rug-pull vector rugsnare's own floating-version check flags in your MCP configs. `rugsnare version` prints what you run; `rugsnare doctor --check-update` compares it against npm and links the changelog (one GET, only when you ask).

Or install the git pre-commit hook locally: `rugsnare hook install`.

Any tool contract that changed since the last human approval fails the build. `--schema-only` fails only on BREAKING (schema) drift; `--prose-only` only on description edits. `--expect-tool <t>` / `--forbid-tool <t>` assert the tool set itself (forbid catches shadow injection).

Docker: `geraldmuddlethwack/rugsnare-mcp` (auto-built from tags).

## What gets hashed

`sha256` over the canonical `{ name, description, inputSchema }` of every tool — so poisoning (description edits) and shadowing (new "session" parameters in the schema) both trip, while cosmetic reordering doesn't.

Each pin also stores a **split hash**: `schemaHash` (classified BREAKING on change) and `proseHash` (COSMETIC), plus the canonical `inputSchema` so drift reports read *"added required parameter 'mode'"* instead of just *"hash changed"*.

Behavioral annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) are compared through their **spec defaults** — a server spelling out a hint it was already relying on is not flagged; silently dropping an explicit `destructiveHint: false` after approval is ANNOTATION drift.

## Scan a package's whole history

Before you adopt an MCP server, check whether it has EVER quietly changed its contracts:

```bash
npx rugsnare history @somebody/mcp-server --last 10
```

Downloads every published version straight from the registry (no lifecycle scripts run), installs production deps with `--ignore-scripts`, actually starts each version like an MCP client would, takes `tools/list`, and diffs consecutive versions with the same split-hash logic as `diff`. The output prints the was/became text for every drifted tool. Exit 1 = silent changes found.

There is also a free web version (static, no code execution) at [rugsnare.com/#history](https://rugsnare.com/#history) — paste a package name, see its drift history. Static means it reads the published files without running them; tools assembled at runtime are invisible to it, so the CLI is the source of truth.

## Three layers

### 1. CI gate — `scan` / `diff` / `approve`

Pin, compare, re-approve. Works over stdio and HTTP (Streamable HTTP, JSON and SSE responses) servers. Auth for remote servers is read from the server's own config entry (`headers`, `auth: { type: "bearer", token: "${MY_TOKEN}" }`, `apiKey`), with `${ENV_VAR}` interpolation — secrets stay in the environment, never in pins.

**Pre-install recon** — check a remote server *before* adding it to any config:

```bash
rugsnare scan --server candidate --url https://remote.example.com/mcp --header "Authorization: Bearer $TOKEN"
rugsnare diff  --server candidate --url https://remote.example.com/mcp   # later: did it change since?
```

`rugsnare doctor` self-diagnoses the whole setup: discovered configs, pin health, pins never reviewed by a human, policy validity, receipts chain integrity.

Settings live in `.rugsnare/config.json` — edit them with validation instead of by hand:

```bash
rugsnare config set mode enforce          # observe | enforce
rugsnare config set failMode closed       # proxy internal errors block instead of forward
rugsnare config set alertWebhook https://hooks.slack.com/services/...   # or "none" to clear
rugsnare config set loopThreshold 5       # identical-call loop advisory (0 disables)
```

The event log is append-only and local; when it grows large, trim it explicitly (signed receipts are a separate hash-chained file and stay intact): `rugsnare events trim --keep-last 5000`.

## AI Security Audit (0.6) — did you leak secrets into a chat?

```bash
rugsnare audit --input ~/downloads/chat-export.json     # a file or a directory
rugsnare audit --input ./notes --airgap                 # leave NO trace, not even a count
```

Scans local files (AI chat exports, notes, `.env`) for leaked secrets: API keys (OpenAI/Anthropic/AWS/GitHub/Google/Slack/Stripe/Telegram/SendGrid), private key blocks, Luhn-valid payment cards, crypto seed phrases (12+ consecutive BIP-39 words — the 2048-word list is embedded, verified against two independent sources), database URLs with credentials, internal infrastructure, contact PII, and `.env`-style credential lines.

Zero-knowledge by design: output is **redacted** (first 4 characters + length — never the full value), nothing is written to disk, and `--airgap` skips even the count-only event entry. Exit 1 when HIGH findings exist, so it doubles as a pre-share gate: run it on an export before you send that export to anyone.

## Secret vault (0.7) — the model never holds the key

```bash
rugsnare vault set STRIPE_KEY sk_live_…     # stored in .rugsnare/vault.json (chmod 600, gitignored)
```

The agent writes `{{VAULT:STRIPE_KEY}}` in tool arguments; the live proxies (stdio and HTTP) substitute the real value on the way **to** the server and scrub every occurrence of the secret from results on the way **back**. Call logging, canary traces, policies, and result inspection all operate on the placeholder form — event entries record the NAME, never the value.

## Budgets, kill-switch, signed pins (0.8 / 0.9)

In `.rugsnare/policies.json`:

```json
{
  "budgets": { "deploy": 3 },
  "disabled": ["format_disk"]
}
```

A runaway agent burns its per-session budget (observe: one advisory past the cap; enforce: blocked with a JSON-RPC error). A `disabled` tool never runs in any mode and is hidden from the enforce contract — the operator kill-switch.

`scan`/`approve`/`unpin` sign `pins.json` (Ed25519 over the exact bytes) into `.rugsnare/pins.sig` and publish the verification key next to it (`.rugsnare/pins.pub.pem`). Commit all three files together: the committed public key is what lets CI verify — runners hold no keys, and the private key never leaves your machine. `diff` then refuses **tampered** pins always (exit 2) — an attacker editing the pin store in your repo/CI gets caught. Unsigned pins with a verification key available fail too (`--allow-unsigned-pins` to bootstrap); `doctor` reports the signature state.

### 2. Live proxy — `run`

Sits between your agent and the server, inspecting every message in both directions.

```bash
# stdio server:
rugsnare run --name github --mode enforce -- npx -y @modelcontextprotocol/server-github
# remote HTTP server:
rugsnare run --name mycloud --url https://remote.example.com/mcp --mode enforce
```

- **observe** (default): log everything, alert on drift, forward traffic untouched.
- **enforce**: drifted or unapproved tools are **quarantined** — replaced in `tools/list` by a `rugsnare_alert` stub telling the agent why. Pins and approvals are shared with the CLI (`diff`, `approve`) across restarts.
- **Result inspection** (advisory-only): every tool response is scanned for injection indicators — instruction overrides, imperative commands, credential references, exfiltration endpoints, "don't tell the user", identity changes, invisible Unicode. Suspect results are logged and flagged, never blocked (the data already arrived; hiding it would be worse).
- **Call policies** (YAML/JSON): allow/deny tools, PII egress checks on arguments, dangerous-shell detection. Enforced identically by the stdio and HTTP proxies — a blocked call is answered locally and never reaches the server.
- **Chameleon check**: `scan --chameleon` re-lists tools as different clients (claude-desktop/cursor); a different contract per client is the strongest tool-poisoning signal there is. Works over stdio **and HTTP** — where per-client serving is trivially easy for a remote server.
- `--fail-closed`: on a proxy internal error, block the message instead of forwarding.
- `rugsnare wrap <server>` inserts the proxy into your MCP config automatically — stdio entries become `npx rugsnare run -- …`; HTTP entries are repointed at a local proxy (wrap picks a free port and prints the exact `run --url … --port …` command to keep running). `unwrap` restores the original either way.

### 3. Evidence — `receipts`, `canary`, on-chain `verify`

- `receipts sign|verify|export` — Ed25519 hash-chain over the local event log; tamper-evident audit trail, auditor dossier export.
- `canary record|replay` — record real tool-call traces, replay them against a new server version before you upgrade (read-only calls by default; write-class only with explicit `--include`/`--all-calls` in a sandbox). Works over stdio **and HTTP** — record through the proxy (`canary record --name X --url …`), replay against the new endpoint (`canary replay --name X` falls back to the pinned URL).
- `rugsnare verify <file> --version <v>` — check a release artifact against the on-chain ReleaseLog pin (Base / Base Sepolia; keccak-256 version key, sha-256 artifact hash).

### RugSnare as an MCP server — `rugsnare mcp`

The same binary runs as a read-only MCP server (`drift_feed_status`, `pins_report`) so your agent can ask whether anything drifted.

## Skills Security (1.1) - did your AI instructions change?

```bash
rugsnare skills scan     # pin all skill files (SKILL.md, .mdc, etc.)
rugsnare skills diff     # exit 1 if anything changed
rugsnare skills report   # visual report in your browser
```

Discovers skill files across Claude Code, Cursor, Windsurf, Continue, ZCode, Copilot, Codex, and Cline. When a skill changes after you approved it, the HTML report shows what was added/removed, classifies severity (DANGEROUS / REVIEW / SAFE), and explains in plain language why it matters.

## Advisory signals (scan-time, non-blocking)

Tool **and prompt** descriptions are scored against 18 signals (A01–A18): instruction-hijack phrasing, imperative openers, exfiltration-carrier parameters, international phone numbers, ANSI escape sequences, and more. `REVIEW` findings tell you what a human should read before approving — they never fail the build by themselves.

## Trust posture

- **Zero npm dependencies** — a supply-chain security tool must not be its own attack surface.
- **No telemetry.** Local pin store, local JSONL event log, gitignored by default (or commit `pins.json` deliberately).
- Apache-2.0. Fork it if we go rogue — that's the license working as intended.
- 303 tests, `node --test` only.

## Exit codes

`0` clean · `1` drift detected · `2` config error · `3` infrastructure error (couldn't reach a server — not a drift verdict).

*The attack corpus used in tests is educational; see `corpus/` in the repo root.*
