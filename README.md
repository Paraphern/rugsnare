# RugSnare

![CI](https://github.com/Paraphern/rugsnare/actions/workflows/ci.yml/badge.svg)

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
| Toxic data inside call arguments or responses | ❌ logged today, not inspected | call inspection & egress policies — on our roadmap (v0.3) |
| Compromised MCP client or host | ❌ | host security |
| Attacker with write access to `.rugsnare/pins.json` (e.g. a compromised CI runner) | ⚠️ trust boundary | commit pins to the repo and protect the branch — pins are only as trustworthy as the place you store them; signed pins are on the roadmap |

If an attacker changes the code but not the contract, no description hash can see it — that's a different layer's job. Defense in depth means layers; this tool owns the contract layer completely.

## Field-tested

Beyond the bundled attack corpus, RugSnare is validated against real packages:

- **Compatibility:** the official `@modelcontextprotocol/server-filesystem` (2026.8.31, 14 real tools) — scanned, pinned, re-diffed clean.
- **Real drift caught:** pinned 2026.8.31, silently swapped to 2026.1.14 — `diff` flagged exactly one tool whose description genuinely changed between those releases (`read_media_file`), with 13 unchanged tools untouched. That's the precision bar: no crying wolf on version bumps, only behavioral changes.

Don't take our word for it — reproduce the field test yourself:

```bash
bash repro/field-drift.sh   # node + npm, ~1 minute, exits non-zero if no drift is found
```

## Status & roadmap

- **v0.1 (done):** CI gate — pin / diff / approve, on-chain verify, attack corpus, CI dogfooding its own corpus.
- **PR contract review (shipped):** a GitHub Action that posts a **human-readable tool-contract diff** on pull requests — reviewers see the changed words, not hashes. Try it: [`action/pr-diff`](action/pr-diff/action.yml).

  ```yaml
  - uses: Paraphern/rugsnare/action/pr-diff@main
    with:
      config: .mcp.json          # your MCP config
      working-directory: .       # where the config and committed .rugsnare/pins.json live
  ```

- **v0.2.2 (done):** prompts & resources pinning (the full MCP surface — tools, prompt templates, resource definitions — all hash-pinned and diffed) + **drift-feed**: daily automated canary scanning of the most popular MCP servers on npm, with a public append-only log of every contract change ([drift-feed/](drift-feed/)). The MCP ecosystem's first continuous contract-integrity monitor.
- **Pre-commit hook** (`rugsnare hook install`): blocks `git commit` when tool contracts have drifted — catch it before it lands, not after CI.

- **v0.2.1 (done):** cross-server **shadow detection** (same tool name on multiple servers — the client's resolution order decides which runs; caught in scan, diff and the live proxy) + **SARIF output** (`rugsnare diff --sarif`) for GitHub code scanning and other SARIF consumers + **`rugsnare report --live`** — human-readable fleet inventory (server list, tool counts, shadows) for compliance and audits; never exits 1.

- **v0.2:** live stdio proxy (observe → enforce quarantine) — catches **mid-session** description changes on already-connected agents, not just between sessions; webhook alerts, per-call audit.
- **v0.3:** declarative call policies, PII egress checks on tool arguments.
- Later: hosted policy panel for teams, agent payment guardrails.

*Early prototype. The corpus is educational — nothing in it sends data anywhere.*
