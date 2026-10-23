# B1+: punkpeye/awesome-mcp-servers (96.7k звёзд) - PR

Главный курируемый список MCP-серверов, активен (push 2026-10-18). Нас там НЕТ (код-поиск 2026-10-22 пуст; wong2-версия handoff не подтвердилась). В репо есть tools/awesome-insert.mjs с верифицированным местом вставки (repo=punkpeye) - ИСПОЛЬЗОВАТЬ ЕГО.

## ПРЕФЛАЙТ (обязателен, лист огромный и строгий)
1. Прочитать CONTRIBUTING.md punkpeye/awesome-mcp-servers: у них свой формат записей (по алфавиту, описание одной строкой, есть требования к описанию без маркетинга).
2. Посмотреть 2-3 свежепринятых PR - какой формат проходит.
3. Проверить, что наш mcp-режим проходит их определение сервера (npm-пакет со stdio-сервером - да, server.json есть).

## Строка-кандидат (адаптировать под их точный формат на месте)

```markdown
- [RugSnare](https://github.com/Paraphern/rugsnare): 🔒 pin MCP tool contracts by SHA-256 and catch silent post-approval changes (drift, rug pulls) in CI, with audit data on the npm MCP top.
```

(эмодзи-маркер - только если у них принят такой стиль; иначе без)

## Тело PR

```
Adds RugSnare, a contract-integrity server/CLI for MCP: pins approved tool
contracts (SHA-256) and fails CI when a server changes them silently.
Motivation: our Oct 2026 audit of the npm MCP top found 218 silent contract
changes (report linked in repo). Apache-2.0, zero deps, actively maintained
(v1.5.0 this week).
```

## Альтернативный заход (из tools/rugsnare-growth-targets.md, стратегический)
Предложение кураторам: маркер drift-checked у записей, проверенных через rugsnare history (публичный архив rugsnare.com/scans). Это сильнее одной строки, но требует диалога - поднять после того, как обычный PR примут.
