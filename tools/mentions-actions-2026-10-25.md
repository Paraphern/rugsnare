# Аудит упоминаний → план действий (принято в работу 2026-10-25)

Вход: [mentions-audit-2026-10-25.md](mentions-audit-2026-10-25.md). Спот-проверка аудита + исследования + исполнение.

## ⚠️ Поправка к аудиту (важно)

**Звёзды репо: 4 (четыре), не «1.5k+»** — проверено API сейчас же (stars: 4, forks: 2, pushed 2026-10-25). Остальное сходится: npm **2107 загрузок/мес**, [punkpeye PR #15692](https://github.com/punkpeye/awesome-mcp-servers/pull/15692) смержен 2026-10-18, v1.5.0.
Следствие: вывод аудита «порог звёзд для подборок пройден» — **не подтверждён**. Аутрич-угол для подборок меняю с «мы популярны» на «у нас есть то, чего нет у списка»: публичные receipts (218-аудит, 140 findings по официальным серверам), zero-dep, on-chain-пины, ATR/OWASP-маппинг, живой drift-feed. Просить не «добавьте нас, мы классные», а «ваш список не покрывает пост-эппрувальную фазу — вот верифицируемый недостающий слой».

## Действие (а): Smithery — исправление (выполнимо сегодня)

Проверено: карточка [smithery.ai/server/paraphernal/rugsnare](https://smithery.ai/server/paraphernal/rugsnare) существует под битым owner `paraphernal`, 0 deployments, метаданные пустые. Нюанс: Smithery баннерит, что их MCP-Proxy и managed identity **закрываются 31 октября** — карточка всё равно нужна как гигиена имени.

Шаги (нужен логин владельца Paraphern):
1. Залогиниться на smithery.ai через GitHub (аккаунт Paraphern).
2. Опубликовать корректную карточку: `smithery mcp publish "https://rugsnare.com/api/mcp" -n Paraphern/rugsnare` (наш `rugsnare mcp` — read-only stdio; для URL-хостинга поднять HTTP-эндпоинт `rugsnare run --url ... --port`, он уже умеет Streamable HTTP) ИЛИ `.mcpb`-бандл (`v1.5 Smithery bundle` уже готов в релизе).
3. Написать в support/Discord Smithery: удалить/перенаправить битую `paraphernal/rugsnare`.
4. После фикса — проверить mcpnav.dev (сейчас 404) и приживить ссылку в README рядом с Glama-бейджем.

## Действие (б): подборки MCP-security — цели и каналы

Найдены URL (включая две подоборки вне аудита — Pomerium и ReVerb, и третью Reco):

| Подборка | URL | Канал | Угол |
|---|---|---|---|
| Aembit Top-9 | [aembit.io/blog/top-9-...](https://aembit.io/blog/top-9-mcp-security-platforms-and-gateways-in-2026) | коммент к посту / контакт авторов | их список = гейтвеи; мы — post-approval integrity; взаимодополняющие |
| Pomerium Top-5 gateways | [pomerium.com/blog/...](https://www.pomerium.com/blog/top-5-agentic-gateways-for-securing-mcp-tool-calls-in-2026) | коммент | то же |
| ReVerb Top MCP Security Tools | [reverbico.com/blog/top-mcp-security-tools](https://reverbico.com/blog/top-mcp-security-tools) | контакт редакции | у них есть категория scanners — просим отдельную категорию «post-approval drift» |
| TrueFoundry Best MCP Security Tools | [truefoundry.com/blog/best-mcp-security-tools](https://www.truefoundry.com/blog/best-mcp-security-tools) | коммент | enterprise-угол: CI-gate + receipts |
| Reco 5 Platforms | [reco.ai/compare/mcp-security-tools](https://www.reco.ai/compare/mcp-security-tools) | compare-платформа — подача карточки | сравнимые фичи + наш free/oss |
| CSA research note | [labs.cloudsecurityalliance.org](https://labs.cloudsecurityalliance.org/research/csa-research-note-mcp-security-crisis-20260504-csa-styled) | комментарии/участие в WG | сослаться нашей OWASP-таблицей как практическим дополнением |
| Microsoft Inside Track | [microsoft.com/insidetrack/...](https://www.microsoft.com/insidetrack/blog/protecting-ai-conversations-at-microsoft-with-model-context-protocol-security-and-governance) | коммент (низкий шанс) | наш аудит поймал azure-devops/mcp — 110 silent changes; предложить CI-gate |
| Akto | [akto.io/mcp-security](https://www.akto.io/mcp-security) | НЕ подача — конкурент | мониторить; контр-позиция уже в дельта-машине |
| Astrix State of MCP | [astrix.security](https://astrix.security/learn/blog/state-of-mcp-server-security-2025) | контакт исследователям | наш 218-аудит как данные для их следующего отчёта |
| Integrate.io / MCP Manager / Tech Insider / SecureW2 | URL уточнить перед подачей | контакт форм | тот же angle |

Материал для питча (один на все): «Ваш список покрывает scan-at-install и gateway-at-runtime. Третья фаза — ПОСЛЕ одобрения (silent drift) — не покрыта никем в списке; у нас публичные receipts: [аудит 218 изменений](https://github.com/Paraphern/rugsnare/blob/main/audits/npm-top-mcp-drift-2026-10.md), 140 findings у 4 официальных серверов, воспроизводимо одной командой».

## Действие (в): «обновите данные» — черновики

**IANUA (research/2026-10-09, score 1 «3 stars, no independent validation»):**
> Спасибо за разбор. Данные устарели: с 09.10 вышли v1.1–v1.5 (skills-пиннинг, whole-history scanning, PIN-SPEC, ATR/OWASP-маппинг), независимая валидация появилась — punkpeye/awesome-mcp-servers (Security-секция, PR #15692), полевой аудит топа npm (218 silent changes, репро-команды в отчёте), on-chain ReleaseLog. Если будете обновлять матрицу — свежие факты здесь: [ссылки]. Поймали расхождение в собственной таблице — скажите, поправим PR-ом.

**Derekwang2002/ai-intelligence (filtered out за 3 stars):** та же фактура, короче, вклад-first (сначала что-то полезное их проекту, потом «кстати актуализируйте фильтр»).

## Тёплые контакты из аудита (приоритет перед холодным аутричем)

Секция B аудита даёт авторов чужих issues с rugsnare — это готовые адвокаты: @conniey (microsoft/mcp#3674 — CI-гейт!), @chenhz01 (ComposioHQ#1981), @sc-si (netdata#24296), @BlueX888 (fastmcp#5864), @mvanhorn (diagram-design#189, сам автор last30days-skill), @comicchang (magpie#3109), @sofianbll (bifrost#8639), @arxdsilva (prest#1064), участники anthropics/skills#492. Действие: в каждом треде — содержательный апдейт по существу их боли + ссылка на свежую фичу, решающую её (не «посмотрите rugsnare», а «в v1.5 ровно это: …»).

## Машина обновлена

- `delta-sweep.sh` + `delta-report.js` теперь ловят **упоминания rugsnare сторонними авторами** (issues «rugsnare» за окно, минус наши репо) — секция «🔔 Упоминания» в каждом вечернем отчёте 21:00. Аудит упоминаний больше не разовый — он непрерывный.

## Неанглоязычное белое пятно (из вывода №2 аудита)

Habr/Qiita/Zenn/juejin/v2ex/oschina — ноль. У нас уже есть zh/ja install-гайды. Минимальный план: (1) адаптировать пост «218 silent changes» в zh (juejin/v2ex) и ja (Qiita/Zenn) с локальными примерами (jadchene 359 findings уже резонирует в zh-сообществе); (2) телеграм-канал t.me/rugsnare оживить дельта-находками (контент уже генерится машиной).

## Чек-лист исполнения
- [ ] Smithery: publish под Paraphern + тикет на удаление paraphernal (нужен ваш логин)
- [ ] 3 первых коммента в подборки (Aembit, ReVerb, TrueFoundry) — черновики выше
- [ ] IANUA + ai-intelligence нуджи
- [ ] 5 тёплых тредов (microsoft/mcp#3674 первым)
- [ ] zh/ja посты
- [ ] Telegram-канал
