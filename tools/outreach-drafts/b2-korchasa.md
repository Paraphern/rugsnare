# B2: korchasa/awesome-mcp - PR

Лист: 10 звёзд, активен (авто-коммиты 10.2026), RU-куратор (важно для Habr-ветки). Описание: tools, implementations, resources for MCP.

## ПРЕФЛАЙТ
Прочитать README-структуру и формат записей (у куратора свой вкус; скорее всего по-английски, список с описаниями).

## Строка-кандидат (в секцию tools/security - по их структуре)

```markdown
- [RugSnare](https://github.com/Paraphern/rugsnare) - pin MCP tool contracts by SHA-256, catch silent post-approval drift in CI; audit: 218 silent changes in npm MCP top (Oct 2026).
```

## Тело PR (EN) + RU-комментарий (куратору приятно, прецедент RU-ветки)

PR body:
```
Adds RugSnare to the security tools section: SHA-256 pinning of MCP tool
contracts, silent-drift detection in CI (exit codes, SARIF), live proxy mode.
Zero dependencies, Apache-2.0, v1.5.0 released this week.
```

RU-комментарий в PR:
```
Привет! Добавили наш инструмент - он пинит контракты MCP-тулов хэшами и
ловит молчаливые изменения после апрува (в CI падает сборка). В октябре
прогнали аудит топа npm MCP-серверов: 218 молчаливых изменений контрактов,
отчёт воспроизводим. Если формат записи не подходит под стиль списка -
скажите, поправлю.
```
