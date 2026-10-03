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

Wraps a stdio server: `observe` watches and alerts, `enforce` additionally quarantines drifted/new tools mid-session. Measured overhead on the bench fixture (`tools/bench-proxy.mjs`, 200 round-trips): **~0.7–1 ms per tool call** in observe mode, **~1.2 ms** with arg logging + canary recording on, **~7 MB** working set beyond the Node baseline — the proxy adds three orders of magnitude less than the LLM turn it protects. Idle CPU is zero (pure event loop, no polling). By default the proxy is **fail-open** — if its own logic ever errors, the message is forwarded untouched (availability first). Strict environments can flip it:

```json
// .rugsnare/config.json
{ "failMode": "closed" }
```

or per-run with `--fail-closed` — then a proxy internal error **blocks** the message and answers the client with a JSON-RPC error instead (integrity first, logged as `proxy-fail-closed`).

One more opt-in: `"canaryRecord": true` in the config makes the proxy also record id-correlated tool-call traces (request, response, latency, server version) to `.rugsnare/canary/calls.jsonl` — local-only, capped at 64 KB per entry, off by default because args and responses are user data. `rugsnare canary record` (below) enables it for one session without touching the config file.

### Canary: replay your real calls against a new version (v0.4)

Pinning answers "what changed?" The canary answers "**can I upgrade?**". While you work, the proxy records what your tools actually return; before an upgrade, replay that corpus against the new version and get a deterministic verdict:

```bash
rugsnare canary record --name flights -- npx -y flights-mcp@1.4.2   # work as usual; traces land in .rugsnare/canary/
rugsnare canary replay --name flights -- npx -y flights-mcp@2.0.0   # replay recorded calls against the NEW version
```

Replay diffs both the contract (split hash: BREAKING schema vs COSMETIC prose) and the **behavior** — a call that was ok and now errors, a response whose shape changed — while ignoring value-only differences (timestamps, prices change between runs), so no crying wolf. **Replay is read-only by default**: only read-like tool calls are re-executed; write-class and destructive-looking calls are skipped with a loud SKIPPED note (`--include <tool>` opts specific tools in, `--all-calls` lifts the write-class skip for sandboxes — destructive names always require explicit `--include`). Point replay at a dev instance, not production. Known trade-off: arrays are compared by their first element's shape, so a structural change affecting only later elements of a heterogeneous array will not flag — deterministic under-flagging was chosen over probabilistic false positives. Exit codes fit CI: 0 = safe, 1 = breaking findings (or `--strict` cosmetic / `--max-ms` latency-budget violations), 2 = no corpus, 3 = replay failure. Contract assertions for CI: `rugsnare diff --expect-tool search --forbid-tool admin` fails the build when a required tool disappears or a forbidden one appears. Traces are local and gitignored (`rugsnare init` writes that .gitignore for you); pins remain the only deliberate commit. Self-verifying demo: [`repro/canary.sh`](repro/canary.sh); CI integration: [`action/canary`](action/canary/action.yml).

### Signed receipts: a tamper-evident trail of what the agent did (v0.4)

The proxy already logs every tool call. Receipts make that log provable: an Ed25519 hash-chain where each entry signs the hash of the previous one — edit, delete, or reorder anything after signing, and `verify` names the exact entry where the chain breaks.

```bash
rugsnare receipts sign      # chain + sign the local event log (key generated locally, never leaves the machine)
rugsnare receipts verify    # intact — or: BROKEN: entry #7 modified after signing (exit 1)
rugsnare receipts export    # auditor dossier (markdown + JSON), fields aligned to IETF draft-sharif-agent-audit-trail-05
```

Keys live in `.rugsnare/keys/` (gitignored). `verify --pub <pem>` checks a receipt file against an exported public key — an auditor can confirm your trail without ever seeing a private key. One honest limit: the chain catches edits, insertions, deletions, and reordering **inside** it, but not a silent truncation of its tail (dropping the last N entries leaves a valid shorter chain). That is what the **chain head** printed by `sign`/`export` is for — anchor it somewhere the log writer cannot quietly rewrite (a commit, a message to the auditor) and compare. Also in v0.4: a **loop detector** — the proxy notices when the same tool is called repeatedly with identical arguments and no other tool in between (a stuck agent burning credits) and raises a one-time `loop-suspected` advisory; it never blocks anything.

### RugSnare as an MCP tool (read-only, for marketplaces and agents)

The same binary doubles as a stdio MCP server, so agents can call it and marketplaces can list it:

```json
{ "mcpServers": { "rugsnare": { "command": "npx", "args": ["-y", "rugsnare", "mcp"] } } }
```

Two read-only tools: `drift_feed_status` (what the public drift-feed currently sees across popular MCP servers — the only outbound call this server ever makes, a fixed public URL, only when explicitly invoked) and `pins_report` (the local pin store of the project the agent works in — never writes, never sends anything). Pinned by our own gate, naturally — the baseline lives in [`corpus/03-rugsnare-self`](corpus/03-rugsnare-self). A Docker image and registry entry are prepared under `docker/` and `registry/`.

## Trust model

We take our own medicine:

- **Zero dependencies** — a supply-chain security tool must not be its own attack surface.
- **No telemetry.** Local pin store, local JSONL event log, nothing leaves your machine.
- **Signed releases** (Ed25519 OpenPGP, fingerprint in [SECURITY.md](SECURITY.md), published in three independent places).
- **On-chain `ReleaseLog`** — release hashes pinned append-only on Base (testnet live now); `rugsnare verify` checks your install against a hash that has been in the ledger since release day.
- **Apache-2.0.** If we ever go rogue — fork us. That's the license working as intended.

