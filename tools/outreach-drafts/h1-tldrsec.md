# H1: tl;dr sec - питч Клинту Гиблеру

Каналы: clint@tldrsec.com (адрес из выпусков) или X @clintgibler (он реально отвечает). Формат: имя тула, ссылка, 2-4 предложения «какую боль решает для security-инженера», без маркетинга. Лучшее попадание из всех ньюслеттеров (AI security + supply chain - его регулярные секции).

## Мейл

Subject: `Tool for tl;dr sec: RugSnare - MCP contract pinning + drift CI gate (OSS)`

```
Hi Clint,

RugSnare (github.com/Paraphern/rugsnare) is an OSS supply-chain tool for the
MCP layer of AI agents: it pins approved MCP tool contracts (name,
description, input/output schemas, annotations) with SHA-256, then fails CI
when a server changes them silently after approval - the rug-pull /
bait-and-switch class that install-time scanners cannot see.

Why now: our October 2026 audit pinned and diffed the most-installed MCP
servers on npm - 218 silent contract changes, e.g. @azure-devops/mcp removed
75 tools across minor releases (victims in their issue #1448), @currents/mcp
shipped 37 breaking drifts with no "breaking" in the changelog, and
hostinger-api-mcp injected SKILL.md agent-skill resources unannounced.
Report (reproducible): github.com/Paraphern/rugsnare/blob/main/audits/npm-top-mcp-drift-2026-10.md

Zero dependencies, 394 tests, ATR and OWASP ASI mappings included, releases
pinned on-chain. Happy to send a one-paragraph version for the newsletter.
```

## Заметка
Один мейл, без follow-up спама; если тихо - X-вариант той же выжимки через 2 недели.
