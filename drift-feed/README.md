# RugSnare Drift Feed

A public, verifiable log of MCP server contract changes - automatically updated daily.

## What this is

Every day, RugSnare scans the most popular MCP servers on npm, records the hash of every tool's `{name, description, inputSchema}`, every prompt template, and every resource definition. Any change is logged here - version bumps, description edits, new tools, removed tools, advisory signals appearing or clearing.

## Why this matters

MCP tool descriptions are instructions your AI agent obeys. When they change silently, your agent's behavior changes without your knowledge. This feed is the canary in the coal mine for the entire MCP ecosystem.

## Files

- `servers.json` - the curated list of monitored servers (submit PRs to add more)
- `latest-snapshot.json` - full contract hashes from the latest scan
- `changes.jsonl` - append-only log of every change ever detected

## Reading the feed

Each line in `changes.jsonl` is a JSON object:

```json
{"ts":"2026-09-30T06:00:01Z","server":"server-filesystem","type":"DRIFT","tool":"read_media_file","oldHash":"661d2d1d9e2a5550","newHash":"075ca529d04a890e"}
```

| Type | Meaning |
|---|---|
| `FIRST_SCAN` | Server monitored for the first time |
| `VERSION` | Package version changed |
| `DRIFT` | Tool description/schema hash changed - **review recommended** |
| `NEW_TOOL` | A new tool appeared |
| `REMOVED_TOOL` | An existing tool disappeared |
| `HOSTED_ERROR` | Hosted endpoint unreachable (event, not noise - "endpoint went dark" is contract-relevant) |
| `HOSTED_GATED` | Hosted endpoint started demanding authentication where it did not before |
| `ERROR` | Server unreachable or scan failed |
| `NEW_PROMPT` / `REMOVED_PROMPT` | Prompt template added/removed |
| `ADVISORY_NEW` | A tool's description started triggering advisory signals |
| `ADVISORY_CLEARED` | Advisory signals cleared |

## Add a server

Submit a PR adding an entry to `servers.json`:

```json
{ "name": "your-server", "pkg": "your-npm-package", "args": ["--stdio"] }
```

Hosted (remote HTTP) endpoints use the `url` shape:

```json
{ "name": "your-server-hosted", "url": "https://your-server.example/mcp" }
```

## Hosted coverage rule (read before reading silence as cleanliness)

Hosted servers - the majority of the registry - change contracts WITHOUT any
release: the operator deploys server-side and every client's contract shifts
silently the same second (a pin of the npm package says nothing about the
remote; Microsoft confirmed their azure-devops remote updates ahead of npm).
This feed watches hosted endpoints too, with one honest limit: a public
GitHub Actions feed cannot carry auth tokens, so only endpoints whose
`tools/list` answers WITHOUT authentication are monitored (a common MCP
pattern - list open, call gated). Auth-gated endpoints are excluded by
design, not by oversight; absence from this feed is not evidence of
cleanliness. The hosted list starts small (context7, deepwiki) and grows by
PR; entries whose `tools/list` closes will surface as `HOSTED_GATED`.

## Powered by

[RugSnare](https://github.com/Paraphern/rugsnare) - runtime integrity for MCP tool descriptions.

## The proof it matters

The one-command historical backtest behind the public field report - **140 silent contract changes across all 66 release pairs of the four official MCP servers** (43 BREAKING, 28 annotation flips, 7 cosmetic, 37 new items - 24 tools / 5 prompts / 8 resources, 24 removed; 43 clean pairs) - lives in [repro/SILENT-CHANGES-REPORT.md](../repro/SILENT-CHANGES-REPORT.md) with raw data and full reproducibility.

## Public API (read-only)

The latest snapshot and the full change log are plain JSON on GitHub raw - consume freely, no key, no rate games:

```
https://raw.githubusercontent.com/Paraphern/rugsnare/main/drift-feed/latest-snapshot.json   # current versions + hashes
https://raw.githubusercontent.com/Paraphern/rugsnare/main/drift-feed/changes.jsonl          # append-only event log
```

Updated daily at 06:00 UTC by CI. Registries and catalogs are welcome to ingest it (this is the data `rugsnare mcp`'s `drift_feed_status` tool serves).