Ongoing research on how teams vet MCP servers: [discussions/1](https://github.com/Paraphern/rugsnare/discussions/1) — 7 short questions, findings published. Author: [@SergeyDruzhba on X](https://x.com/SergeyDruzhba).

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
| Chameleon server (clean contract for inspection tools, poisoned for real clients) | ✅ caught by `rugsnare scan --chameleon` — re-lists tools identifying as claude-desktop/cursor and compares hashes; any per-client difference exits 1 | — |
| Behavioral hint flip (`readOnlyHint: true → false` / adds `destructiveHint`) with byte-identical text+schema | ✅ caught — annotations are pinned separately from the hash and compared through spec defaults (absent `destructiveHint` = true); a flip is DRIFT/ANNOTATION in `diff`, CI and the live proxy | — |
| Mid-session swap of an already-connected server | ✅ quarantined in enforce mode | — |
| Malicious code behind an *unchanged* contract | ❌ out of scope by design | package signing / provenance / sandboxing |
| Toxic data inside call arguments or responses | ✅ caught (v0.3) — policies + PII egress checks in the live proxy | — |
| Hijacked or destructive agent action (rm -rf class, download-pipe-shell, disk overwrite, fork bomb in call arguments) | ✅ denied by the default `dangerous-shell` policy in the live proxy | — |
| Compromised MCP client or host | ❌ | host security |
| Attacker with write access to `.rugsnare/pins.json` (e.g. a compromised CI runner) | ⚠️ trust boundary | commit pins to the repo and protect the branch — pins are only as trustworthy as the place you store them; signed pins are on the roadmap |

If an attacker changes the code but not the contract, no description hash can see it — that's a different layer's job. Defense in depth means layers; this tool owns the contract layer completely.

## Field-tested

**The silent changes report** ([repro/SILENT-CHANGES-REPORT.md](repro/SILENT-CHANGES-REPORT.md)): we pinned every stable release of the 4 official `@modelcontextprotocol/server-*` reference servers, diffed each version against the next, and counted every contract change between them.

| Metric | Value |
|---|---|
| Version pairs measured | **66** (complete coverage — every release of all four servers) |
| Pairs with silent changes | **23** |
| BREAKING (schema changed) | **43** |
| ANNOTATION (behavioral hints flipped, spec-default aware) | **28** |
| COSMETIC (description reworded) | **7** |
| New items that appeared post-approval | **37** (24 tools, 5 prompts, 8 resources) |
| Items removed post-approval | **24** (21 tools, 3 prompts) |
| Clean pairs (precision, no crying wolf) | **43** |

**140 findings. Not one was announced in a changelog.** The most dramatic single step: filesystem `2025.8.21 → 2025.11.25` changed all 14 tool contracts simultaneously — 14 BREAKING schema changes in one silent release; everything's history is a churn machine: 31 tools appeared and 24 disappeared across 27 releases. Reproduce on your machine: one command, ~30 minutes, deterministic — see the report footer.

## Status & roadmap

| Version | Status | What's inside |
|---|---|---|
| **v0.1** | ✅ shipped | CI gate (`scan` / `diff` / `approve`), on-chain release verification, attack corpus, zero-dep |
| **v0.2** | ✅ shipped | Live stdio proxy (`rugsnare run`) — mid-session quarantine; shadow detection; advisory signals; prompts & resources pinning; SARIF output; fleet report; pre-commit hook; drift-feed (daily ecosystem monitoring); 9 AI clients |
| **v0.3** | ✅ shipped | Call policies + PII egress checks — deny `session:object`, deny credentials in arguments, require approval for destructive tools; custom rules via `.rugsnare/policies.json`; `--timeout` flag; exit code 3 for infra errors |
| **v0.3.1** | ✅ shipped | Split hash — BREAKING (schema) vs COSMETIC (prose) drift classification (`--schema-only` / `--prose-only`); debounced summary alerts; `failMode: "closed"` option (`--fail-closed`) — proxy internal error blocks instead of forwarding, for strict environments |
| **PR-diff Action** | ✅ shipped | Human-readable tool-contract diff on pull requests. [Demo: PR #2](https://github.com/Paraphern/rugsnare/pull/2) · [`action/pr-diff`](action/pr-diff/action.yml) |
| **v0.4** | ✅ shipped | **Canary** — `rugsnare canary record/replay`: record real tool calls through the live proxy (opt-in, local), replay them against a new server version, deterministic verdict (BREAKING schema / behavior flip / COSMETIC) with CI exit codes; `action/canary` for GitHub Actions; **signed receipts** — Ed25519 hash-chain over the audit log, `receipts sign/verify/export` with an AAT-05-aligned dossier; **loop detector** advisory; **chameleon check** — `scan --chameleon` catches servers serving different contracts per client; advisory signals extended (imperative openers, explicit instruction-hijack phrases — forced advisory, exfil-carrier optional params); default `dangerous-shell` policy; `init` writes a .gitignore protecting local state |
| **v0.5 (next)** | 🔜 | **AI Security Audit** — zero-knowledge scanner for sensitive data in AI chats: API keys, SSH keys, credit cards (Luhn), crypto seed phrases, PII, database URLs, internal IPs. Local-only, screen-only, `--airgap` mode. `rugsnare audit --input <export>` |
| **RugSnare as an MCP tool** | ✅ shipped | `rugsnare mcp` — read-only stdio server (`drift_feed_status` over the public drift-feed, `pins_report` over local pins) for marketplaces and agents; pinned by its own gate (dogfood baseline in corpus/03); Docker image (`docker/`) + registry entry (`registry/`) prepared |
| **Later** | 💭 | Hosted policy panel · Agent payment guardrails · Secret vault (AI sees placeholders, proxy injects real keys) |

*118 tests · 10 CI jobs · field-tested on real packages · on-chain verified · zero dependencies · no telemetry.*
