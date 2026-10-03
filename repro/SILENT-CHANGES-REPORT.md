# The silent changes report: official MCP servers, release by release

> We pinned every stable release of 4 official `@modelcontextprotocol/server-*` reference servers,
> diffed each version against the next, and counted every contract change between them.
> **66 version pairs · 43 clean · 23 pairs with silent changes · 140 findings** —
> not one of them announced in a changelog.

Findings split: **43 BREAKING** (schema changed) · **28 ANNOTATION** (behavioral hints flipped, compared through spec defaults) · **7 COSMETIC** (description reworded) · **1 PROMPT/RESOURCE** (server prompt content changed) · **37 NEW items** (of them: 24 tools, 5 prompts, 8 resources) · **24 REMOVED**.

## Per server

| Server | Pairs | Clean | Drifted | BREAKING | COSMETIC | ANNOTATION | NEW | REMOVED |
|---|---|---|---|---|---|---|---|---|
| filesystem | 18 | 11 | 7 | 14 | 5 | 14 | 5 | 0 |
| memory | 13 | 10 | 3 | 18 | 0 | 9 | 1 | 0 |
| everything | 27 | 18 | 9 | 9 | 1 | 4 | 31 | 24 |
| sequential-thinking | 8 | 4 | 4 | 2 | 1 | 1 | 0 | 0 |

## Every pair with changes — and exactly what changed

### filesystem

- `0.6.2` → `2025.1.14`: 2 new items
  - `edit_file` — appeared
  - `directory_tree` — appeared
- `2025.3.28` → `2025.7.1`: 1 cosmetic, 1 new item
  - `read_file` — cosmetic change
      - was: `… examine the contents of a single file. Only works within allowed directories.`
      - now: `… examine the contents of a single file. Use the 'head' parameter to read only the first N lines of a file, or …`
  - `list_directory_with_sizes` — appeared
- `2025.7.1` → `2025.7.29`: 2 cosmetic, 2 new items
  - `read_file` — cosmetic change
      - was: `…Read the complete contents of a file from the file system. Handles various text encodings and provides detaile…`
      - now: `…Read the complete contents of a file as text. DEPRECATED: Use read_text_file instead.`
  - `read_text_file` — appeared
  - `read_media_file` — appeared
  - `list_allowed_directories` — cosmetic change
      - was: `…Returns the list of directories that this server is allowed to access. Use this to understand which directorie…`
      - now: `…Returns the list of root directories that this server is allowed to access. Use this to understand which direc…`
- `2025.7.29` → `2025.8.18`: 1 cosmetic
  - `list_allowed_directories` — cosmetic change
      - was: `…Returns the list of root directories that this server is allowed to access. Use this to understand which direc…`
      - now: `…Returns the list of directories that this server is allowed to access. Subdirectories within these allowed dir…`
- `2025.8.21` → `2025.11.25`: 14 breaking
  - `read_file` — breaking change
  - `read_text_file` — breaking change
  - `read_media_file` — breaking change
  - `read_multiple_files` — breaking change
  - `write_file` — breaking change
  - `edit_file` — breaking change
  - `create_directory` — breaking change
  - `list_directory` — breaking change
  - `list_directory_with_sizes` — breaking change
  - `directory_tree` — breaking change
  - `move_file` — breaking change
  - `search_files` — breaking change
      - was: `…les and directories matching a pattern. Searches through all subdirectories from the starting path. The search…`
      - now: `…les and directories matching a pattern. The patterns should be glob-style patterns that match paths relative t…`
  - `get_file_info` — breaking change
  - `list_allowed_directories` — breaking change
- `2026.1.14` → `2026.7.4`: 1 annotation
  - `move_file` — annotation change
      - hints: `{"readOnlyHint":false,"idempotentHint":false,"destructiveHint":false}` → `{"readOnlyHint":false,"idempotentHint":false,"destructiveHint":true}`
