# B1: tamish560/awesome-mcp-security - PR

Лист: 3 звезды, живой (мержи 07.2026, awesome-lint комплаенс). Секция: Scanners and Auditors.
ПРЕФЛАЙТ перед PR: прочитать их CONTRIBUTING (если есть) и формат соседних строк в секции - вписаться точно.

## Строка для добавления (в Scanners and Auditors, по алфавиту на R)

```markdown
- [RugSnare](https://github.com/Paraphern/rugsnare) - pins MCP tool contracts (name, description, input/output schemas, annotations) with SHA-256 at approval and detects silent post-approval changes (BREAKING/NOTATION drift, rug pulls) in CI. Zero deps, 394 tests, on-chain release pins, ATR and OWASP ASI mappings.
```

## Тело PR (коротко, по правилу 3 строк)

```
Adds RugSnare to Scanners and Auditors.

It is a post-approval integrity layer rather than an install-time scanner:
approved tool contracts are hash-pinned and any silent change (description,
schema, annotations, new or removed tools) fails CI. Field audit data:
218 silent contract changes across the npm MCP top (Oct 2026), report at
github.com/Paraphern/rugsnare/blob/main/audits/npm-top-mcp-drift-2026-10.md

Apache-2.0, zero dependencies, maintained (v1.5.0 this week).
```

## Заметки
- Один чужой репозиторий в день: B1, B2, B1+(punkpeye) - в разные дни.
- Ответить на ревью-комментарии в течение суток.
