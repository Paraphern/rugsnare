# Конкурентная разведка: AAtomless и GautamTalksDev/mcp-pin (2026-10-11)

## AAtomless (Mike) - хирург с данными

Тактика: редкие точечные выстрелы по мега-вендорам, каждый с уникальными данными.
- 2026-10-09, ТРИ issue за день:
  - github/github-mcp-server #3466 (OPEN): "124 of 131 definitions changed in v2.0.0 (data + a pinning fix)". Предлагает per-release таблицы с v1.14.0 + "two-tier pinning scheme" (полезное/косметическое - упрощённый аналог нашей градировки). Паттерн: "I have X, reproduced independently twice. If useful, I can post both here." Мейнтейнеры молчат; единственный коммент - наш (независимое подтверждение 123/131). PR не прикладывал.
  - getsentry/toolkit #1454 (CLOSED NOT_PLANNED): "43 of 54 changed in 0.38.0" + "4 in 0.39.0, 5 in 0.40.0, 2 in 0.41.0. Каталог вырос 32 -> 66 инструментов с мая" (он меряет HOSTED-поверхность, 54 инструмента, не npm-канал). Ответ dcramer (ОСНОВАТЕЛЬ Sentry): "Are you asking people to stop changing software? Not interested." Закрыто. Mike скорректировал фрейм в ответе (changelog-строка, не "не меняйте"), но поезд ушёл.
  - supabase/mcp #464 (OPEN): "most stable tool definitions we've measured" + один флаг (0.13.0 safety-язык в execute_sql). Без реакции.
- Кросс-серверная метрика: "same counting rule as github-mcp-server, so the numbers compare across servers".

## GautamTalksDev - дистрибуционная машина (mcp-pin)

Продукт: "A local proxy that blocks tool drift, and a public log that remembers every version" - ЛОКАЛЬНЫЙ ПРОКСИ + ПУБЛИЧНЫЙ ЛОГ. 0.2.2, MIT, JS, 0 зависимостей, активен (пуш сегодня). Это лоб в лоб с rugsnare (прокси + трекер + пины), его козырь - распределение.