- `2026.7.4` → `2026.7.10`: 1 cosmetic, 13 annotation
  - `read_file` — annotation change
      - hints: `{"readOnlyHint":true}` → `{"readOnlyHint":true,"openWorldHint":false}`
  - `read_text_file` — annotation change
      - hints: `{"readOnlyHint":true}` → `{"readOnlyHint":true,"openWorldHint":false}`
  - `read_media_file` — cosmetic change
      - was: `…Read an image or audio file. Returns the base64 encoded data and MIME type. Only works within allowed director…`
      - now: `…Read a file and return it as a base64-encoded content block with its MIME type. Image and audio files are retu…`
  - `read_multiple_files` — annotation change
      - hints: `{"readOnlyHint":true}` → `{"readOnlyHint":true,"openWorldHint":false}`
  - `write_file` — annotation change
      - hints: `{"readOnlyHint":false,"idempotentHint":true,"destructiveHint":true}` → `{"readOnlyHint":false,"idempotentHint":true,"destructiveHint":true,"openWorldHint":false}`
  - `edit_file` — annotation change
      - hints: `{"readOnlyHint":false,"idempotentHint":false,"destructiveHint":true}` → `{"readOnlyHint":false,"idempotentHint":false,"destructiveHint":true,"openWorldHint":false}`
  - `create_directory` — annotation change
      - hints: `{"readOnlyHint":false,"idempotentHint":true,"destructiveHint":false}` → `{"readOnlyHint":false,"idempotentHint":true,"destructiveHint":false,"openWorldHint":false}`
  - `list_directory` — annotation change
      - hints: `{"readOnlyHint":true}` → `{"readOnlyHint":true,"openWorldHint":false}`
  - `list_directory_with_sizes` — annotation change
      - hints: `{"readOnlyHint":true}` → `{"readOnlyHint":true,"openWorldHint":false}`
  - `directory_tree` — annotation change
      - hints: `{"readOnlyHint":true}` → `{"readOnlyHint":true,"openWorldHint":false}`
  - `move_file` — annotation change
      - hints: `{"readOnlyHint":false,"idempotentHint":false,"destructiveHint":true}` → `{"readOnlyHint":false,"idempotentHint":false,"destructiveHint":true,"openWorldHint":false}`
  - `search_files` — annotation change
      - hints: `{"readOnlyHint":true}` → `{"readOnlyHint":true,"openWorldHint":false}`
  - `get_file_info` — annotation change
      - hints: `{"readOnlyHint":true}` → `{"readOnlyHint":true,"openWorldHint":false}`
  - `list_allowed_directories` — annotation change
      - hints: `{"readOnlyHint":true}` → `{"readOnlyHint":true,"openWorldHint":false}`

### memory

- `2025.8.4` → `2025.9.24`: 9 breaking
  - `create_entities` — breaking change
  - `create_relations` — breaking change
  - `add_observations` — breaking change
  - `delete_entities` — breaking change
  - `delete_observations` — breaking change
  - `delete_relations` — breaking change
  - `read_graph` — breaking change
  - `search_nodes` — breaking change
  - `open_nodes` — breaking change
- `2025.9.25` → `2025.11.25`: 9 breaking
  - `create_entities` — breaking change
  - `create_relations` — breaking change
  - `add_observations` — breaking change
  - `delete_entities` — breaking change
  - `delete_observations` — breaking change
  - `delete_relations` — breaking change
  - `read_graph` — breaking change
  - `search_nodes` — breaking change
  - `open_nodes` — breaking change
- `2026.1.26` → `2026.7.4`: 9 annotation, 1 new item
  - `create_entities` — annotation change
      - hints: `null` → `{"readOnlyHint":false,"destructiveHint":false,"idempotentHint":false,"openWorldHint":false}`
  - `create_relations` — annotation change
      - hints: `null` → `{"readOnlyHint":false,"destructiveHint":false,"idempotentHint":false,"openWorldHint":false}`
  - `add_observations` — annotation change
      - hints: `null` → `{"readOnlyHint":false,"destructiveHint":false,"idempotentHint":false,"openWorldHint":false}`
  - `delete_entities` — annotation change
      - hints: `null` → `{"readOnlyHint":false,"destructiveHint":true,"idempotentHint":true,"openWorldHint":false}`
  - `delete_observations` — annotation change
      - hints: `null` → `{"readOnlyHint":false,"destructiveHint":true,"idempotentHint":true,"openWorldHint":false}`
  - `delete_relations` — annotation change
      - hints: `null` → `{"readOnlyHint":false,"destructiveHint":true,"idempotentHint":true,"openWorldHint":false}`
  - `read_graph` — annotation change
      - hints: `null` → `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`
  - `search_nodes` — annotation change
      - hints: `null` → `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`
  - `open_nodes` — annotation change
      - hints: `null` → `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`
  - `knowledge-graph` (resource) — appeared

### everything

- `0.6.2` → `2025.1.14`: 1 new item
  - `printEnv` — appeared
- `2025.1.14` → `2025.3.19`: 1 new item
  - `annotatedMessage` — appeared
- `2025.3.19` → `2025.4.8`: 2 new items
  - `getResourceReference` — appeared
  - `resource_prompt` (prompt) — appeared
- `2025.7.1` → `2025.7.29`: 3 new items
  - `startElicitation` — appeared
  - `getResourceLinks` — appeared
  - `structuredContent` — appeared
- `2025.8.18` → `2025.9.12`: 1 removed
  - `startElicitation` — disappeared
- `2025.9.25` → `2025.11.25`: 1 new item
  - `zip` — appeared
