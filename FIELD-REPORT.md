# 91 silent contract changes: what we found in the official MCP servers

> Your agent obeys tool descriptions. When a server changes one after you approved it, the agent's instructions change — silently. We measured how often that happens in the servers everyone installs first.

We pinned **every stable release** of the four official `@modelcontextprotocol/server-*` reference servers — filesystem, memory, everything, sequential-thinking — diffed each version against the next, and classified every difference deterministically. No LLM, no judgment calls.

## The numbers

**52 version pairs measured · 91 findings · not one announced in a changelog.**

| What changed | How many | Why it matters to your agent |
|---|---|---|
| **BREAKING** — inputSchema changed | **34** | a required param appeared or an enum narrowed; yesterday's tool call is today's runtime error |
| **ANNOTATION** — behavioral hints flipped | **24** | `readOnlyHint`/`destructiveHint` changed (compared through MCP spec defaults, where absent `destructiveHint` means destructive) — what the client lets the tool do changed |
| **PROMPTS/RESOURCES** changed | **17** | the server's own prompts and resources changed — instructions your agent also obeys, beyond tool descriptions |
| **COSMETIC** — description reworded | **6** | the words your model reads were rewritten |
| **NEW tools** appeared post-approval | **10** | new attack surface nobody approved |
| Clean pairs | 35 | the precision claim: no crying wolf |

Coverage note: 66 pairs exist in the four histories; 14 older `server-everything` releases do not start headless and are skipped — nothing is imputed for them.

## Three examples worth remembering

1. **filesystem `2025.8.21 → 2025.11.25`**: all 15 tool descriptions rewritten simultaneously. No human reviewer diffs fifteen paragraphs on an upgrade they didn't know happened.
2. **memory's history carries 18 schema-level breaks** — including a stretch where every `delete_*` tool changed its input contract at once.
3. **Annotation flips are everywhere (24)** — the exact class the MCP spec tells clients to treat as untrusted, and the one nobody was watching.

## How this was measured (reproduce it yourself)

For each stable version `V`: install `V`, run `rugsnare scan` (baseline pin of `{name, description, inputSchema}` + prompts + resources + behavioral annotations). Install `V+1` over it — the silent upgrade an agent gets from `npx -y pkg@latest` — and run `rugsnare diff`. Every difference is classified: BREAKING (schema), COSMETIC (prose), ANNOTATION (hints, through spec defaults), PROMPTS/RESOURCES.

```bash
bash repro/backtest-multi.sh    # ~20 minutes, four servers, full history
node repro/build-report.mjs     # regenerates the report from the JSONL
```

Full per-pair breakdown with version numbers: [repro/SILENT-CHANGES-REPORT.md](repro/SILENT-CHANGES-REPORT.md) · raw data: `repro/silent-changes-data.jsonl`.

## The point

Scanners check a server once, at install time. `npx -y pkg@latest` re-rolls the dice on every launch. The gap between "approved" and "what actually runs" is where these 91 changes lived — invisible until someone pinned the contract and diffed every release. That's what RugSnare is: hash-pin what you approved, catch what changes after, replay your real calls before you upgrade.

---

*Measured 2026-10-02 with RugSnare v0.4.0 · zero dependencies · no telemetry · every number reproducible on your machine.*
