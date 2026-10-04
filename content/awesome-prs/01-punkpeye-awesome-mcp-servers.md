# PR в punkpeye/awesome-mcp-servers (95.8k звёзд)

Статус: ГОТОВ К ОТПРАВКЕ. Правила: нет минимума звёзд; скоуп «servers with a public
GitHub repository — something you install and run yourself» — мы проходим как
`rugsnare mcp` (реальный устанавливаемый MCP-сервер). Формат снят с живых записей.

## Точная правка (README.md, секция `### 🔒 Security`)

Вставить МЕЖДУ строками `panther-labs/mcp-panther` и `piiiico/proof-of-commitment`
(алфавит по owner/name, проверено по текущему main):

```
- [Paraphern/rugsnare](https://github.com/Paraphern/rugsnare) [![rugsnare MCP server](https://glama.ai/mcp/servers/Paraphern/rugsnare/badges/score.svg)](https://glama.ai/mcp/servers/Paraphern/rugsnare) 📇 🏠 - Pin MCP tool contracts by hash and catch silent drift, rug pulls and per-client bait-and-switch after approval, with a CI gate, live stdio/HTTP proxies, canary replay, call policies and on-chain release verification.
```

Проверено: 📇 = TypeScript (их легенда), 🏠 = self-hosted/local. Бейдж Glama —
наша страница существует (HTTP 200, https://glama.ai/mcp/servers/Paraphern/rugsnare).
Эмодзи ОС (🍎🪟🐧) НЕ включены: macOS нами не протестирована (CI ubuntu+windows),
не заявляем непроверенное.

## Заголовок PR

```
Add rugsnare 🤖🤖🤖
```

(Суффикс 🤖🤖🤖 — их собственный механизм fast-track для agent-made PR; наш PR
готовится агентом при прожиме владельцем, маркер честный. Если не хочешь маркировать — убери суффикс.)

## Тело PR

```
Adds rugsnare to the Security section (alphabetical: between panther-labs/mcp-panther and piiiico/proof-of-commitment).

RugSnare is an installable MCP server (`npx rugsnare mcp`, read-only tools:
drift_feed_status, pins_report) and a runtime integrity gateway: it pins tool
contracts (name/description/inputSchema) by sha-256, fails CI on silent drift
after approval, and ships live stdio + HTTP proxies with quarantine, canary
replay, call policies and on-chain release verification. Zero npm dependencies,
no telemetry. 238 tests.

Entry follows the existing format: repo link + Glama badge + legend emojis
(📇 TypeScript, 🏠 self-hosted) + one-line description.
```