- `2025.12.18` → `2026.1.14`: 1 cosmetic, 22 new items, 23 removed
  - `echo` — cosmetic change
  - `get-annotated-message` — appeared
  - `get-env` — appeared
  - `get-resource-links` — appeared
  - `get-resource-reference` — appeared
  - `get-structured-content` — appeared
  - `get-sum` — appeared
  - `get-tiny-image` — appeared
  - `gzip-file-as-resource` — appeared
  - `toggle-simulated-logging` — appeared
  - `toggle-subscriber-updates` — appeared
  - `trigger-long-running-operation` — appeared
  - `add` — disappeared
  - `longRunningOperation` — disappeared
  - `printEnv` — disappeared
  - `sampleLLM` — disappeared
  - `getTinyImage` — disappeared
  - `annotatedMessage` — disappeared
  - `getResourceReference` — disappeared
  - `getResourceLinks` — disappeared
  - `structuredContent` — disappeared
  - `zip` — disappeared
  - `simple-prompt` (prompt) — appeared
  - `args-prompt` (prompt) — appeared
  - `completable-prompt` (prompt) — appeared
  - `resource-prompt` (prompt) — appeared
  - `simple_prompt` (prompt) — disappeared
  - `complex_prompt` (prompt) — disappeared
  - `resource_prompt` (prompt) — disappeared
  - `architecture.md` (resource) — appeared
  - `extension.md` (resource) — appeared
  - `features.md` (resource) — appeared
  - `how-it-works.md` (resource) — appeared
  - `instructions.md` (resource) — appeared
  - `startup.md` (resource) — appeared
  - `structure.md` (resource) — appeared
  - `Resource` — disappeared
  - `Resource` — disappeared
  - `Resource` — disappeared
  - `Resource` — disappeared
  - `Resource` — disappeared
  - `Resource` — disappeared
  - `Resource` — disappeared
  - `Resource` — disappeared
  - `Resource` — disappeared
  - `Resource` — disappeared
- `2026.1.14` → `2026.1.26`: 1 new item
  - `simulate-research-query` — appeared
- `2026.1.26` → `2026.7.4`: 9 breaking, 4 annotation
  - `echo` — breaking change
  - `get-annotated-message` — breaking change
  - `get-env` — annotation change
  - `get-resource-links` — breaking change
  - `get-resource-reference` — breaking change
  - `get-structured-content` — breaking change
  - `get-sum` — breaking change
  - `get-tiny-image` — annotation change
  - `gzip-file-as-resource` — breaking change
  - `toggle-simulated-logging` — annotation change
  - `toggle-subscriber-updates` — annotation change
  - `trigger-long-running-operation` — breaking change
  - `simulate-research-query` — breaking change
  - `args-prompt` (prompt) — drift change

### sequential-thinking

- `2025.7.1` → `2025.11.25`: 1 breaking
  - `sequentialthinking` — breaking change
      - was: `…eration * Hypothesis verification - next_thought_needed: True if you need more thinking, even if at what seeme…`
      - now: `…eration * Hypothesis verification - nextThoughtNeeded: True if you need more thinking, even if at what seemed …`
- `2025.11.25` → `2025.12.18`: 1 cosmetic
  - `sequentialthinking` — cosmetic change
      - was: `…er as the final output 11. Only set next_thought_needed to false when truly done and a satisfactory answer is …`
      - now: `…er as the final output 11. Only set nextThoughtNeeded to false when truly done and a satisfactory answer is re…`
- `2025.12.18` → `2026.7.4`: 1 annotation
  - `sequentialthinking` — annotation change
      - hints: `null` → `{"readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false}`
- `2026.7.4` → `2026.8.31`: 1 breaking
  - `sequentialthinking` — breaking change

## Methodology (reproducible in one command)

1. For each stable version `V` of a server: install `V`, run `rugsnare scan` — the baseline pin of `{name, description, inputSchema}` + prompts + resources + behavioral annotations.
2. Install `V+1` over it (the silent upgrade an agent would get from `npx -y`), run `rugsnare diff`.
3. Every difference is classified deterministically: BREAKING (schema changed, e.g. a required param appeared), COSMETIC (prose reworded), ANNOTATION (behavioral hints flipped — compared through MCP spec defaults, where an absent `destructiveHint` means destructive). No LLM, no judgment calls.

```bash
bash repro/backtest-multi.sh   # ~20 minutes, four official servers, full history
```

*Coverage: complete — all 66 stable release pairs across the four servers were measured, zero skipped.*

## Why this matters

Your agent obeys tool descriptions. When a server changes a description, a schema, or a behavioral hint after you approved it, the agent's instructions change — silently. Scanners check once at install; `npx -y pkg@latest` re-rolls the dice on every launch. This report is what that looks like on the four servers everyone installs first.

---
*Generated 2026-10-03T09:24:23.477Z by `repro/backtest-multi.sh` + `repro/build-report.mjs` ( RugSnare v0.5.0, 66 pairs ). Zero dependencies, no telemetry, every number reproducible on your machine.*
