# RugSnare Drift Feed

A public, verifiable log of MCP server contract changes — automatically updated daily.

## What this is

Every day, RugSnare scans the most popular MCP servers on npm, records the hash of every tool's `{name, description, inputSchema}`, every prompt template, and every resource definition. Any change is logged here — version bumps, description edits, new tools, removed tools, advisory signals appearing or clearing.

## Why this matters

MCP tool descriptions are instructions your AI agent obeys. When they change silently, your agent's behavior changes without your knowledge. This feed is the canary in the coal mine for the entire MCP ecosystem.

## Files

- `servers.json` — the curated list of monitored servers (submit PRs to add more)
- `latest-snapshot.json` — full contract hashes from the latest scan
- `changes.jsonl` — append-only log of every change ever detected

## Reading the feed

Each line in `changes.jsonl` is a JSON object:

```json
{"ts":"2026-09-30T06:00:01Z","server":"server-filesystem","type":"DRIFT","tool":"read_media_file","oldHash":"661d2d1d9e2a5550","newHash":"075ca529d04a890e"}
```

| Type | Meaning |
|---|---|
| `FIRST_SCAN` | Server monitored for the first time |
| `VERSION` | Package version changed |
| `DRIFT` | Tool description/schema hash changed — **review recommended** |
| `NEW_TOOL` | A new tool appeared |
| `REMOVED_TOOL` | An existing tool disappeared |
| `NEW_PROMPT` / `REMOVED_PROMPT` | Prompt template added/removed |
| `ADVISORY_NEW` | A tool's description started triggering advisory signals |
| `ADVISORY_CLEARED` | Advisory signals cleared |
| `ERROR` | Server unreachable or scan failed |

## Add a server

Submit a PR adding an entry to `servers.json`:

```json
{ "name": "your-server", "pkg": "your-npm-package", "args": ["--stdio"] }
```

## Powered by

[RugSnare](https://github.com/Paraphern/rugsnare) — runtime integrity for MCP tool descriptions.

## The proof it matters

The one-command historical backtest behind the public field report — **91 silent contract changes across 52 release pairs of the four official MCP servers** (34 BREAKING, 24 annotation flips, 17 prompt/resource changes, 6 cosmetic, 10 new tools; 35 clean pairs) — lives in [repro/SILENT-CHANGES-REPORT.md](../repro/SILENT-CHANGES-REPORT.md) with raw data and full reproducibility.
