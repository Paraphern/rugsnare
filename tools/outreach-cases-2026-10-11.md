# 5 готовых кейсов аутрича (2026-10-11) - верифицированная редакция

Метод: Путь A (дрейфт-карта -> боль) + Путь B (жалобы -> цели). Все находки сняты свежими прогонами rugsnare за сегодня и ДОПРОХОЖДЕНЫ механической верификацией (отчёт ниже). Правила: чек state перед постом, один репо/день для холодных, драфты показываем до постинга.

## ОТЧЁТ ВЕРИФИКАЦИИ (прогнан 2026-10-11 до постинга)

### Netlify - что подтвердилось, что опроверглось

- ПОДТВЕРЖДЕНО (механически): 1.15.1 меняет РОВНО 8 роутеров, единственное изменение - required:["operation","params"] -> ["operation"] в каждой ветке операций; после удаления required-массивов схемы байт-в-байт идентичны. У 1.15.1 вообще НЕТ GitHub-релиза (у репо существуют только релизы 1.16.0+).
- ПОДТВЕРЖДЕНО (с уточнением): get-team-env-vars добавлена в 1.16.0 (ветка: teamId required, envVarKey optional - листинг/получение переменных команды). Коммит-добавитель "0547a5a Add team-level env var read tool" (3 сент) БЕЗ conventional-префикса - release-prepare его не подобрал, CHANGELOG.md (== release notes) молчит. Это процессный разрыв, не злой умысел.
- ОПРОВЕРГНУТА исходная рамка: "initialize-database в read-роутере = семантический нонсенс". Правда (PR #61): операция возвращает written setup steps и НИЧЕГО не провижинит, честно read-only; Netlify сама признала имя misleading и СОЗНАТЕЛЬНО оставила его в групповой поверхности ("renaming it would break callers already on the grouped surface"). Переезд updater->reader виден в PR #60/#61, но отсутствует в release notes.
- НОВОЕ (из PR #60): сервер отдаёт РАЗНЫЙ контракт по user-agent: клиентам с openai-mcp UA - 21 гранулярный инструмент, остальным - 9 роутеров. Документировано, но это значит: пин, снятый одним клиентом, не покрывает поверхность другого.

### MongoDB - что подтвердилось, что опроверглось

- ПОДТВЕРЖДЕНО: диалект draft-07 -> 2020-12 на всех 20/20 инструментах; описания параметров обогащены; тела релизов 3.0.x пустые; CHANGELOG.md в репо отсутствует; #1047 анонсировал breaking только для library-использования.
- СКОРРЕКТИРОВАНО: items.anyOf -> items.oneOf ровно в 2 инструментах (explain.method, export.exportTarget), не в 3.
- ОПРОВЕРГНУТ исходный тезис "реальных изменений параметров ноль": канонизированное сравнение (с вычетом описаний/диалекта/anyOf-oneOf) даёт 13/20 чистой нотации, НО 7 инструментов несут РЕАЛЬНЫЕ сужения:
  - aggregate-db: pipeline получил minItems:1 (пустой pipeline теперь невалиден)
  - aggregate/explain/export (глубоко в $vectorSearch): limit и numCandidates number -> integer + exclusiveMinimum:0 + maximum:Number.MAX_SAFE_INTEGER
  - mongodb-logs: limit number -> integer + minimum:1 + maximum:1024
  - search-knowledge: limit minimum:1 + maximum:100 (новый кэп!)
  - atlas-local-connect-deployment: deploymentName получил pattern печатной ASCII
- Итог: смешанная волна (нотация + реальные сужения) без единой строки документации - это СИЛЬНЕЕ прежней рамки: часть находок честно заслуживала changelog-строки.

### Sentry - что подтвердилось, что опроверглось

- ПОДТВЕРЖДЕНО: у ВСЕХ релизов npm-линии 0.x тела GitHub-релизов NULL (вся линия без исключений); npm latest = 0.42.0 (25 сент); репо переехал в getsentry/toolkit.
- СКОРРЕКТИРОВАНО (точные границы, по-версионные пины 0.38-0.42):
  - 0.39.0 (27 авг): get_sentry_resource - переименование "AI conversation" -> "agent conversation" в описании и описании параметра (косметика)
  - 0.40.0 (24 сент): ОБА изменения разом - update_issue (assignedTo string -> string|null + "unassign" в описании) и search_events (two -> three query modes, проза). 0.40.0 -> 0.42.0 чисто.
  - "0.43-0.45" НЕ СУЩЕСТВУЕТ - серия кончается на 0.42.0 (исправлено в драфте).
- ПОДТВЕРЖДЕНО И УСИЛЕНО (PR #1374, getsentry/toolkit, MERGED 2 окт): search_events режется на 6 датасет-инструментов (search_errors/logs/traces/metrics/profiles/replays), прямая поверхность 9 -> 14 инструментов; в PR честно посчитан рост токен-стоимости (+3,120 токенов). Задокументировано в монорепо-ченджлоге, но НЕВИДИМО на уровне npm-релизов: следующий npm-релиз сломает вызовы search_events, а npm-потребитель не имеет канала, где об этом узнать.


Метод: Путь A (дрейфт-карта -> боль) + Путь B (жалобы -> цели). Все находки сняты свежими прогонами rugsnare за сегодня. Правила: чек state перед постом, один репо/день для холодных, драфты показываем до постинга.

## Конкурентная разведка (важно)

В пространстве уже ТРИ игрока: мы (rugsnare), AAtomless/Mike (занял supabase #464 9 окт, github-mcp #3466), GautamTalksDev (mcp-pin.gautamkhosla.com, fingerprints всех серверов, занял hostinger #67 2 сент). Окно закрывается - скорость решает.

## Кейс 1: Netlify - СИЛЬНЕЙШИЙ (новый скан сегодня)

- Кто: Netlify, официальный @netlify/mcp, 42,748 устан/нед, netlify/netlify-mcp (67 звезд, активный, пушил 10 окт). README: docs.netlify.com, кнопки установки ВСЕ на `npx -y @netlify/mcp` - без пина, каждый рестарт тянет свежий контракт.
- Архитектура: роутер-инструменты (reader/updater пары). selectSchema = union веток операций; описание инструмента = список операций для модели. Описания load-bearing.
- Находки (все верифицированы по-версионными пинами):
  - 1.15.1 (ПАТЧ): 8 инструментов, `required:["operation","params"]` -> `["operation"]` - params стал опциональным.
  - 1.16.0 (25 сен): в union team-reader добавлена ветка `get-team-env-vars` + в описание. НОВЫЙ канал данных (переменные окружения команды = секреты). Release notes 1.16.0: только OAuth-фичи.
  - 1.18.0 (7 окт, 4 дня назад): `initialize-database` переехал из extension-UPDATER (write) в extension-READER (read-only) - и в схеме, и в описании. Операция с именем initialize в read-only инструменте. Notes 1.18.0: гранулярная поверхность для OpenAI + annotations, про переезд ни слова.
  - Итого 58 находок на 24 версиях (history), полная карта по парам снята.
- Рамка: не обвинение, а "роутер-описания = surface; когда меняется набор операций - строка в notes". Репро в драфте.
- Действие: новый issue в netlify/netlify-mcp. Дублей нет (открытые issues проверены: #54, #48, #34... - ничего про tool surface).

## Кейс 2: MongoDB - документационный разрыв на мейджоре (новый скан сегодня)

- Кто: MongoDB, официальный mongodb-mcp-server, 98,382 устан/нед, mongodb-js/mongodb-mcp-server (1141 звезд, discussions включены).
- Находки: 2.0.0->2.1.2 чисто; 3.0.x патчи чисто; НО 3.0.0 (мейджор) перегенерировал схемы ВСЕХ 20 инструментов: диалект draft-07 -> 2020-12, items.anyOf -> items.oneOf (explain.method, export.exportTarget, aggregate.pipeline), описания параметров обогащены. Параметры не добавлялись/не удалялись/не сужались (проверено канонизированным сравнением).
- Усилитель: у ВСЕХ релизов 3.0.x на GitHub пустые body; CHANGELOG.md в репо отсутствует; #1047 анонсировал breaking только для LIBRARY-использования. Инструментный контракт не задокументирован нигде.
- Рамка: "перегенерация схем на мейджоре без единой строки notes; пин-автоматизация получает 20 несовпадений без возможности отличить нотацию от реального; одна строка в changelog закроет разрыв". Скромно, полезно, discussions открыты.

## Кейс 3: Sentry - где жить записи о контракте (скан из прошлой сессии, чеки свежие)

- Кто: Sentry, @sentry/mcp-server, 99,513 устан/нед (больше azure-devops).
- Находки (0.39.0 -> 0.42.0, окно 27 авг - 25 сен): update_issue assignedTo расширен string -> string|null (добавлен unassign, честно задокументирован в самом контракте), search_events переписан (two -> three query modes, схема байт-в-байт). Обе правки добросовестные - история НЕ про злой умысел.
- Реальная боль: релизы 0.39.0-0.45.x на GitHub все с пустым body; репо переехал в getsentry/toolkit; потребитель не имеет места, где отслеживать контрактные изменения.
- Бомба вперёд: toolkit #1374 режет search_events на датасет-специфичные инструменты - когда доедет до npm, все вызовы search_events сломаются. Предложить задокументировать ЗАРАНЕЕ (мы в weekly-вахте поймаем).
- Рамка: вопрос "где?" + подарок-предупреждение про search_events. Без обвинений.

## Кейс 4: LaunchDarkly - драфт готов (из прошлой сессии)

- Коммент в ЧУЖОЙ открытый issue #67 "expand the mcp with an audit-log tool" (OdysseasMas-lw, 8 апр): фича въехала в 0.6.2 (8 мая) молча, Speakeasy-notes ни слова, issue открыт 5 месяцев, автор не узнал. Ирония: инструмент аудита без аудита. Пакет для federal/EU.
- Драфт полностью готов (см. журнал/прошлую сессию), репро прогнано в clean-room.

## Кейс 5: Hostinger - добавляемся в занятый #67 со своими чеками

- Кто: Hostinger, hostinger-api-mcp, 264,539 устан/нед.
- issue #67 "A public record of api-mcp-server's tool definitions over time" (GautamTalksDev, 2 сент, 3 коммента - прочитать перед постом!) - ЗАНЯТ конкурентом, но наша добавка уникальна: между 2.4.0 и 2.11.0 молча въехали ШЕСТЬ agent-skill ресурсов (audit-hosting/SKILL.md, connect-domain, deploy-to-hosting, maintain-wordpress, migrate-to-hosting, troubleshoot-website) - model-facing инструкции, доставляемые как ресурсы, не упомянуты в docs/changelog. Плюс контекст #71 (396 инструментов по умолчанию).
- Рамка: ответ в #67 - "мы ведём такую же запись + вот конкретная находка, которой нет в fingerprints-формате" + предложение сверить форматы (у нас PIN-SPEC). Не дублировать Гаутама, а усилить.

## Отброшенные (честность важнее объёма)

- @playwright/mcp (6.5M устан/нед!): release notes образцовые - webmcp-инструменты добавлены в 0.0.81 и удалены в 0.0.82 С документированием; filename-семантика описана. Кейс-боли НЕТ. Материал для контента (позитивный контрпример).
- @azure/mcp (133k/нед): changelog первоклассный, даже условную рекламацию extension_azqr задокументировали. Боли нет. НО: обнаружен паттерн - инструменты рекламируются в зависимости от окружения (azqr только при установленном CLI).
- supabase: занято AAtomless 9 окт; окно 0.8-0.12 не сканируется даже с токеном.
- figma-developer-mcp: 2 инструмента, ноль изменений на 0.7.1->0.13.2.
- expo-mcp: 9/10 версий не стартуют/не ставятся.
- context7 4.3.0: weekly-находка query-docs оказалась ЛОЖНОЙ (свежие пины 4.0.4 и 4.3.0 идентичны полностью) - артефакт смены алгоритма хэша между версиями rugsnare. Продуктовый тикет: weekly-бейзлайны ломаются при апгрейде rugsnare, нужен re-pin при смене версии инструмента.

## Продуктовые тикеты из сканов (второму окну)

1. `rugsnare history` не умеет launch-аргументы/env: из-за этого пали LaunchDarkly (start --transport), @azure/mcp (server start), mongodb (--readOnly + conn string), supabase старые версии. Как минимум 4 крупных сервера вне покрытия.
2. Weekly false positive при смене хэш-алгоритма между версиями rugsnare (context7 case).
3. Градировка: правка текста описания ПАРАМЕТРА внутри inputSchema сейчас маркируется BREAKING (schemaHash-логика) - playwright 0.0.81 дал 7 "BREAKING" при нулевых структурных. Предложение: параметрические description-правки градировать отдельно (SCHEMA-PROSE), ниже структурных.
4. Длинные тире в юзер-фейс строках продукта (guardWarning, advisory, audit, help) - правило #0.

## Драфты

(все - без длинных тире, репро командами, rugsnare одной строкой в хвосте)

### Драфт 1: Netlify (новый issue) - верифицированная редакция

**Title:** Router tool operation sets change without release-note mentions (1.15.1 / 1.16.0 / 1.18.0)

**Body:**

We pin MCP tool contracts (sha-256 over name + description + inputSchema) and diff them across releases. The grouped reader/updater tools dispatch through a `selectSchema` union, and the operation list in each description is part of the model-facing surface - so operation-set changes are surface changes. Between 1.15.0 and 1.18.0 three of them happened with no mention in the release notes:

- **1.15.1 (patch)**: on 8 of the 9 tools, every operation branch changed `required: ["operation","params"]` to `["operation"]` - `params` stopped being required. We verified this is the only change: with the required arrays removed, the schemas are byte-identical. There is no GitHub release for 1.15.1 at all.
- **1.16.0**: `netlify-team-services-reader` gained a `get-team-env-vars` operation (new union branch: `teamId` required, optional `envVarKey`), and the description list gained the entry. That is a new data channel - team environment variables - for every agent holding a read-only tool. The release notes cover OAuth changes only; the adding commit ("Add team-level env var read tool") predates the release and has no conventional-commit prefix, so the generated changelog skipped it.
- **1.18.0**: `initialize-database` moved from `netlify-extension-services-updater` to `netlify-extension-services-reader` (union branch and description entry on both sides). PR #61 documents that this operation returns written setup steps and provisions nothing - genuinely read-only - and that the grouped-surface name was kept only to avoid breaking grouped callers. But the release notes say nothing about the move, so an agent approved on 1.17.0 discovers the operation changed routers only by failing.

One more observation from pinning this server: per PR #60 the surface itself is client-dependent (openai-mcp user agents get 21 granular tools; everyone else gets the 9 grouped tools). Documented, but it means a contract pin taken by one client does not cover what another client sees.

Repro (graded output from rugsnare 1.2.0):

```bash
mkdir nm && cd nm && npm init -y
# mcp.json: {"mcpServers":{"netlify":{"command":"node","args":["node_modules/@netlify/mcp/dist/netlify-mcp.js"]}}}
npm i @netlify/mcp@1.15.0
npx rugsnare@1.2.0 scan --config mcp.json --timeout 45000
npm i @netlify/mcp@1.15.1
npx rugsnare@1.2.0 diff --config mcp.json --timeout 45000
#   8 [DRIFT] findings (all 8 router tools), exit 1
npm i @netlify/mcp@1.16.0
npx rugsnare@1.2.0 diff --config mcp.json --timeout 45000
#   9 [DRIFT] findings, all LOOSENED, exit 1, e.g.:
#   [DRIFT] netlify-coding-rules (LOOSENED) 4e82cb8d -> 132cc820
#       additionalProperties false -> undeclared [loosen]
#   [DRIFT] netlify-team-services-reader (LOOSENED) 3a6bc060 -> 0f6268ae
#       WAS: ...read operations (read-only) get-teams, get-team
#       NOW: ...read operations (read-only) get-teams, get-team, get-team-env-vars
```

Suggestion: when the operation set of a router tool changes (added, removed, or moved between reader/updater), a line in the release notes would make these visible to pinned users. We detect these with rugsnare (open source, Apache-2.0); happy to share the per-version map of all 24 scanned versions.

### Драфт 2: MongoDB (новый issue) - верифицированная редакция

**Title:** 3.0.0 mixes notation-level schema regeneration with real input tightenings - and none of it is in the release notes

**Body:**

We diff MCP tool contracts across releases (pin, install, diff). In 3.0.0 the inputSchema of all 20 tools changed at once, and decomposing the wave it is genuinely mixed:

Notation-level (13 tools): `$schema` moved draft-07 -> 2020-12 on every tool, description text was added to most parameters, `items.anyOf` -> `items.oneOf` in `explain.method` and `export.exportTarget`.

Real input tightenings (7 tools), verified with canonicalized comparison:

- `aggregate-db.pipeline` gained `minItems: 1` - an empty pipeline array was valid in 2.1.2 and is invalid now
- inside `$vectorSearch` stages (`aggregate`, `explain`, `export`): `limit` and `numCandidates` narrowed `number` -> `integer`, plus `exclusiveMinimum: 0` and `maximum: Number.MAX_SAFE_INTEGER`
- `mongodb-logs.limit`: `number` -> `integer`, `minimum: 1`, `maximum: 1024`
- `search-knowledge.limit`: `minimum: 1`, `maximum: 100` - a new cap
- `atlas-local-connect-deployment.deploymentName` gained a printable-ASCII `pattern`

None of this is discoverable from the package: the GitHub release notes for 3.0.0 and the whole 3.0.x line are empty, the repo has no CHANGELOG.md, and #1047 announced breaking changes for library usage only. A schema-valid 2.1.2 caller (say, `search-knowledge` with `limit: 150`, or an aggregate with an empty pipeline) is now invalid, and nothing tells them.

Repro (graded output from rugsnare 1.2.0):

```bash
mkdir mm && cd mm && npm init -y
# mcp.json: {"mcpServers":{"mongodb":{"command":"node","args":["node_modules/mongodb-mcp-server/dist/esm/index.js","--readOnly"],"env":{"MDB_MCP_CONNECTION_STRING":"mongodb://x:27017"}}}}
npm i mongodb-mcp-server@2.1.2
npx rugsnare@1.2.0 scan --config mcp.json --timeout 45000
npm i mongodb-mcp-server@3.0.0
npx rugsnare@1.2.0 diff --config mcp.json --timeout 45000
#   20 [DRIFT] findings: 4 BREAKING + 16 NOTATION, exit 1, e.g.:
#   [DRIFT] mongodb-logs (BREAKING) d441d608 -> 2d21a549
#       changed type of 'limit' from number to integer [tighten]
#       added minimum=1 to 'limit' [tighten]
#       added maximum=1024 to 'limit' [tighten]
#   [DRIFT] aggregate-db (BREAKING) d557c1e5 -> 749a99af
#       added minItems=1 to 'pipeline' [tighten]
#   [DRIFT] aggregate (NOTATION) ... (the $vectorSearch narrowing above lives 5 levels
#   deep inside pipeline.items.anyOf - hash-caught, leaf shown by canonicalized diff)
```

Suggestion: a changelog line separating the two classes ("schemas regenerated for dialect; input tightenings: integer typing + bounds on X, minItems on pipeline") would close this for everyone who pins. Happy to share the full decomposition of all 20 diffs.

### Драфт 3: Sentry (новый issue) - верифицированная редакция

**Title:** @sentry/mcp-server npm releases have no notes at all; next release will replace search_events

**Body:**

We run a weekly drift watch over the most-installed MCP servers on npm (pin tool contracts, diff on update). On @sentry/mcp-server, every GitHub release in the npm line (through 0.42.0, the current latest) has an empty release body - there is no release-notes channel for this package at all, and the repository moved into getsentry/toolkit, so consumers have nowhere to watch.

The contract did move in that window, all of it benign and self-documented inside the tools:

- 0.39.0: `get_sentry_resource` renamed "AI conversation" to "agent conversation" in the description and a param description
- 0.40.0: `update_issue.assignedTo` widened `string` -> `string|null` (unassign added, documented in the description); `search_events` description rewritten (two -> three query modes, schema byte-identical)

The reason this matters now: toolkit PR #1374 (merged Oct 2) splits `search_events` into six dataset-specific tools (`search_errors`, `search_logs`, `search_traces`, `search_metrics`, `search_profiles`, `search_replays`), growing the direct surface from 9 to 14 tools. It is documented in the monorepo changelog - but when the next npm version ships it, every automation calling `search_events` breaks, and an npm consumer has no release-notes channel to learn that from.

Suggestion: even a one-line body per npm release when the tool list changes ("tools: search_events replaced by 6 dataset tools") would close the gap. We watch this package weekly and are happy to share findings ahead of each release.

### Драфт 4: LaunchDarkly (коммент в #67) - готов из прошлой сессии, дословно в журнале

### Драфт 5: Hostinger (коммент в #67)

**Body:**

We keep the same kind of record (pin approved contracts, diff every release) and have one concrete finding for api-mcp-server that a definition snapshot alone would not surface as a change event:

Between 2.4.0 and 2.11.0 six agent-skill resources appeared, none mentioned in the docs or changelog:

- audit-hosting/SKILL.md, connect-domain/SKILL.md, deploy-to-hosting/SKILL.md, maintain-wordpress/SKILL.md, migrate-to-hosting/SKILL.md, troubleshoot-website/SKILL.md

These are model-facing instructions delivered as resources: a client whose user approved the 2.4.0 surface now serves new instruction content to the agent without any approval step. That is the sharpest version of the staleness problem this issue describes - not just definitions changing, but new instruction payloads arriving.

Repro:

```bash
mkdir hm && cd hm && npm init -y
# mcp.json: {"mcpServers":{"hostinger":{"command":"node","args":["node_modules/hostinger-api-mcp/src/servers/all.js"],"env":{"HOSTINGER_API_KEY":"dummy"}}}}
npm i hostinger-api-mcp@2.4.0
npx rugsnare@latest scan --config mcp.json --server hostinger
npm i hostinger-api-mcp@2.11.0
npx rugsnare@latest diff --config mcp.json --server hostinger   # 6 NEW resources, exit 1
```

Happy to compare notes with your fingerprint format - we publish the pin format we use (sha-256 over name + description + inputSchema, canonicalized) and would benefit from interoperability here.
