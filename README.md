# RugSnare

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

## Quick start

```bash
rugsnare init                     # scaffold .rugsnare/, discover MCP configs (Claude Code, Cursor)
rugsnare scan --config .mcp.json  # baseline: pin current tool descriptions
rugsnare diff --config .mcp.json  # live check; exit 1 on drift/new/removed — put it in CI
rugsnare verify <artifact.tgz> --version <v>   # check an artifact against the on-chain ReleaseLog pin
```

Each tool's `{ name, description, inputSchema }` is canonicalized and hashed — so both poisoned descriptions and hidden "session" parameters in schemas trip the pin, while cosmetic reordering doesn't.

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

## Field-tested

Beyond the bundled attack corpus, RugSnare is validated against real packages:

- **Compatibility:** the official `@modelcontextprotocol/server-filesystem` (2026.8.31, 14 real tools) — scanned, pinned, re-diffed clean.
- **Real drift caught:** pinned 2026.8.31, silently swapped to 2026.1.14 — `diff` flagged exactly one tool whose description genuinely changed between those releases (`read_media_file`), with 13 unchanged tools untouched. That's the precision bar: no crying wolf on version bumps, only behavioral changes.

## Status & roadmap

- **v0.1 (done):** CI gate — pin / diff / approve, on-chain verify, attack corpus, CI dogfooding its own corpus.
- **v0.2:** live stdio proxy (observe → enforce quarantine) — catches **mid-session** description changes on already-connected agents, not just between sessions; webhook alerts, per-call audit.
- **v0.3:** declarative call policies, PII egress checks on tool arguments.
- Later: hosted policy panel for teams, agent payment guardrails.

*Early prototype. The corpus is educational — nothing in it sends data anywhere.*
