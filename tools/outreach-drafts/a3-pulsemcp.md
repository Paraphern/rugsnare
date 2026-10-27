# A3: PulseMCP - гость-питч (+ статус сабмита)

Статус (2026-10-22): сабмиты на паузе с 03.09.2026 («major upgrades»); рекомендация самого PulseMCP - публиковаться в Official MCP Registry, оттуда тянут автоматически. Значит: A1 первым, листинг придёт сам.

## Гость-пост питч (EN, через X @pulsemcp или их контакт-форму Work With Us - Guest Blogging)

Subject: Guest post with data: 218 silent contract changes in the npm MCP top

```
Hi PulseMCP team,

I run RugSnare (github.com/Paraphern/rugsnare), an OSS tool that pins MCP tool
contracts by SHA-256 and catches silent changes after approval. Over October
2026 we pinned every stable release pair of the most-installed MCP servers on
npm and diffed the contracts. Result: 218 silent changes. Highlights your
readers would recognize:

- @azure-devops/mcp: 75 tools removed across minor releases; the warning
  shipped one version AFTER the removal (victims in their issue #1448)
- @currents/mcp: 45 findings, 37 of them breaking drift, changelog never says
  "breaking"
- hostinger-api-mcp: SKILL.md agent-skill resources injected in a week of
  patch releases, unmentioned in docs
- Control group: notion, heroku, context7 servers show zero drift - so this
  is process discipline, not fate

Every number is reproducible with public commands (audit report:
github.com/Paraphern/rugsnare/blob/main/audits/npm-top-mcp-drift-2026-10.md).

Proposal: a guest post "How to check any MCP server for silent drift before
and after you update" - method, the dataset, what registry listings cannot
tell you, and a 5-minute recipe for readers. Pure data, tool mentioned last.

Would this fit your blog? Happy to adapt format/length.
```

## Заметки
- Тон: data-first, инструмент в хвосте (правило вклад-first).
- Ссылку на issue #1448 проверять на живость перед отправкой (префлайт).
