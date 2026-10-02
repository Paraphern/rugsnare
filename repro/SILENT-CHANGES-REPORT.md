# The silent changes report: official MCP servers, release by release

> We pinned every stable release of 4 official `@modelcontextprotocol/server-*` reference servers,
> diffed each version against the next, and counted every contract change between them.
> **52 version pairs · 35 clean · 17 pairs with silent changes · 91 findings** —
> not one of them announced in a changelog.

Findings split: **34 BREAKING** (schema changed) · **6 COSMETIC** (description reworded) · **24 ANNOTATION** (behavioral hints flipped, compared through spec defaults) · **17 PROMPTS/RESOURCES** (server prompts or resources changed — instructions your agent also obeys) · **10 NEW tools** appeared · **0 REMOVED**.

## Per server

| Server | Pairs | Clean | Drifted | BREAKING | COSMETIC | ANNOTATION | NEW | REMOVED |
|---|---|---|---|---|---|---|---|---|
| filesystem | 18 | 11 | 7 | 14 | 5 | 14 | 5 | 0 |
| memory | 13 | 10 | 3 | 18 | 0 | 9 | 1 | 0 |
| everything | 13 | 10 | 3 | 0 | 0 | 0 | 4 | 0 |
| sequential-thinking | 8 | 4 | 4 | 2 | 1 | 1 | 0 | 0 |

## Every pair with changes

### filesystem

- `0.6.2` → `2025.1.14`: 2 new tools
- `2025.3.28` → `2025.7.1`: 1 cosmetic, 1 new tool
- `2025.7.1` → `2025.7.29`: 2 cosmetic, 2 new tools
- `2025.7.29` → `2025.8.18`: 1 cosmetic
- `2025.8.21` → `2025.11.25`: 14 breaking
- `2026.1.14` → `2026.7.4`: 1 annotation
- `2026.7.4` → `2026.7.10`: 1 cosmetic, 13 annotation

### memory

- `2025.8.4` → `2025.9.24`: 9 breaking
- `2025.9.25` → `2025.11.25`: 9 breaking
- `2026.1.26` → `2026.7.4`: 9 annotation, 1 new tool

### everything

- `0.6.2` → `2025.1.14`: 1 new tool
- `2025.1.14` → `2025.3.19`: 1 new tool
- `2025.3.19` → `2025.4.8`: 2 new tools

### sequential-thinking

- `2025.7.1` → `2025.11.25`: 1 breaking
- `2025.11.25` → `2025.12.18`: 1 cosmetic
- `2025.12.18` → `2026.7.4`: 1 annotation
- `2026.7.4` → `2026.8.31`: 1 breaking

## Methodology (reproducible in one command)

1. For each stable version `V` of a server: install `V`, run `rugsnare scan` — the baseline pin of `{name, description, inputSchema}` + prompts + resources + behavioral annotations.
2. Install `V+1` over it (the silent upgrade an agent would get from `npx -y`), run `rugsnare diff`.
3. Every difference is classified deterministically: BREAKING (schema changed, e.g. a required param appeared), COSMETIC (prose reworded), ANNOTATION (behavioral hints flipped — compared through MCP spec defaults, where an absent `destructiveHint` means destructive). No LLM, no judgment calls.

```bash
bash repro/backtest-multi.sh   # ~20 minutes, four official servers, full history
```

*Coverage note: 66 version pairs exist across the four servers; 52 pairs are measured. 14 older `server-everything` releases (2025-12 → 2026-08 line) do not start headless in this harness — scan fails, the pair is skipped, and nothing is imputed for it.*

## Why this matters

Your agent obeys tool descriptions. When a server changes a description, a schema, or a behavioral hint after you approved it, the agent's instructions change — silently. Scanners check once at install; `npx -y pkg@latest` re-rolls the dice on every launch. This report is what that looks like on the four servers everyone installs first.

---
*Generated 2026-10-02T09:14:49.477Z by `repro/backtest-multi.sh` + `repro/build-report.mjs` ( RugSnare v0.4.0, 52 pairs ). Zero dependencies, no telemetry, every number reproducible on your machine.*
