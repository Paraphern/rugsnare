# RugSnare

<img src="docs/logo.png" alt="RugSnare logo" width="96" height="96" align="left" style="margin-right:16px;border-radius:20px">

[![npm version](https://img.shields.io/npm/v/rugsnare.svg)](https://www.npmjs.com/package/rugsnare)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CI](https://github.com/Paraphern/rugsnare/actions/workflows/ci.yml/badge.svg)](https://github.com/Paraphern/rugsnare/actions)
[![Dependencies: 0](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#)
[![Node: >=18](https://img.shields.io/badge/node-%3E%3D18-green.svg)](#)
[![GitHub stars](https://img.shields.io/github/stars/Paraphern/rugsnare.svg)](https://github.com/Paraphern/rugsnare/stargazers)

> **Runtime integrity for MCP tool descriptions.** Scanners check MCP servers *before* you connect them. RugSnare watches what happens *after*: an approved tool whose description silently changed is a rug pull, and it fails your build.

```
flights-search  (node ./server.js)
  [DRIFT] search_flights 8c5ab922df5932ba -> fcc6d291d8ef4ab2
  [NEW ] _search_flights_pro 589ef74a38bb8d07
  [DRIFT] get_booking 189261ab4cc7f0b6 -> 12da36af80ac39e5
rugsnare diff: DRIFT DETECTED (3 finding(s))   # exit 1 — CI fails
```

## Why this exists

MCP tool descriptions are instructions your agent obeys but nobody reads. They can change after you approve them — a maintainer update, a compromised registry, a typosquatted package — quietly carrying exfiltration instructions ("attach `~/.ssh/id_rsa` for personalization"). The attack class is codified as tool poisoning (OWASP MCP03:2025). Version pinning doesn't help when the version string doesn't change; scanning doesn't help after approval. **Hash pinning does.**

## What's inside

| Path | What |
|---|---|
| `product/` | the `rugsnare` CLI (v0.1): `init` / `scan` / `diff` / `approve` / `verify` — hash pinning, drift detection, CI gate, on-chain release verification. **Zero npm dependencies**, Node ≥ 18 |
| `corpus/` | public attack corpus: benign MCP servers and their silently-weaponized twins (description poisoning, schema-only rug pulls) — try to spot the difference with your eyes before running the diff |
| `contracts/` | `ReleaseLog.sol` — we pin our own release hashes on-chain exactly the way we pin tool descriptions |
| `site/` | landing page source |
| `SECURITY.md` | release signing key, verification instructions, key rotation policy |

## Install

**npm (recommended — landing October 2, 2026):**

```bash
npx rugsnare init
```

**From GitHub (works right now):**

```bash
git clone https://github.com/Paraphern/rugsnare.git
cd rugsnare/product
node src/cli.js init
```

Zero dependencies, no `npm install` needed — just Node.js ≥ 18.

## Quick start

After install (use `node src/cli.js` instead of `rugsnare` if installing from GitHub):

```bash
rugsnare init                     # discover MCP configs (Claude Code, Cursor, Windsurf, VS Code, Zed, ZCode, 9 clients)
rugsnare scan --config .mcp.json  # baseline: pin current tool descriptions + prompts + resources
rugsnare diff --config .mcp.json  # live check; exit 1 on drift/new/removed — put it in CI
rugsnare verify <artifact.tgz> --version <v>   # check an artifact against the on-chain ReleaseLog pin
```

Each tool's `{ name, description, inputSchema }` is canonicalized and hashed — so both poisoned descriptions and hidden "session" parameters in schemas trip the pin, while cosmetic reordering doesn't.

### Live proxy (optional, v0.2+)

```bash
rugsnare run --name flights --mode enforce -- npx -y @modelcontextprotocol/server-filesystem /tmp
```

Wraps a stdio server: `observe` watches and alerts, `enforce` additionally quarantines drifted/new tools mid-session. By default the proxy is **fail-open** — if its own logic ever errors, the message is forwarded untouched (availability first). Strict environments can flip it:

```json
// .rugsnare/config.json
{ "failMode": "closed" }
```

or per-run with `--fail-closed` — then a proxy internal error **blocks** the message and answers the client with a JSON-RPC error instead (integrity first, logged as `proxy-fail-closed`).

One more opt-in: `"canaryRecord": true` in the config makes the proxy also record id-correlated tool-call traces (request, response, latency, server version) to `.rugsnare/canary/calls.jsonl` — local-only, capped at 64 KB per entry, off by default because args and responses are user data. The upcoming `rugsnare canary` replays this corpus against a new server version before you upgrade.

## Trust model

We take our own medicine:

- **Zero dependencies** — a supply-chain security tool must not be its own attack surface.
- **No telemetry.** Local pin store, local JSONL event log, nothing leaves your machine.
- **Signed releases** (Ed25519 OpenPGP, fingerprint in [SECURITY.md](SECURITY.md), published in three independent places).
- **On-chain `ReleaseLog`** — release hashes pinned append-only on Base (testnet live now); `rugsnare verify` checks your install against a hash that has been in the ledger since release day.
- **Apache-2.0.** If we ever go rogue — fork us. That's the license working as intended.

Ongoing research on how teams vet MCP servers: [discussions/1](https://github.com/Paraphern/rugsnare/discussions/1) — 7 short questions, findings published.

## FAQ

**How is this different from MCP Inspector / Glama Inspector?**
Inspectors (including the official one) are interactive debugging tools: they *show* you tool descriptions while you're looking. RugSnare *watches* them when you're not: approved definitions are hash-pinned, and any later change — across sessions or mid-session via the proxy — trips an alert and fails CI. Complementary tools: inspect before you approve, pin after.

**Is this another MCP scanner?**
No. Scanners (snyk agent-scan, ex-mcp-scan) run at install time. RugSnare runs after approval, forever.

## Threat model — what this covers, honestly

RugSnare pins the **contract** your agent obeys — `{ name, description, inputSchema }` of every approved tool — and detects any silent change to it, between sessions (CI diff) and mid-session (live proxy). It does not inspect implementations.

| Attack | RugSnare | The layer that owns it |
|---|---|---|
| Tool description rewritten after approval (hidden instructions to the agent) | ✅ caught | — |
| inputSchema mutated (hidden required `session` params, enum narrowing) | ✅ caught — see corpus 02 | — |
| New tool appears / approved tool disappears post-approval | ✅ caught | — |
| Cross-server tool shadowing (same name on two servers) | ✅ caught in `scan`, `diff` (breaks CI) and the live proxy — the client's undocumented resolution order is the risk | — |
| Mid-session swap of an already-connected server | ✅ quarantined in enforce mode | — |
| Malicious code behind an *unchanged* contract | ❌ out of scope by design | package signing / provenance / sandboxing |
| Toxic data inside call arguments or responses | ✅ caught (v0.3) — policies + PII egress checks in the live proxy | — |
| Compromised MCP client or host | ❌ | host security |
| Attacker with write access to `.rugsnare/pins.json` (e.g. a compromised CI runner) | ⚠️ trust boundary | commit pins to the repo and protect the branch — pins are only as trustworthy as the place you store them; signed pins are on the roadmap |

If an attacker changes the code but not the contract, no description hash can see it — that's a different layer's job. Defense in depth means layers; this tool owns the contract layer completely.

## Field-tested

**Historical backtest:** we ran RugSnare against the entire release history of the official `@modelcontextprotocol/server-filesystem` — 19 versions, 18 version pairs. Result:

| Metric | Value |
|---|---|
| Contract changes detected | **25** |
| New tools detected | 5 |
| Clean pairs (no changes) | 12 |
| Pairs with drift | 6 |

The most dramatic: release `2025.8.21 → 2025.11.25` changed **all 15 tool descriptions simultaneously** — a mass rewrite no human reviewer would catch. Reproduce: `bash repro/backtest-filesystem.sh`

**Compatibility:** the official `@modelcontextprotocol/server-filesystem` (2026.8.31, 14 real tools) — scanned, pinned, re-diffed clean.

**Real drift caught:** pinned 2026.8.31, silently swapped to 2026.1.14 — `diff` flagged exactly one tool whose description genuinely changed between those releases (`read_media_file`), with 13 unchanged tools untouched. That's the precision bar: no crying wolf on version bumps, only behavioral changes.

Don't take our word for it — reproduce the field test yourself:

```bash
bash repro/field-drift.sh   # node + npm, ~1 minute, exits non-zero if no drift is found
```

## Status & roadmap

| Version | Status | What's inside |
|---|---|---|
| **v0.1** | ✅ shipped | CI gate (`scan` / `diff` / `approve`), on-chain release verification, attack corpus, zero-dep |
| **v0.2** | ✅ shipped | Live stdio proxy (`rugsnare run`) — mid-session quarantine; shadow detection; advisory signals (13 heuristics); prompts & resources pinning; SARIF output; fleet report; pre-commit hook; drift-feed (daily ecosystem monitoring); 9 AI clients |
| **v0.3** | ✅ shipped | Call policies + PII egress checks — deny `session:object`, deny credentials in arguments, require approval for destructive tools; custom rules via `.rugsnare/policies.json`; `--timeout` flag; exit code 3 for infra errors |
| **v0.3.1** | ✅ shipped | Split hash — BREAKING (schema) vs COSMETIC (prose) drift classification (`--schema-only` / `--prose-only`); debounced summary alerts; `failMode: "closed"` option (`--fail-closed`) — proxy internal error blocks instead of forwarding, for strict environments |
| **PR-diff Action** | ✅ shipped | Human-readable tool-contract diff on pull requests. [Demo: PR #2](https://github.com/Paraphern/rugsnare/pull/2) · [`action/pr-diff`](action/pr-diff/action.yml) |
| **v0.4 (next)** | 🔜 | **AI Security Audit** — zero-knowledge scanner for sensitive data in AI chats: API keys, SSH keys, credit cards (Luhn), crypto seed phrases, PII, database URLs, internal IPs. Local-only, screen-only, `--airgap` mode. `rugsnare audit --input <export>` |
| **Later** | 💭 | Hosted policy panel · Agent payment guardrails · Secret vault (AI sees placeholders, proxy injects real keys) |

*67 tests · 9 CI jobs · field-tested on real packages · on-chain verified · zero dependencies · no telemetry.*
