# Якорное событие + каналы: заготовки к запуску (50 звёзд, 2 недели)

Опора: план конверсии отработан (description/README/help/site — сделано 25.10). Здесь — тексты для публикации. Правило концентрации: HN + r/MCP + X-тред в ОДНО 48-часовое окно, вт-чт, ответы первый час.

## 1. HN — якорь (регулярный пост-ссылка, НЕ Show HN — оба Show HN уже использованы: 49945978, 50127659)

**Заголовок:** `We pinned every release pair of the top npm MCP servers and found 218 silent contract changes`
**Ссылка:** https://github.com/Paraphern/rugsnare/blob/main/audits/npm-top-mcp-drift-2026-10.md

**Первый комментарий автора (сразу после поста):**
> Method: pin the installed version's tool contracts (sha-256 over name/description/schema), run the update, diff, exit 1. One command per server, reproducible, verbatim quotes in the report.
>
> The short version: Azure DevOps (120k installs/wk) removed 75 tools across minor versions — the breaking-change warning shipped one version *after* the change ([#1448](https://github.com/microsoft/azure-devops-mcp/issues/1448) is the victims' thread). Currents shipped 37 BREAKING drifts, changelog never says "breaking". Hostinger injected agent-instruction resources in a week. Notion, Heroku and Context7 are the control group: zero drift — disciplined publishing exists.
>
> Most findings are process failures, not malice. That's the point: nobody notices the contract layer at all. The tool is Apache-2.0, zero deps, no telemetry. Happy to answer method questions; hostile review of the audit is welcome — every number has a one-command repro in the report footer.

## 2. r/MCP (тот же день, тот же 48ч-пул)

**Заголовок:** `218 silent contract changes in the top npm MCP servers — we pinned every release pair and diffed. Azure DevOps silently removed 75 tools between minors.`
**Тело:** 3 абзаца из HN-комментария + таблица топ-4 + ссылка на отчёт + «инструмент под этим — открытый, zero-dep» (не вести ссылкой на репо первым словом — правила саба).
**Тактика:** не кросспостить тот же текст в другие сабы в один день (фильтры уже кусали). Следующий саб (r/LocalLLaMA или r/ClaudeAI) — через 2–3 дня, другим текстом.

## 3. X-тред (8 твитов, тот же день)

1. `We pinned every release pair of the most-installed npm MCP servers and diffed the tool contracts your agent actually obeys. 218 silent changes. Nobody announced them. 🧵`
2. Azure DevOps: 75 tools GONE between minors. 120k installs/week. The warning shipped AFTER the breakage. Victims: issue #1448. [скрин из demo-drift.svg / таблицы]
3. chrome-devtools-mcp (1.7M installs/wk): 28 schema changes in 5 weeks + the file-write security story stopped matching across changelog/blog/behavior.
4. @currents/mcp: 37 BREAKING drifts. Changelog never says "breaking".
5. hostinger-api-mcp: agent-instruction resources injected into 265k installs/week — in one week.
6. Control group: Notion 0. Heroku 0. Context7 0. Fast-moving vendors with zero drift exist — this is a process gap, not fate.
7. Why it matters: tool descriptions are instructions your agent obeys but nobody reads. They change after you approve them. Version pinning doesn't help when the version string changes and nobody reads the diff.
8. So we open-sourced the layer that watches AFTER approval: pin contracts, fail CI on drift, zero deps, no telemetry. 218 receipts, one command each: github.com/Paraphern/rugsnare

## 4. Awesome-дожим (PR-тексты)

**Шаблон (подставить список):**
```
### RugSnare
> Pin MCP tool contracts by sha-256 and fail CI on silent drift after approval — 218 silent changes found in the npm MCP top (receipts + weekly follow-up in-repo).

- [Paraphern/rugsnare](https://github.com/Paraphern/rugsnare) — zero-dep CLI + CI gate, live proxies, canary replay, skills pinning; Apache-2.0.
```
Цели по приоритету: awesome-cybersecurity-agentic-ai (уже есть — проверить позицию), appcypher/awesome-mcp-servers, wong2/awesome-mcp-servers, security-подборки из mentions-actions. punkpeye уже смержен — не трогать.

## 5. Issue-ответы (шаблон, вклад-first)

```
<разбор конкретной боли из треда — 2-3 предложения по существу, без продукта>

We hit the same class while auditing the npm MCP top (218 silent contract changes; one-command repros): <ссылка на отчёт>. The piece that covers this exact case post-approval is contract pinning — `rugsnare scan` pins, `diff` fails CI, zero deps: <ссылка>. If it's useful I can PR a CI example for this repo.
```
Первая пятёрка тредов (по mentions-audit + дельте): microsoft/mcp#3674, ComposioHQ#1981, netdata#24296, PrefectHQ/fastmcp#5864, github/github-mcp-server#3466 («drift 124/131 + a pinning fix» — самый горячий).

## 6. Uneed
Зарегистрировать сейчас (очередь 1–5 мес — встать в неё): uneed.best/submit → категория Developer Tools; описание = number-hook; скрин demo-drift.

## Календарь двух недель
- Д1 (сделано): description/README/help/site/SVG-демо.
- Д3–4 (вт–чт): HN-якорь утром + r/MCP + X-тред; ответы каждый час первые 4 часа.
- Д5: если скорость звёзд >20/день — проверить GitHub Trending (ниша хватает 20–30/день).
- Д6–9: awesome-PRs ×3, issue-ответы ×5, Uneed.
- Д10–14: zh/ja-посты (juejin/v2ex + Qiita/Zenn) на базе того же отчёта; вторая волна issue-ответов из вечерних дельт.
