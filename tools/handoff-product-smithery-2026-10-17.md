# Хенд-офф продуктовому чату: Smithery через MCPB-бандл (2026-10-17)

## Что нужно

Упаковать `rugsnare mcp` (наш MCP-сервер, 2 тула: drift_feed_status + pins_report)
как MCPB-бандл и опубликовать на Smithery. Это последний крупный каталог после
Registry/Glama/mcpservers/MCP Directory/MCPMarket.

## Что такое MCPB

ZIP-архив с локальным MCP-сервером + manifest.json. Формат от Anthropic
(бывший DXT / Desktop Extensions). Клиенты (Claude Desktop и другие)
открывают .mcpb как one-click install. Спека: github.com/modelcontextprotocol/mcpb

## Структура бандла

```
rugsnare.mcpb (ZIP)
├── manifest.json          # ОБЯЗАТЕЛЬНО
├── server/
│   └── index.js           # entry point (наш mcp-server.js)
├── node_modules/          # npm install --production (у нас ZERO deps - будет пусто/минимально)
├── package.json
└── icon.png               # опционально
```

## manifest.json (шаблон)

```json
{
  "name": "rugsnare",
  "displayName": "RugSnare",
  "description": "Pin MCP tool contracts by sha-256, catch silent drift after approval",
  "version": "1.4.3",
  "author": { "name": "Paraphern" },
  "license": "Apache-2.0",
  "server": {
    "type": "node",
    "entry_point": "server/index.js"
  }
}
```

Полная спека манифеста: MANIFEST.md в репо modelcontextprotocol/mcpb.

## Как собрать

```bash
# CLI от Anthropic
npm install -g @anthropic-ai/mcpb
mcpb init    # создать manifest.json (заполнить вручную по шаблону выше)
mcpb pack    # собрать .mcpb (ZIP)
```

У нас zero npm dependencies - node_modules будет пустым или минимальным.
Entry point: наш MCP-серверный режим (`rugsnare mcp` / src/mcp-server.js).

## Как опубликовать на Smithery

```bash
# CLI Smithery
smithery mcp publish ./rugsnare.mcpb -n Paraphern/rugsnare
```

Нужен Smithery-аккаунт (регистрация через GitHub OAuth).

## Что нам даёт

Smithery - каталог с интеграцией в Cursor, Claude Desktop, VS Code.
Клиент устанавливает MCPB-бандл одним кликом -> наш drift_feed_status и pins_report
становятся доступными из GUI без CLI. Новая аудитория: пользователи, которые
не работают с терминалом.

## Приоритет

Средний. Не срочно (6 каналов уже живы), но Smithery - единственный оставшийся
каталог с one-click install для desktop-клиентов.

## Что могу сделать я (research chat)

- Подготовить manifest.json (текст готов выше)
- Проверить, что `rugsnare mcp` стартует корректно в изолированном окружении
- Прогнать тест после сборки бандла

Что нужно от вас:
- Собрать бандл (mcpb pack)
- Зарегистрироваться на Smithery
- Опубликовать (smithery mcp publish)
