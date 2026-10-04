# PR в corca-ai/awesome-llm-security

Статус: ГОТОВ К ОТПРАВКЕ. Правила: «just submit a pull request», Awesome Manifesto,
минимумов нет явно. Формат секции Tools: `- [Name](url): description` + звёздный
бейдж (бейдж ставят почти всем; наш покажет реальные 3 — не скрываем).

## Точная правка (README.md, секция `## Tools`)

Порядок в секции рыхлый (не строгий алфавит): …Plexiglass, PurpleLlama, Rebuff…
Вставить ПОСЛЕ `PurpleLlama`, ДО `Rebuff`:

```
- [RugSnare](https://github.com/Paraphern/rugsnare): runtime integrity for MCP tool contracts - pin by hash, catch silent drift and rug pulls after approval via CI gate, live stdio/HTTP proxies and canary replay ![GitHub Repo stars](https://img.shields.io/github/stars/Paraphern/rugsnare?style=social)
```

## Заголовок PR

```
Add RugSnare: runtime integrity for MCP tool contracts
```

## Тело PR

```
Adds RugSnare to the Tools section (after PurpleLlama, before Rebuff).

RugSnare pins MCP tool contracts (name, description, inputSchema) by sha-256
and detects silent changes after approval: CI gate (exit 1 on drift), live
stdio/HTTP proxies with quarantine, canary record/replay, chameleon detection
(per-client contract switching), Ed25519-signed pin store, on-chain release
verification. Zero dependencies, local-only, no telemetry.

Format follows the existing entries (name link + colon description + star badge).
```