Каналы (все живые, из README-бейджей):
1. mcpservers.org (листинг)
2. Glama (листинг + скор-бейдж)
3. GitHub Marketplace Action (CI-дистрибуция!)
4. MCP Registry - registry.modelcontextprotocol.io (ОФИЦИАЛЬНЫЙ реестр!)
5. Claude Code plugin (plugins/mcp-pin + install)
6. Cursor/VS Code/Windsurf через страницу установки на сайте
7. Cline и агенты - llms-install.md (инструкция по установке, НАПИСАННАЯ ДЛЯ АГЕНТА - агент читает и ставит сам)
8. YouTube 7-мин демо ("including the two bugs I shipped" - честность как маркетинг)
9. "Spot the rug pull" - интерактивная 60-сек игра (7 инструментов, keep-or-block) - виральный демо-квиз
10. Публичный лог: per-server страницы (mcp-pin.gautamkhosla.com/servers/<hash>.html), линкуются из issue
11. awesome-copilot "[External Plugin]: mcp-pin" (github/awesome-copilot #4539, OPEN) - канал Copilot-экосистемы
12. 2026-09-02: массовая заброска "A public record of X's tool definitions over time" по 12+ репо (exa, tavily, kubernetes, git-mcp, hostinger, jira, figma-console, currents, igniteui, opencode, searxng, ssh). В currents закрыт COMPLETED после его follow-up: 35-сек видео-воллкру + "a real change it caught on day one".

Факт для P2-стратегии: он пишет, что Visual Studio 18.7 (июнь 2026) Нативно сравнивает контракты при старте и спрашивает перед запуском - прецедент нативного пиннинга в крупном клиенте, полезно для позиционирования.

## Что брать у них (наши действия)

От Gautam:
- ДИРЕКТОРИ-БЛИЦ: мы застряли на одном punkpeye-списке (ждём Glama). Добавить: MCP Registry (официальный), mcpservers.org, GitHub Marketplace (у нас уже есть PR-diff Action - готовый кандидат), awesome-copilot. Это четыре параллельных канала вместо одного.
- llms-install.md: установка, которую исполняет сам агент. Дешёво, идеально нашей аудитории.
- "Spot the rug pull" игра: у нас есть corpus/ - готовый корм для 60-сек квиза keep-or-block. Виральный демо той самой мышцы, которую автоматизирует rugsnare.
- Видео-пруфы как follow-up в вендорских тредах: 30-сек запись rugsnare diff (Netlify/MongoDB) как вторая волна в наших issue.
- Per-server публичные страницы из weekly-данных (GitHub Pages, статика): чеки в issue получают постоянные URL.
- Честность как маркетинг ("two bugs I shipped") - наш стиль, продолжать.

От AAtomless:
- Кросс-серверная сопоставимая метрика в weekly-репорте ("same counting rule across servers").
- Паттерн "данные + оффер глубины по запросу" - у нас уже есть в драфтах, сохранить.
- ГЛАВНЫЙ УРОК (его поражение): никогда не открывать фреймом "N из M изменилось" - основатель прочитал как "перестаньте менять софт". Открывать конкретным сломанным вызывающим + действенный ask. Проверить наши драфты: Netlify открывается операцией env-vars (ок), MongoDB - открыть с "caller с limit:150 был валиден вчера и невалиден сегодня", не с "все 20 схем".

## Последствия для нашей пятёрки

- SENTRY - УБИТ ОКОНЧАТЕЛЬНО: тема закрыта основателем NOT_PLANNED 9 окт; наш issue выглядел бы релитигацией отказа. Драфт в архив.
- Замена №5: CURRENTS (Gautam's тред там закрыт COMPLETED, его угол - рекорд-оффер; наш - 45 находок + "changelog never says breaking" - другой, конкретный ask).
- Netlify: ЧИСТО (никто не отметился) - наш эксклюзив.
- MongoDB: ЧИСТО (есть чужой security-аудит 1470 CLOSED, не дрейфт).
- LaunchDarkly: наш. Hostinger: Gautam #67 открыт - план добавления в силе.

## Наблюдение за ними (продолжать)

- mcp-pin: реди релизы (0.2.2, темп недельный), фичи сближаются (session-long checks ~ наш live proxy; team lockfile ~ наши закоммиченные пины; package pinning).
- AAtomless: ждёт реакции на #3466; если гитхаб-мейнтейнеры попросят таблицы - он опубликует scheme; наш коммент-подтверждение там уже стоит.
- awesome-copilot: его сабмит OPEN - посмотреть, как проходит ревью, скопировать формат для нас.

## Дистрибуция: статус каналов (2026-10-11, вечер)

- MCP Registry (официальный): ОПУБЛИКОВАНО - io.github.Paraphern/rugsnare v1.1.0 живая (проверено API /v0/servers/.../versions). Неймспейс с заглавной P (из GitHub-логина дословно, регистр критичен). Републикация 1.2.0 одной командой: C:\tmp\mcp-pub\mcp-publisher.exe publish C:\GlobalWork\server.json (бинарь v1.8.1, логин сохранён).
- GitHub Marketplace: ОПУБЛИКОВАНО - github.com/marketplace/actions/rugsnare-pr-diff, категория Security, экшен в отдельном репо Paraphern/rugsnare-pr-diff (action.yml в корне - требование маркетплейса), теги v1.0.0+v1 на коммите 13ccb8f, дефолт rugsnare-ref запинен на v1.1.0. Лимит описания < 125 символов.
- awesome-copilot: В РЕВЬЮ - github/awesome-copilot#4882 (SHA 82650f08).
- mcpservers.org: ЖИВОЙ листинг (сабмит юзера), автопул README с HEAD.
- punkpeye awesome-mcp-servers: в списке (PR смержён ранее), ждём Glama-скан.
- Docker-хаб и Smithery (каналы Gautam): НЕ ЗАКРЫТЫ, взяли паузу.

Итог блица: четыре параллельных канала вместо одного - сделано за один день.

## Enterprise-сканеры скиллов (2026-10-12): частичные конкуренты, валидаторы рынка

- NVIDIA/SkillSpector, 19946★: скилл-сканер (64 паттерна). PR #498 (+10298 строк, в ревью у NVIDIA
  rng1995, CHANGES_REQUESTED x2, живой) встраивает пин-стор (sha-256+SQLite+version history),
  security-diff Regression Engine (risk/grade delta + BLOCK), policy-as-code. ВЫВОД: skills
  pin/diff-уникальность истекает на корпоративном конце (недели). Наше незанятое ядро:
  MCP TOOL-контракты, chameleon/per-client, дрейф-фид по популярным серверам, cold-start MCP-аудит.
- cisco-ai-defense/skill-scanner, 2592★: статический скилл-сканер; из смежного - флаг незапиненных
  зависимостей в манифестах скиллов (#133) - про package.json скилла, НЕ про npx в MCP-конфигах.
- Пересечение с нами - только advisory-слой (A-сигналы); в нём с ними не тягаться и не нужно.
  Позиционирование подтверждено: вести пин/дрейф/CI-гейт MCP-контрактов, не "сканер паттернов".
- 2026-10-12: peer-коммент на PR #498 (issuecomment-6114568265): два выстраданных урока
  (канонизация хэша; рекурсивная градация по направлению) + оффер фикстур (benign corpus,
  docs/servers). Помощь контрибьютору, не оппозиция. Ждать реакции rng1995/KodeCharya.

## Тренд недели (2026-10-12): скиллы уходят в remote, integrity не забирает никто

- Cloudflare Agents/Think: skills.r2() (R2 в рантайме) + SkillSource с deterministic fingerprint
  (design/skills.md), в планах Git-backed источники. NVIDIA PR#498 - пины, но статические.
  Vercel skills.sh - реестр со снапшот-аудитами (наш hash-keyed proposal в #2359). Microsoft azure-skills
  - синк-зеркало. ВСЕ строят распространение; approval-vs-runtime разрыв растёт; наш слой становится
  структурнее, не опциональнее. Watch: design/skills.md evolution, Git-backed sources landing.

## НОВЫЙ КОНКУРЕНТ (2026-10-12, волна 6): rufat325/heldfast - СЕРЬЁЗНЫЙ

- Кто: соло (rufat325), репо создано 2026-09-17 (3.5 недели), 1★, PyPI, Apache-2.0.
- Продукт: (1) публичный опечатанный дневной лог контрактов 29 458 серверов официального
  MCP-реестра (9 712 npm + 19 746 hosted), за первую неделю 12 775 изменений, грейд quiet/review
  (66 review, из них 58 = "введение платы" - интересный класс сигнала); (2) пин, "отказывающийся
  от вызова при изменении" (наш failMode/proxy-коридор). Читает hosted как анонимный клиент раз в 4ч.
- Ходит по шлюзам с питчем: IBM mcp-context-forge#7082 (занял тред, как AAtomless в supabase) -
  предлагает digest при регистрации + "changed N days ago" + платный enterprise-фид на 30 дней.
- ЕГО Козыри: охват hosted-эндпоинтов (67% реестра - слепая зона пакетных сканеров), методология
  с claim-ID (аудит-грейд), номер 29k как маркетинг.
- НАШИ козыри: 4-классовая градация по направлению с механической декомпозицией (его quiet/review
  грубее: 66 review на 12 775 - чистота сомнительна, наши кейсы Netlify/Mongo показывают, почему
  декомпозиция решает), CI-продукт целиком (scan/diff/approve/Action/Registry), skills-слой (у него
  нет), chameleon, MCP+skills в одном. Он фид+пин, мы платформа.
- ДЛЯ ПРОДУКТА (R30-кандидат): наш публичный дрейф-фид не покрывает hosted-эндпоинты - мы умеем
  пинить remote (scan --url), но публичные записи только по npm-серверам. Расширить на топ hosted
  MCP-эндпоинтов. Также взять на заметку класс "введение платы" как грейд-событие.
- ПРАВИЛО: в IBM #7082 НЕ входим (занят питчем конкурента, как supabase#464). IBM forge - watch:
  три шлюза теперь публично хотят один и тот же registration-pin (scope#533, teleport#61434, IBM#7082).
