# rugsnare

**Runtime integrity for MCP tool descriptions.** Scanners check MCP servers *before* you install them. RugSnare checks what happens *after*: an approved tool whose description silently changed is a rug pull, and it fails your build.

```
flights-search  (node ./server.js)
  [DRIFT] search_flights 8c5ab922df5932ba -> fcc6d291d8ef4ab2
  [NEW ] _search_flights_pro 589ef74a38bb8d07
  [DRIFT] get_booking 189261ab4cc7f0b6 -> 12da36af80ac39e5
rugsnare diff: DRIFT DETECTED (3 finding(s))   # exit 1 — CI fails
```

## Why

MCP tool descriptions are instructions your agent obeys but nobody reads. They can change after you approve them (maintainer update, compromised registry, typosquatted package) — carrying hidden exfiltration orders. This attack class is codified as tool poisoning (OWASP MCP03:2025). Version pinning doesn't help when the version string doesn't change; scanning doesn't help after approval. Hash pinning does.

## Install & use (v0.1 — CI gate)

Zero dependencies. Node >= 18. Nothing leaves your machine.

```bash
# in a repo (or anywhere):
rugsnare init                       # scaffold .rugsnare/, show discovered MCP configs
rugsnare scan --config .mcp.json    # baseline: pin current tool descriptions
rugsnare diff --config .mcp.json    # live check; exit 1 on drift/new/removed
rugsnare approve <server> --config .mcp.json   # re-pin after human review
```

Auto-discovers `~/.claude.json`, `.mcp.json`, `~/.cursor/mcp.json`, `.cursor/mcp.json` when `--config` is omitted.

**CI (the point):** commit `.rugsnare/pins.json` to the repo, then:

```yaml
- run: npx rugsnare diff --config .mcp.json
```

Any tool description that changed since the last human approval fails the build.

## What gets hashed

`sha256` over the canonical `{ name, description, inputSchema }` of every tool — so poisoning (description edits) and shadowing (new "session" parameters in the schema) both trip, while cosmetic reordering doesn't.

## Roadmap

- v0.2 — `rugsnare run`: live stdio proxy (observe → enforce quarantine), webhook alerts, per-call audit log
- v0.3 — YAML policies, PII egress checks on tool arguments
- later — hosted policy panel, signed + on-chain-pinned releases (`rugsnare verify --onchain`)

## Trust posture

- **Zero npm dependencies** — a supply-chain security tool must not be its own attack surface.
- **No telemetry.** Local pin store, local JSONL event log.
- Apache-2.0. Fork it if we go rogue — that's the license working as intended.

*Early prototype. The attack corpus used in tests is educational; see `corpus/` in the repo root.*
