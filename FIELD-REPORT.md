# 140 silent contract changes: what we found in the official MCP servers

> Your agent obeys tool descriptions. When a server changes one after you approved it, the agent's instructions change — silently. We measured how often that happens in the servers everyone installs first.

We pinned **every stable release** of the four official `@modelcontextprotocol/server-*` reference servers — filesystem, memory, everything, sequential-thinking — diffed each version against the next, and classified every difference deterministically. No LLM, no judgment calls.

## The numbers

**66 version pairs (complete coverage — every release of all four servers) · 140 findings · not one announced in a changelog.**

| What changed | How many | Why it matters to your agent |
|---|---|---|
| **BREAKING** — inputSchema changed | **43** | a required param appeared or an enum narrowed; yesterday's tool call is today's runtime error |
| **ANNOTATION** — behavioral hints flipped | **28** | `readOnlyHint`/`destructiveHint` changed (compared through MCP spec defaults, where absent `destructiveHint` means destructive) |
| **COSMETIC** — description reworded | **7** | the words your model reads were rewritten |
| **NEW items** appeared post-approval | **37** | 19 tools, 5 prompts, 8 resources (in everything), 5 tools (filesystem), 1 resource (memory), 12 more — new attack surface nobody approved |
| **REMOVED** — items disappeared | **24** | 21 tools, 3 prompts — your agent's toolkit silently shrank |
| Clean pairs | 43 | the precision claim: no crying wolf |

## Three examples worth remembering

1. **filesystem `2025.8.21 → 2025.11.25`**: all 14 tools changed their contracts simultaneously — 14 BREAKING schema changes in one silent release. No human reviewer diffs fourteen tools on an upgrade they didn't know happened.
2. **memory's history carries 18 schema-level breaks** — including a stretch where every `delete_*` tool changed its input contract at once.
3. **everything's history is a churn machine**: 31 items appeared (19 tools, 5 prompts, 7 resources) and 24 disappeared (21 tools, 3 prompts) across 27 releases — your agent's toolkit changed on nearly every upgrade, and nobody approved any of it.

## How this was measured (reproduce it yourself)

For each stable version `V`: install `V`, run `rugsnare scan` (baseline pin of `{name, description, inputSchema}` + prompts + resources + behavioral annotations). Install `V+1` over it — the silent upgrade an agent gets from `npx -y pkg@latest` — and run `rugsnare diff`. Every difference is classified: BREAKING (schema), COSMETIC (prose), ANNOTATION (hints, through spec defaults).

```bash
bash repro/backtest-multi.sh    # ~30 minutes, four official servers, complete history
node repro/build-report.mjs     # regenerates the report from the JSONL
```

Full per-pair breakdown with version numbers and was/became text: [repro/SILENT-CHANGES-REPORT.md](repro/SILENT-CHANGES-REPORT.md) · raw data: `repro/silent-changes-data.jsonl`.

## The point

Scanners check a server once, at install time. `npx -y pkg@latest` re-rolls the dice on every launch. The gap between "approved" and "what actually runs" is where these 140 changes lived — invisible until someone pinned the contract and diffed every release. That's what RugSnare is: hash-pin what you approved, catch what changes after, replay your real calls before you upgrade.

---

*Measured 2026-10-03 with RugSnare v0.5.0 · zero dependencies · no telemetry · every number reproducible on your machine.*
