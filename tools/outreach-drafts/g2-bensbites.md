# G2: Ben's Bites - мейл

Публичной формы нет. Каналы: shanice@bensbites.com, k@bensbites.com; Бен активен в X @bentossell. Их борд news.bensbites.co требует аккаунт - не наш путь в этой итерации.

## Мейл (один, короткий, без вложений)

Subject: `OSS tool story: catching MCP servers that rug-pull after approval`

```
Hi,

quick pitch for Ben's Bites. RugSnare (github.com/Paraphern/rugsnare) is an
open-source tool that treats AI-agent tool contracts like a supply chain:
it pins every approved MCP tool (description, schemas, annotations) with
SHA-256, and the build fails the moment a server silently changes them.

The founder started it after auditing the npm MCP top: 218 silent contract
changes in one month, including @azure-devops/mcp quietly removing 75 tools
in minor releases. Agents kept calling tools that no longer existed.

Zero dependencies, Apache-2.0, releases pinned on-chain. Live demo of a
rug-pull being caught in CI: github.com/Paraphern/rugsnare/pull/14

Worth a line in the newsletter? Happy to give the maker-story version too.
```

## Заметка
Аудиторию BB интересует стори основателя (молодой мейнтейнер, on-chain пины) - второй абзац это даёт.
