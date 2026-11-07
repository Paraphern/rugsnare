# Uneed — комплект подачи RugSnare (2026-10-26)

Подача: https://www.uneed.best/submit-a-tool (вставить URL — ИИ сам заполнит, потом доредактировать)
Как работает: uneed.best/how-it-works · Гайд: uneed.best/launch-guide
Категория: **Development** · Опция запуска: **Join the line (free)** — встать в очередь сегодня.

---

## Поля подачи (копипаста)

**Product URL:** `https://rugsnare.com`

**Name:** RugSnare

**Tagline (≤60 знаков, number-hook):**
```
218 silent contract changes in the npm MCP top. Pin contracts, fail CI on drift.
```

**Short description / about:**
```
RugSnare pins the MCP tool contracts you approved and fails your CI the moment they drift after approval. Scanners check servers before you connect them; RugSnare watches what happens after — an approved tool whose description silently changed is a rug pull.

In an October 2026 field audit, 218 silent contract changes were found across the most-installed MCP servers on npm — not one announced in a changelog. Every finding is a public receipt with a one-command repro. The method is independently validated: a registry-scale third-party capture matched 25 of 34 of our pinned versions field-by-field.
```

**Full description (если отдельное поле):**
```
- rugsnare scan --config .mcp.json — pin the contracts you approved
- rugsnare diff  --config .mcp.json — exit 1 the moment anything drifts
- Direction-graded findings: BREAKING / LOOSENED / NEW / GONE / annotation flips
- Live stdio/HTTP proxy: catches UNDECLARED tools and result injection at call time
- Signed receipts (Ed25519 hash-chain), canary record/replay, on-chain release verification (Base)
- Zero dependencies, no telemetry, Apache-2.0. Works as a GitHub Action (one line in CI).
```

**Tags:** Open Source · AI · Developer Tools · Security

**Media:**
1. GIF: docs/demo-drift.gif (1520×792, 355 KB — полный сценарий ok → DRIFT → NEW → exit 1)
2. Логотип: site assets logo-128.png
3. Фолбэк-статика: docs/demo-drift.svg

---

## День запуска (когда придёт дата)

- Цель: **score ≥ 20** (≥10 остаться, ≥20 do-follow). Голоса взвешенные — хватит ~7–10 человек.
- Первый комментарий на карточке (наш, сразу после публикации):

```
The receipts behind the number: we pinned the most-installed MCP servers on npm, ran every update, and diffed. 218 silent contract changes — azure-devops/mcp: 110 findings incl. 75 tools removed between minor versions; @currents/mcp: 37 quiet BREAKING schema tightenings while the changelog said nothing. Every row links a public page with a one-command repro. And the GIF above is the whole product: two [ok], one [DRIFT], one [NEW] shadow tool, exit 1 — CI fails.
```

- Мобилизация (в первые часы): X-тред (готов в launch-anchor-drafts), наш HN-аудитор, треды где нас цитируют, Telegram-канал.
- Отзывы на карточку: попросить 2–3 человек из GitHub-диалогов (github-mcp-server, anthropics/skills).

## Решения по ходу

- Дата из free-очереди попадёт на нашу HN/zh-волну → оставить как есть. Захочется синхронизировать с релизом → Fast-track $14.99 (~14 дней) или Skip the line $39.99 (своя дата, do-follow навсегда).
- Premium Spot $197 / Newsletter $249 — не раньше 500★.
- После запуска: карточка обновляется бесплатно; через 2–3 месяца Relaunch $15 под крупный релиз.
