# Драфт: PR в OWASP AI Testing Guide

Два отдельных PR (маленький сначала - так мейнтейнеры легче принимают).

## PR №1: RugSnare в Suggested Tools (два файла, по одному буллету)

### Файл 1: Document/content/tests/AITG-APP-06_Testing_for_Agentic_Behavior_Limits.md
В конец блока `### Suggested Tools` (после Agentic Security Scanner):

```
- **RugSnare**: Pins MCP tool contracts (name, description, inputSchema) at approval and diffs every PR against the baseline - direction-graded findings (BREAKING / LOOSENED / EXPANDED), prompts and resources compared too, advisory scoring of changed descriptions - [Link](https://github.com/Paraphern/rugsnare)
```

### Файл 2: Document/content/tests/AITG-INF-01_Testing_for_Supply_Chain_Tampering.md
Блок `### Suggested Tools` там ТЕМАТИЧЕСКИЙ (категория: инструменты), поэтому
буллет добавляется новой категорией в конец блока (после «SBOM Generation»):

```
- **MCP Tool Contract Integrity:** [RugSnare](https://github.com/Paraphern/rugsnare) - pins tool contracts at approval (sha-256, Ed25519-signed store), gates CI on direction-graded drift, verifies releases against on-chain hashes; zero runtime dependencies
```

### Текст PR (title + body):

Title: `Add RugSnare to Suggested Tools (AITG-APP-06, AITG-INF-01)`

Body:
> RugSnare (Apache-2.0, zero runtime dependencies) pins MCP tool contracts at approval and diffs them on every change: direction-graded findings (BREAKING / LOOSENED / EXPANDED / NOTATION), prompts and resources compared with content hashing, advisory scoring of changed descriptions, Ed25519-signed pin store, on-chain release verification. A GitHub Action renders the diff as a PR comment (live example with three planted attacks: https://github.com/Paraphern/rugsnare/pull/14).
>
> Field evidence behind the tool references: a public 30-server drift corpus with per-server repro commands (https://github.com/Paraphern/rugsnare/tree/main/docs/servers) and a full OWASP mapping (ASI01-10, AITG, AISVS C09): https://github.com/Paraphern/rugsnare/blob/main/docs/OWASP-ASI-MAPPING.md

## PR №2: новый тест AITG-APP-15 — Testing for MCP Tool Contract Drift

(Номер APP-15 - следующий свободный после APP-14; финальную нумерацию оставить мейнтейнерам.)
Новый файл Document/content/tests/AITG-APP-15_Testing_for_MCP_Tool_Contract_Drift.md
по структуре существующих тестов + строка в 3.1_AI_Application_Testing.md и ToC.

````markdown
# AITG-APP-15 – Testing for MCP Tool Contract Drift

### Summary
MCP tool descriptions are instructions the agent obeys, and tool input schemas are
the contract every caller is built against. Both can change after approval - by
release, by dependency resolution, or by compromise - with no changelog obligation
and no failure until call time. This test verifies that what a server serves at
`tools/list` time still matches what was approved.

#### Tools
MCP servers (stdio or HTTP), a pin/diff tool such as RugSnare, CI integration.

#### Design considerations for AI agents and tools
- A pinned version is not a frozen contract: transitive dependencies (e.g. a zod
  minor) can rewrite schemas inside the same server version.
- Tool renames silently de-authorize allow-lists keyed on tool names even when
  contracts are unchanged.
- Description-only changes are still instruction changes for the agent.

### Test Objectives
- Confirm the tool surface (names, descriptions, input schemas - and prompts and
  resources where served) is byte-identical to the approved baseline.
- Grade any difference by direction: BREAKING (tightened/required-added/removed),
  LOOSENED, EXPANDED (new optional parameters = new capability surface), notation.
- Detect identity drift: same contracts served from a different build, version or
  entry point than approved.

### How to Test/Payloads
1. At approval time, pin every tool contract: `rugsnare scan --config mcp.json`,
   commit the signed pin store.
2. On every upgrade / PR / scheduled check: `rugsnare diff --config mcp.json`
   (exit 1 on drift; a GitHub Action renders the diff as a PR comment).
3. Review graded findings: BREAKING/LOOSENED require a decision; NEW/REMOVED tools
   require re-approval; notation/cosmetic may be acknowledged.
4. Score changed descriptions for attack patterns (hide-from-user instructions,
  credential lures, exfiltration carriers) independent of the structural grade.

### Expected Output
Per-tool verdicts with before/after text for every changed contract, a direction
grade, and one identity verdict per server. Zero findings = byte-stable surface.

### Real Example
Public 30-server corpus (October 2026): 25 of 28 watched npm-distributed MCP
servers showed at least one tool-contract change across verified version windows,
13 with schema-level tightenings or loosenings. Single worst window: a reference
server with 8 BREAKING schema tightenings across one upgrade; another whose tool
surface turned over 100% (3 -> 10 tools) with changelogs covering additions but
never retirements. Repro commands per server:
https://github.com/Paraphern/rugsnare/tree/main/docs/servers

### Remediation
- Pin server versions exactly; treat the tool contract as the approval artifact.
- Gate CI on contract drift (fail on BREAKING/LOOSENED, alert on the rest).
- Re-approve deliberately: `rugsnare approve` updates the baseline; never silently.
- Record resolved dependency versions alongside the pin (dependency drift rewrites
  schemas inside an unchanged server version).

### Suggested Tools
- **RugSnare**: pins MCP tool contracts at approval, diffs every change with
  direction grading, advisory scoring and signed baselines -
  [Link](https://github.com/Paraphern/rugsnare)

### References
- PIN-SPEC: an open pin format for MCP tool contracts -
  https://github.com/Paraphern/rugsnare/blob/main/docs/PIN-SPEC.md
- OWASP Top 10 for Agentic Applications: ASI02, ASI04 -
  https://genai.owasp.org/resources/
````

## Ньютанс-заметки

1. PR №1 сначала: два буллета + линк на маппинг - минимальный порог входа.
2. PR №2: номера теста и попадание в ToC - на усмотрение мейнтейнеров (так и написать в body).
3. Все цифры PR №2 выверены: 25/28, 13, 8 BREAKING (filesystem), 3->10 (netlify),
   «additions documented, retirements never» - из опубликованных страниц корпуса.
4. Сабмитить от аккаунта Paraphern; в body не заявлять OWASP-эндорсмент (маппинг уже
   содержит дисклеймер).
