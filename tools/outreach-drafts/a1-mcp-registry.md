# A1: Official MCP Registry - runbook

Источник правил: modelcontextprotocol.io/registry/quickstart (проверено 2026-10-22). Процесс через CLI `mcp-publisher`, НЕ через PR.

## Что уже готово
- server.json в корне и product/ - схема 2025-12-11, name `io.github.Paraphern/rugsnare`, version 1.5.0, npm-пакет `rugsnare` (public).
- npm-пакет опубликован (rugsnare@1.5.0).

## Шаги

1. Добавить в product/package.json маркер владения (если его нет - ПРОВЕРИТЬ перед стартом):
   `"mcpName": "io.github.Paraphern/rugsnare"`
   (имя должно совпадать с name в server.json; публикуем новую npm-минорку с этим полем)
2. Установить CLI mcp-publisher: Windows - бинарник из github.com/modelcontextprotocol/registry/releases (brew для mac).
3. `mcp-publisher init` - сверить сгенерированный server.json с нашим (расхождения решить в пользу их генератора, но сохранить description-хук).
4. `mcp-publisher login` - GitHub OAuth по device-code. ТОЧКА ЮЗЕРА: нужен твойdevice-код ввод на github.com/login/device от аккаунта Paraphern.
5. `mcp-publisher publish` - публикация автоматическая, модерация пост-фактум.
6. После публикации: проверить карточку на registry.modelcontextprotocol.io, зафиксировать ссылку в outreach-status.md.

## Опционально (бейджи)
- Верификация version/website через registry API - после первой публикации.
- Кастомный домен вместо io.github.* НЕ нужен (DNS-верификация лишняя).

## Разблокирует
- A2 GitHub MCP Registry: тянет из Official Registry автоматически; далее при желании discussion в github/github-mcp-server Q&A («please review and onboard»).
- A3 PulseMCP: сабмиты на паузе, тянут из Official Registry сами.
