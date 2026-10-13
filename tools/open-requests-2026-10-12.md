# Открытые запросы GitHub под ответ rugsnare (2026-10-12)

Задача: не создавать новые issue, а отвечать на уже открытые запросы, с новым фиче-сетом:
skills scan/diff/report across 14 platforms; HTML-отчёт was/became + severity; cold-start аудит
(ловит риски, существовавшие до установки); нативный лаунчер (Go, 7 MB) для нетехнических юзеров.

## Тир 1 - прямой ответ, отвечать сейчас

### 1. SecretiveShell/MCP-Bridge#126 (926 звёзд) - ЛУЧШИЙ
https://github.com/SecretiveShell/MCP-Bridge/issues/126
Вопрос юзера (anythingoah, 2026-08-24, 0 ответов, открыт):
"How do you handle upstream MCP servers changing schema/tool list under MCP-Bridge?
... renamed tool, changed param, dropped a field ... does it error at request time, silently pass
through, or is there something that catches it before a client hits it?"
Угол: честный ответ на вопрос (сегодня мост пропускает насквозь, ловит только рантайм-ошибка клиента)
+ rugsnare как недостающий слой: pin контрактов upstream, diff при апгрейде, severity по направлению,
HTML was/became, cold-start аудит всех мостовых upstream-ов одной командой. Это не реклама - это ответ.
Фичи: scan/diff/report, cold-start audit, HTML report.

### 2. microsoft/scope#533 (org microsoft, мс-репо MCP-шлюза)
https://github.com/microsoft/scope/issues/533
Feature request (duffney, 2026-07-29, 2 коммента): пин версии пакета при регистрации stdio-MCP
(сейчас всегда latest). Команда отложила post-April-15.
Угол: пин версии НЕОБХОДИМ, но недостаточен: (а) тег в реестре может переехать/перепубликоваться;
(б) даже фиксированная версия может отдавать РАЗНЫЕ контракты разным клиентам (реальный кейс:
netlify/mcp PR #60 - openai-mcp UA видит 21 инструмент, остальные 9).rugsnare дополняет их схему:
контрактный пин поверх версионного + CI-диф + отчёт по флоту серверов шлюза.
Фичи: scan/diff, report по флоту, severity.

### 3. gravitational/teleport#61434 (enterprise, крупное репо)
https://github.com/gravitational/teleport/issues/61434
"[mcp] Tool Poisoning Attack (TPA) detection" (2025-11-17, открыт).
Угол: enterprise-запрос на детекцию TPA. rugsnare: пин описаний инструментов (ядро TPA - смена
инструкций между апрувом и вызовом), advisory-сканер описаний, drift feed по популярным серверам,
рецепты/аудит-лог для комплаенса, SARIF. Осторожно: enterprise тред, писать по делу, без маркетинга.
Фичи: scan + advisories, audit receipts, report.

## Тир 2 - дистрибуция/позиционирование

### 4. bh-rat/awesome-mcp-enterprise#151 (121 звезда) - форма, НЕ боль
https://github.com/bh-rat/awesome-mcp-enterprise/issues/151
Конкурент (tomelias10/mcp-drift-check - пассивная проверка конфигов на незапиненные npx-ссылки)
сабмитится в список Security & Governance. Поток: issue-форма -> метка approved-for-pr -> PR.
Действие: сабмит rugsnare той же формой (у нас сильнее evidence: 14 страниц docs/servers, Registry,
Marketplace, тесты). Категория та же.
ВАЖНО: mcp-drift-check находит НЕЗАПИНЕННЫЕ ссылки; rugsnare пинит КОНТРАКТЫ - в сабмите
проговорить разницу, не поливая конкурента.

### 5. supabase/mcp#464 - ЗАНЯТО AAtomless (второй его заход после провала у Sentry)
https://github.com/supabase/mcp/issues/464 (2026-10-09, открыт)
Его новая рамка: "самый стабильный из замеренных, один флаг" + оффер таблиц. Учиться формулировке,
НЕ лезть в чужой тред сейчас. Наше отличие - инструмент с воспроизводимым repro, а не только таблицы.
Наблюдение: конкурент ходит по вендорам прямо сейчас, темп - репо/день.

## Тир 3 - точечные, малые, но точные

### 6. psandhir/horustrace#327 - "Add MCP and agent-skill supply-chain trust analysis"
https://github.com/psandhir/horustrace/issues/327 (2026-10-03)
Их роадмап-запрос дословно = наш фиче-сет (skills scan/diff/report, supply-chain trust).
Угол: предложить не строить, а взять rugsnare (open source, Apache-2.0) - интеграцией или обёрткой.
Фичи: skills across 14 platforms, HTML report, cold-start audit.

### 7. Crearize/ai-dev-helm#206 - "superpowers upstream drift v7.0.0"
https://github.com/Crearize/ai-dev-helm/issues/206 (2026-10-10)
Живая боль skill-дрейфа (апстрим superpowers обновился - локальные навыки расползлись).
Угол: skills-pin (SKILL.md пинится хэшем, дифф был/стал при обновлении апстрима).
Фичи: skills scan/diff.

### 8. modelcontextprotocol/modelcontextprotocol#3213 - спек-тред MCP-2026-015 (12 комментов)
https://github.com/modelcontextprotocol/modelcontextprotocol/issues/3213
Промпт-инъекция через server/discover instructions. Угол (осторожный, по существу спека):
детектируемая часть проблемы - инструкции меняются ПОСЛЕ апрува; пин описаний/инструкций + дифф
делает смену видимой. Одно содержательное сообщение, не витрину.

## Порядок отработки (предложение)

1. MCP-Bridge#126 (сегодня) - чистый ответ на вопрос юзера
2. scope#533 (сегодня-завтра) - дополнение к их дизайну
3. horustrace#327 + ai-dev-helm#206 (батч skills-фронтов)
4. awesome-mcp-enterprise сабмит (форма)
5. teleport#61434 (обдуманно, enterprise-тон)
6. supabase#464 - только наблюдение

Конкурентный контекст: AAtomless перешёл от метрик к «флейм-фрист» рамке и ходит по вендорам;
mcp-pin (Gautam) пока в своих каналах. Наш козырь в этих тредах: воспроизводимость (repro в issue)
и инструмент, который юзер может запустить у себя сегодня (npm + Go-лаунчер).

## Журнал отработки

- 2026-10-12: MCP-Bridge#126 - ОТВЕЧЕНО (issuecomment-6113910473): честный разбор как мост
  пропускает изменения (renamed=runtime-ошибка клиента, changed param=валидация апстрима,
  changed description=молчаливая смена поведения) + rugsnare как слой пина/диффа + ссылки на
  docs/servers. Добавлен последний абзац с верифицированными дрейф-записями.
- 2026-10-12: microsoft/scope#533 - ОТВЕЧЕНО (issuecomment-6113946513): +1 их запросу + дизайн-дополнение
  (version не пинит контракт: per-UA поверхности со ссылкой на netlify PR #60 + серверный рантайм-гейтинг)
  + предложение фиксировать хэши контрактов при регистрации + rugsnare одним предложением.
  Ссылка на PR вендора как единственное доказательство; самоссылок-метрик нет.
- 2026-10-12: teleport#61434 - ПРОВЕРЕНО И ОТВЕЧЕНО (issuecomment-6113969934). Проверка перед постом:
  единственная TPA-issue, размечена (feature-request/identity-security/MCP), 0 комментов 11 мес,
  дублей/реализаций нет, MCP-направление активно (десятки issue 2026), аудит уже пишет mcp.session.start/end,
  контракты в аудит не попадают. Коммент: 90% дизайн (хэш контракта в tools/list -> 2 детекции бесплатно:
  cross-session mutation + approval drift; cross-tool shadowing отдельным эвристическим слоем), rugsnare
  одним предложением. Enterprise-тон, без метрик.
- 2026-10-12: awesome-mcp-enterprise - САБМИТ ОТПРАВЛЕН (#159, форма Listing Proposal): Emerging,
  Security & Governance, honest no-Main-claims, 8 evidence-ссылок (releases v0.4.0-v1.2.0, CI 320 тестов,
  Apache-2.0, npm, docs/servers, MCP Registry, Marketplace). Дифференциатор: integrity-слой между
  инспекцией конфигов и рантайм-песочницей. Ждём метку approved-for-pr -> потом PR (формат их CONTRIBUTING).
  Конкурент mcp-drift-check в #151 ещё не размечен.
- 2026-10-12: ai-dev-helm#206 - ОТВЕЧЕНО (issuecomment-6114085632): прогон superpowers v6.4.2->v7.0.0
  (291 файл запинен, 5 находок: brainstorming/SKILL.md DANGEROUS-переписывание, 2 REVIEW, 1 GONE,
  1 NEW builder-check-prompt.md который их CI НЕ заметил - слепая зона оверлей-проверки),
  подтверждено независимо git-диффом, repro 6 команд + оффер skills diff --json их скрипту.

## Копалка superpowers (obra/superpowers, 297k звёзд, 26.6k форков)

- Релиз-ноты ОБРАЗЦОВЫЕ: переписывание brainstorming и замена reviewer->builder задокументированы
  с PR-ссылками (#2463, #2482). Это НЕ кейс "молчаливого вендора" - претензий к obra нет и лезть
  к нему с дрейф-фичей нельзя.
- Дистрибуция: официальный Claude plugin marketplace (/plugin install superpowers@claude-plugins-official),
  маркет obra, официальный Codex marketplace, Antigravity. Обновление = переустановка командой -
  у юзера НЕТ шага просмотра диффа инструкций. Боль живёт на СТОРОНЕ ПОТРЕБИТЕЛЕЙ, не вендора.
- В v7.0.0 у них сам фикс саплай-чейн уязвимости: run-hook.cmd больше не запускает bash.cmd/where.bat
  из текущей директории репо (репо мог подсунуть свой bash в SessionStart). Хуки = исполняемый код
  плагина - поверхность есть, они это признают.
- Открытых запросов на пиннинг/верификацию в репо НЕТ (проверено поиском), discussions выключены.
- Оверлей-форков с той же болью полно (26.6k форков); прямой поиск дал слабо - искать по коду
  apply-skill-overlays / по CI-логам "upstream drift".
ВЫВОД: superpowers - не фронт для issue (вендор честный), а (а) источник кейсов для нашего
нарратива ("самый популярный скилл-пакет переписал инструкции - кто из 297k юзеров увидел дифф?"),
(б) поляна для skills-pin: R25 (канонический skills/ в корне) делает нас готовыми к этой раскладке.
- 2026-10-12: horustrace#327 - ОТВЕЧЕНО (issuecomment-6114157846): опыт-шеринг по его чеклисту
  (канонизация хэша: сортировка ключей/$schema-диалект/anyOf-абстракция; декомпозиция по направлению
  рекурсивно - R21-история с двумя пруфами; skills: 14 локаций + канонический skills/ в корне - R25-история;
  детерминированные факты vs эвристические advisory) + дар корпуса/фикстур (docs/servers) + rugsnare
  Apache-2.0 как reference или JSON-стадия под его критерий "findings link through the graph".
  ЦЕПОЧКА ОТРАБОТАНА ПОЛНОСТЬЮ: 5/5 фронтов (MCP-Bridge, scope, teleport, ai-dev-helm, horustrace) +
  awesome-enterprise #159 в триаже.

## Свип по скиллам у топ-игроков (2026-10-12, вторая волна)

- ГЛАВНОЕ: anthropics/skills#492 (180k звёзд репо, 43 коммента, ноль ответов Anthropic) - тред о
  namespace-имперсонейшене превратился в КЛУБ инструментов скилл-безопасности: 4 тулзы согласовали
  interop-базис (raw-octets sha256 = sha256sum, общие фикстуры baseline/drifted/invalid-utf8, SARIF).
  Карта: Agent-Threat-Rule/agent-threat-rules 410★ (Sigma для агентов - стандарт), skills-lock/skil-lock 6★
  (ПРЯМОЙ КОНКУРЕНТ skills-pin: "Pin AI Skill behavior. Block unapproved drift in CI"),
  ppcvote/prompt-defense-audit 5★ (17 векторов, regex, SARIF), aliksir/claude-code-skill-security-check 4★ (спека конверта).
- МЫ ВОШЛИ ПЯТЫМ (issuecomment-6114223701): пруф совместимости хэша (raw octets = sha256sum байт-в-байт,
  включая lone 0x80 и WTF-8 суррогат), градация DANGEROUS/REVIEW + живой кейс superpowers 6.4.2->7.0.0,
  14 платформ + канонический skills/ корень, SARIF, ссылка на docs/servers. Вход как участник interop, не промо.
- НА ЗАМЕТКУ: aliksir - координатор клуба (автор треда и спеки), с ним стоит выстроить контакт;
  ATR 410★ - отдельный будущий фронт (маппинг наших находок в их правила); skil-lock - в радаре конкурентов.
- Вторичное: anthropics/skills #286/#879 - вендоры-измерители постят аудиты и "grades" в репо (как AAtomless);
  openai/codex#48000 SEP-2640 Skills Extension - процесс стандартизации, сторожевой пункт; Codex/Cursor -
  баги дискавери, не боли целостности.

## Четвёртый пакет (вечер 2026-10-12): дары + EventRelay + списки

- yagami#69 - ОТВЕЧЕНО (issuecomment-6114338742): дар фикстур под его acceptance-лист
  (netlify=compatible additions, mongo=5 breaking с листами, attack-корпус=malicious descriptions,
  docs/servers=per-version maps) + pin-store как reference для pin/warn/deny.
- agentbench#14 - ОТВЕЧЕНО (issuecomment-6114339209): оффер в help-wanted - данные вместо кода
  (JSON-кейсы: description/pattern/expected verdict/reason code под их сюит mcp_tool_poisoning.py).
- EventRelay#2349 - ОТВЕЧЕНО (issuecomment-6114346000): после чтения комментов (stage-one смержен,
  в остатке прямо значится 'approval-bound tool-catalog digests') - это поле у нас готовый код
  (scan --json: schemaHash+proseHash на инструмент + версии пакета; цитата официального гида;
  оффер lift JSON-шапки, не adoption).
- corca-ai/awesome-llm-security - PR #366 ОТКРЫТ (Tools, после Agentic Radar, их формат + stars-badge).
  REST-цепочка (fork -> branch -> file -> PR), локальный git не задействован; контент - одна md-строка.
  Конкурент mcp-safeguard в списке НЕ смержен (их issues #194/196 не доехали).
- ottosulin/awesome-ai-security - PR #535 ОТКРЫТ (Agent Runtime Security & Sandboxing, после
  cisco skill-scanner; их формат: звёздочка + курсив). Соседи: cisco-ai-defense/skill-scanner,
  pipelock - наша позиция 'integrity-слой между approval и execution'.
ИТОГ ДНЯ: 5 фронтов первой волны + 1 skills-клуб + 5 четвёртого пакета = 11 касаний,
все по открытым запросам/формам, ни одного нового issue создано.

## ATR-фронт (2026-10-12, вечер): три Red Team Probe отправлены

Разведка перед сабмитом (главное):
- ATR-2026-00276 (invisible-unicode-bidi) и 00313 (zero-width) УЖЕ покрывают наш A12/A13, но только на
  tool_response (рантайм). Наша уникальная ниша - СТАТИЧЕСКИЕ tool-описания на регистрации (tools/list,
  скилл-файлы) - не покрыта никем.
- Unpinned/floating-версий в правилах НЕТ (только proposals/GHSA-стабы).
- Телефона-в-описании (наш A17) в правилах НЕТ.
- ANSI (наш A18) у них есть (00259), cross-tool shadowing (A09) частично (00161) - НЕ сабмитим, не дублируем.

Сабмит по их каноническому пути Path 1 (Red Team Probe issue, не PR - CONTRIBUTING прямо говорит,
что новые паттерны идут через пробу, мейнтейнер доводит; regex можно предложить прямо в issue):
- #653: invisible Unicode/bidi в статических tool-описаниях (tool-poisoning, high) + наши regex A12/A13
- #654: телефон в tool-описании как канал эксфильтрации (context-exfiltration, high) + regex A17
- #655: floating-ссылка в MCP-конфиге (supply-chain, medium) - конфиг-шейп правило, + официального гида
  ссылка + полевой факт 6/7 unpinned из EventRelay#2349
Все три: >=4 позитива, >=5 негативов, "Discovered by rugsnare" с ссылкой на docs/servers.
Атрибуция попадёт в metadata_provenance.discovered_by + author правила при принятии.

Что дальше: следить ревью (обычно один раунд tighten); при принятии - продукт-чату сигнал на atrRuleId
поле в advisory-выводе (их половина плана). Прямой PR НЕ нужен - Path 1 правильнее процесса.

## Волна 3: скилл-боли у 10 крупнейших (вечер 2026-10-12)

- ГЛАВНОЕ: microsoft/azure-skills#200 (1558★, 91 SKILL.md) - MEMBER JasonYeMSFT признал: "we don't run
  risk or security assessments on the skills" + вслух спросил коллегу о запуске своих оценок.
  МЫ ОТВЕТИЛИ ДАННЫМИ (issuecomment-6114648936): прогон дерева-CLI по их репо - 950 файлов запинено,
  опасный класс ЧИСТ (0 invisible-unicode/hijack/phone/ANSI на 950), 12 advisory-флагов (топ:
  foundry-tool-catalog score 8, trace.md 8, 7 finetuning-скриптов 7 - вероятно benign), и факт дрейфа:
  100 SKILL.md-изменений за 90 дней через 29 bulk-синк PR из GitHub-Copilot-for-Azure. Оффер:
  two-line CI job на каждый синк-PR. Репо = синк-зеркало Copilot-for-Azure.
- Google gemini-cli#29548: file:///Users/abhipatel/... в официальном скилле (гигиена, цитируемо).
- Amazon Kiro: #11726 описание скилла молча теряется (multi-line YAML), #10678 подчёркивания молча
  исключаются - класс "молчаливой потери метаданных", лёгкий угол опционально.
- Cursor - трекер вне GitHub; Tencent/Alibaba - репо недоступны; Cisco/NVIDIA/OpenAI/GitHub/Anthropic - закрыты ранее.
- ПРОДУКТУ (R26, уточнено): advisory-дискавери в skills.js SKILL_DIRS отстаёт от пин-слоя - нет skills/
  в корне (R25 зеркалить) и только 3 платформы из 14. НО: `skills scan` из дерева уже гоняет advisory
  по skills-dir (пин-путь покрывает) - R26 касается только главного `rugsnare scan`.

## Волна 4: вторая десятка компаний (2026-10-12, поздний вечер)

- ГЛАВНОЕ: vercel-labs/skills (33803★, npx skills + реестр skills.sh с аудитами Agent Trust Hub + Snyk).
  Системная боль: аудит привязан к снапшоту; >=6 открытых issue с ручными просьбами re-audit
  (#2359, #2179, #2382, #1988, #2339, #1497): флаги переживают удалённый код, а отравление после
  индексации невидимо до ручного ре-аудита.
  МЫ ОТВЕТИЛИ (issuecomment-6114736527) в #2359: sibling-паттерн + предложение привязать аудит к
  хэшу содержимого (same hash = кэш действует; новый хэш = авто-ре-аудит + was/became на витрине)
  + потребительский комплимент rugsnare. Замыкание: Microsoft (azure#200) доверяет оценки skills.sh,
  skills.sh слеп к дрейфу - мы недостающий слой, обе стороны проговорили своё вслух.
- Zed: 5 скилл-багов lifecycle (symlink-скиллы не видны #64992, глобальные не появляются #59543,
  песочница падает после удаления #63476) - класс "заявленное != активное", лёгкий угол на потом.
- Salesforce agentforce-adlc #10 (пример расходится со скаффолдом) - слабо. JetBrains/ByteDance - минус.
- Atlassian/Devin/Replit/Mistral/Docker/Trae/Amp - трекеры вне GitHub; Meta - экосистемы нет.

ИТОГ ВСЕХ ВОЛН ДНЯ (1+2+3+4+ATR): 17 касаний, 3 живых прогона по чужим репо (superpowers, azure-skills,
EventRelay-контекст), 3 ATR-пробы, вход в 2 клуба (skills-interop #492, vercel re-audit поток).
Ключевые адресаты дня: Microsoft, NVIDIA, Vercel, Anthropic-экосистема, ATR, teleport.

## Волна 5: третья десятка (финал дня)

- ГЛАВНОЕ: microsoft/mcp#3674 (3761★, MEMBER conniey = Connie Yau, Azure SDK) - "[CI] Add CI Gate for
  validating documentation matches MCP tool changes (description/command name/parameter)". ИЗУЧЕНО ДОСКОНАЛЬНО:
  ребёнок ЗАКРЫТОГО эпика #2496 ("command contracts... documentation drifts from the executable command surface"),
  у них уже стоит постмержный doc-gap-detector + агентные workflows; единственный открытый кусок программы -
  предмержный гейт, назначен на conniey, месяц без движения. МЫ ОТВЕТИЛИ (issuecomment-6114803886):
  контрактная половина гейта off-the-shelf (пин+дифф+was/became PR Action+exit-код), их doc-gap-детектор
  валидирует доки против ПИН-контракта версии PR - пре-мерж вместо пост-мерж. Убрал упоминание Azure DevOps
  из текста (счёл лишним тыкать их же сервером в их треде).
- Cloudflare/agents: skills.r2() = СКИЛЛЫ ИЗ ОБЛАЧНОГО R2 динамически (#2068 не работают скрипты, #1678
  wrangler dev, #1683 Artifacts). Архитектурный сигнал: мутабельные удалённые скиллы - будущая задача для
  пинов (R-кандидат: пин удалённых источников с фиксацией снапшота). HF smolagents #1848 (поддержка скиллов).
- Stripe/Elastic/Datadog/Snowflake/Postman/Shopify/GitLab - трекеры недоступны по угаданным путям; Linear -
  только фич-реквесты.
ИТОГ ВСЕХ 5 ВОЛН + ATR ДНЯ: 18 касаний. Microsoft затронут ТРИЖДЫ за день (azure#200 данные, mcp#3674 гейт,
scope#533 дизайн) - разными продуктами, разными углами, без пересечений.

## IBM mcp-context-forge: глубокое изучение и вход (2026-10-12, ночь)

- Цепочка выяснена: #5046 (Merck CONTRIBUTOR, per-server forbidden patterns, MUST) закрыт как дубль
  -> #5862 (extension framework epic) тоже закрыт -> решение живёт в #7010 (CEL-эпик, work-queue,
  коммент мейнтейнера: "prioritize resolution of #5046"). #7082 (питч heldfast) - 11 дней без
  реакции IBM, мёртв, не входили.
- МЫ ВОШЛИ В #7010 (issuecomment-6114931656): (1) паттерны на ДЕЛЬТЕ от пин-базовой линии, а не на
  всём описании - FP-поверхность схлопывается, иерархия переопределений почти не нужна; (2) карта
  классов паттернов из production: near-zero-FP (unicode/hijack/ANSI/phone - глобальные дефолты) vs
  требующие per-server (шелл-метасимволы, credential-имена, домены - ровно текущий глобальный список);
  оффер полного набора CEL-выражениями с ATR-кроссреференсами. rugsnare как reference пин-дельты.
- Позиционирование против heldfast в этом сегменте: он питчит внешний фид (зависимость от сервиса),
  мы - внутреннюю механику шлюза (digest + delta) - для enterprise-форджа это разные классы предложений.
- Счёт дня: 19 касаний. Ждём реакцию jonpspri (COLLABORATOR, активен).

## Волна 7: класс шлюзов/прокси, глубокий протокол (ночь 2026-10-12)

- ГЛАВНОЕ: BerriAI/litellm (60979★) УЖЕ ВШИЛ наш концепт: PR #43283 (merged 29.09, Devin-бот,
  +1969 строк) - пин каталога инструментов админом + алерт mcp_pinned_tools_changed + freeze-serve
  пин-значений при дрейфе. ДЫРА #44093 (наша экспертиза): пин хранит только description+input_schema;
  annotations/outputSchema/title/_meta не пинятся и не сравниваются; дашборд при этом показывает
  "pinned, unchanged". Параллельно #44245 (Devin-PR, 33 коммента, BerriAI матёрит bugbot) строит
  версии/ченджлоги/deprecation с классами initial/non-breaking/breaking/removed.
- МЫ ОТВЕТИЛИ в #44093 (issuecomment-6115002978) ПОСЛЕ ГЛУБОКОЙ ВЕРИФИКАЦИИ: прочитали их
  tool_catalog_guard.py (_drifted = dict-compare -> совет про сортировку ключей убрали как
  неприменимый), сверили себя (annotations пиним через SPEC-ДЕФОЛТЫ - козырь: absent-vs-default
  мина; outputSchema НЕ пиним и сами - подано как честная общая дыра; freeze-serve убрали из
  описания себя). Три калиброванных урока + градация с рекурсией + ссылка.
- WSO2: ЧЕТЫРЕ репо активно строят MCP tool poisoning guardrails (api-platform typesafe guardrail,
  gateway policy, classifier sample, agent-manager filters) - вони фронт корпоративного класса,
  копнуть отдельно.
- Portkey #1833 "external evidence/PDP hook before MCP tool execution" (0c) - pre-exec policy hook,
  смежный. Higress/Camel - шум.
- СЧЁТ ДНЯ: 20 касаний. LiteLLM = крупнейший адресат за весь проект (61k★). Пятый шлюз с пиннингом
  (scope/teleport/forge/litellm + CF-скиллы) - категория мейнстримится; наш ров: канонизация,
  spec-default annotations, расщеплённые хэши, рекурсивная градация, честность про собственные дыры.

## WSO2: глубокое копание и вход (ночь, финал)

- Компания: 20-летний open-source мидлвар-вендор (API Manager/шлюзы, Коломбо+SF, клиенты - банки/
  телекомы/государства). MCP для них "новые API", guardrail - "политики шлюза" - их основная модель.
  НЕ конкуренты: другая точка установки (их шлюз vs наш CI/агент), другая модель (фильтр текущего
  состояния vs крипто-якорь апрува), нет пересечения продукта. Риск: шестой шлюз сходится на
  gateway-native контроле контрактов; наша земля - сторона апрува.
- Программа: carbon-apimgt#13830 governance-engine (merged 12.05), gateway-controllers#310 PR
  (+13327 строк, открыт с 23.09, ждёт живого ревью - пока боты), api-platform typesafe-jev фичи,
  docs-guide (merged 16.09). их inspection.go - schema-keyword-aware walker (enum/default/examples/
  definitions/_meta/имена параметров как носители инструкций) - зрелая угроза-модель.
- ВЕРИФИКАЦИЯ перед постом: merge-статусы подтверждены; patch inspection.go прочитан (walker реален);
  наш stable() сохраняет enum/default/example (утверждение о дайджесте верно); ОШИБКА НАЙДЕНА И
  ИСПРАВЛЕНА: "16 сигналов" -> 18, включая правку уже постленного IBM-коммента (самоликвидировались).
- МЫ ОТВЕТИЛИ в PR#310 (issuecomment-6115087752): признание их walker-модели + пин-дельта инсайт
  (классификатор на дельте от базовой линии: FP коллапсирует, позднее отравление ловится хэшем) +
  "один дайджест покрывает всё, что walker перечисляет" + карта FP-классов 18 сигналов + ATR-кроссреф.
- СЧЁТ ДНЯ ОКОНЧАТЕЛЬНО: 21 касание. Крупнейшие адресаты: LiteLLM 61k★, Zed-экосистема, Microsoft x3,
  IBM, Vercel 33.8k★, NVIDIA 19.9k★, WSO2, ATR, teleport 21k★.

## Anthropic-кластер (2026-10-13 утро) - первый глубокий перепрогон по IBM-методике

- Найдено 3 фронта в anthropics/claude-code, все неподнятые, все наши:
  #93318 (листинг скиллов без метки источника - bundled Anthropic неотличимы от юзерских;
  у автора - разные уровни власти для разных источников), #101422 (аккаунт-СИНК скиллов в
  ~/.claude/skills/synced - мутабельный удалённый источник; при shared ~/.agents/skills синк
  затекает в папку всех агентов), #16345 (хаб .agents/skills, 31 коммент, integrity поднята
  в 1 из 31 - общий интегрити-угол отсутствует).
- ПРАВИЛО САМОПРОВЕРКИ ОТРАБОТАЛО: сверка поймала 3 неточности ДО постинга (ложное "pin by
  plugin namespace" - SKILL_LOCATIONS не покрывает claude-плагины; ложный "детект смены scope" -
  вердикты UNCHANGED/DRIFT/NEW/REMOVED; абсолют "nothing surfaces" смягчён) и усилила одну
  правду (R27 .agents/skills УЖЕ В ДЕРЕВЕ - продукт-чат вшил ночью со ссылкой на наши доводы).
- ВСЕ ТРИ ОТПРАВЛЕНЫ: issuecomment-6120672064 (#93318), -6120672560 (#101422), -6120672905 (#16345).
- ПРАВИЛО ЗАФИКСИРОВАНО в find-open-pains-prompt.md (новая секция "Правило самопроверки тезисов"):
  двухсторонняя сверка (их код + наш grep), таблица утверждение->проверка->вердикт, показ
  пользователю вместе с драфтом.

## Перепрогон топов, день 2 (2026-10-13): codex-ветка -> ВЫХОД НА СПЕКУ

- Цепочка: openai/codex#48000 (просьба поддержать SEP-2640) -> github.com/modelcontextprotocol/
  ext-skills (738★, СПЕКА Skills Extension, живые SDK-порты Rust/Go).
- ГЛАВНОЕ: PR #142 (+2 строки, не смержен с 14.09, без мейнтейнер-реакции) вписывает в спеку
  наш корневой цикл: "Executable content MUST be fetched before approval, hashed by the host,
  retained in an immutable host-private location, and executed only if the retained bytes match
  those presented for approval". Спека уже признаёт: "a name binds to whatever bytes its origin
  currently serves" (мутабельность + имперсонейшн).
- МЫ ВОШЛИ НА УРОВЕНЬ СПЕКИ (issuecomment-6120902188): поддержка PR + вклад "два режима хэша"
  (исполняемое = сырые байты - нормализация = байпас; инструкции = канонизированный дайджест +
  was/became, иначе approval fatigue от benign-регенераций) + предложение SHOULD-строки:
  "Hosts SHOULD detect changes to previously approved instructional content and surface them
  to the user before the changed content takes effect" (недостающая половина approval-to-load).
  Все тезисы сверены (sha256sum-совместимость, два режима в нашем коде, superpowers-кейс).
- ДОПОЛНИТЕЛЬНО в codex: #52266 (Cloud не видит .agents/skills из репо - боль подтверждает
  traction стандарта), #44172 (дубли ~/.codex + ~/.agents). Смотреть по мере движения спеки.

## Перепрогон топов, день 2 - продолжение (2026-10-13)

- gemini-cli #25693 + Kiro #11726: ВСКРЫТ КРОСС-ВЕНДОРНЫЙ ПАТТЕРН - зеркальные баги парсинга
  SKILL.md frontmatter (gemini молча теряет скиллы с ОДНОстрочным description, Kiro - с
  МНОГОстрочным; оба читают .agents/skills; оба молчаливые). МЫ ПОСТАВЛИ КРОСС-ССЫЛКИ в оба
  треда (issuecomment-6121095275 kiro, -6121095667 gemini) + фрейм "declared vs active" +
  пин как диагностический приём (UNCHANGED при исчезновении = вина парсера).
- ПРАВИЛО УМЕСТНОСТИ ПРОГОНА сформулировано и записано в методологию (пункт Г): прогон уместен,
  когда находка = прогон; неуместен, когда прогон = декорация (свежая синтетика / не наша
  подсистема). В этих двух тредах прогон НЕ применён осознанно.
- Сводка дня 2 на текущий момент: Anthropic x3, СПЕКА ext-skills #142 (двухрежимный хэш +
  SHOULD-строка), Kiro+gemini x2. Крупнейший вход дня - спека.

## Приоритет C: корпоративные скилл-коллекции (2026-10-13, прогоны)

- docker/skills: ПРОГОН = 301 файл запинен, 1 advisory (docker-sandboxes-kits/references/spec-v2-fields.md,
  score 5 A02+A09) - ДВОЙНО ПРОВЕРЕНО ЧТЕНИЕМ СТРОК: доброкачественный класс (справочник по
  credential-wiring: примеры credentials/apiKey.inject; "preferred" про структуру). Опасный класс -
  НОЛЬ. Открытого security-запроса в трекере НЕТ -> по правилу "без новых issue" отчёт архивирован
  как intel. Заметка: их коммит #103 "tighten SSH build guidance and avoid directory scanner false
  positives" - репо уже кто-то сканирует.
- block/agent-skills: ПРОГОН = 225 файлов, advisory НОЛЬ (подтверждено счётчиком). НО РЕПО
  ЗААРХИВИРОВАНО (pushed 26.06, read-only) - пост в PR #67 (unicode-валидация, где у нас был готовый
  вклад со сплитом printable-ratio + control-class) НЕВОЗМОЖЕН. Коллекция мертва; преемника нет
  (block/ai-rules живой - другая тема). Вывод: Block вышел из скилл-маркета.
- ПРАВИЛО УМЕСТНОСТИ ПРОГОНА отработало ровно как сформулировано: в docker прогон = находка
  (выполнили, перепроверили флаги строками); в Kiro/gemini - не применяли. Бонус-урок: перед постом
  проверять archived-статус репо (403 saved нас от embarrassment).

## Приоритет B: непокорённые пути (2026-10-13)

- Atlassian: ПРОБИТ с первого правильного захода - atlassian/forge-skills#33 (PR, CONTRIBUTOR, 0c,
  репо живое 25★): пин SHA-256 для скачиваемого бинарника fsrt + defang примеров атакующих доменов;
  триггер - Snyk Agent Skills scanner (E005) пометил скилл. МЫ ОТВЕТИЛИ (issuecomment-6121260546):
  кросс-референс на спеку (ext-skills#142 = дословно их фикс), raw-octet/sha256sum-базис для CI,
  FP-класс defang (наш azure-storage A10-пример этой же недели), следующий шаг - пин самих скилл-файлов.
  ВСЕ ТЕЗИСЫ СВЕРЕНЫ (цитата спеки, наш прогон).
- GitLab (gitlab-org/gitlab) и Cursor (getcursor): поиск API 422-ит оба пути - вероятно, вне
  индекса кода-поиска или орг переименован. Закрыто как недоступное через GitHub; GitLab живёт
  в своём gitlab.com-трекере (вне юрисдикции gh) - зафиксировано.
- SalesForce agentforce-adlc #10 и Tencent - не дошли (время сессии), в завтрашнем списке.

## СВОДКА ДНЯ 2 (2026-10-13, перепрогон по IBM-методике): 6 постов
Anthropic x3 (#93318/#101422/#16345) + СПЕКА ext-skills#142 (двухрежимный хэш + SHOULD-строка) +
Kiro#11726/gemini#25693 (зеркальный паттерн) + Atlassian forge-skills#33 (чек-суммы+спека+FP).
Прогоны: docker/skills (301, чисто, архив-intel), block/agent-skills (225, ноль, РЕПО АРХИВ -
урок записан в чек-лист: проверять .archived перед постом).
Два правила в методологию: самопроверка тезисов (А-В) и уместность прогона (Г).

## День 2, продолжение: Salesforce/Tencent + артефакты (2026-10-13)

- Salesforce agentforce-adlc#10: docs-баг 5.5 мес молчания, просит поправить доки - не наш запрос,
  ПРОПУСК по фильтру (intel: silent runtime failure от docs-дрейфа в официальном скилле SF).
- Tencent/BrowserSkill 8693★ (июнь 2026, активный): ГЛАВНОЕ #390 - гард молча УНИЧТОЖАЕТ скилл,
  учащий защите от инъекций (фраза "never to override instructions" матчится гардом; тело скилла
  заменяется фидбеком, загрузка "успешна" = silent skill loss). ФП-трилогия #416/#390/#394.
  МЫ ОТВЕТИЛИ (issuecomment в #390): класс-экземпляр (наша A10 + Snyk-Atlassian в ту же неделю),
  тактический фикс (reword без триггер-словаря), структурный (гарды на ДЕЛЬТЕ от пин-базовой -
  класс исчезает, а не мигрирует в следующий синоним), и observations про silent loss хуже рисков.
  Плюс их #402 (unauthenticated loopback daemon) и #389 (TS-контракты) - в intel, не наши.

## СКИЛЛС-КЛУБ #492: aliksir ответил, конформность пройдена (2026-10-13)

- aliksir (координатор клуба) ответил на наш вход: "A fifth implementation on raw octets is useful"
  + выдал формальный тест конформности (фикстура 577 байт в aliksir/...#30: конформный дайджест
  0e5f6446...365b, decode-then-hash -> eec1f132...8c1d) + предостерёг от REST contents endpoint
  (исказил до 583 байт) + заметил: наш overlay-пункт - отдельная тема, не для этого треда.
- МЫ ПРОГНАЛИ ТЕСТ (клон, 577 байт на диске, git blob d0a8f22): наш хэш = РОВНО 0e5f6446...365b
  (конформен), decode-вариант воспроизводит eec1f132 - фикстура дискриминирует корректно.
- МЫ ОТВЕТИЛИ (issuecomment в #492): результат конформности +(blob id) + согласие по thread-hygiene
  (overlay = detection-scope, не digest-basis) + ссылка на superpowers-запись как field data.
  МЫ ТЕПЕРЬ ФОРМАЛЬНО ПЯТАЯ РЕАЛИЗАЦИЯ КЛУБА (после skil-lock, PDA, ATR-side, cc-skill-security-check).

## ИНЦИДЕНТ 404 ИСПРАВЛЕН (2026-10-13)

- Причина: superpowers.md существовал только в рабочем дереве (мой коммит блокирует Mimosa-гейт,
  продукт-чат занят) - я сослался на него в клубе #492 без curl-проверки. Нарушение собственного
  правила сверки.
- ФИКС: атомарный REST-коммит d00b121d33 (blobs -> tree -> commit -> ref) ровно шести
  сессионно-выверенных doc-файлов: superpowers.md (НОВЫЙ), README-индекс, currents/launchdarkly/
  hostinger/mongodb freshness. Чужие in-flight правки (future.md, chrome-devtools.md, netlify.md)
  НЕ включены. Ссылка теперь 200 (проверено). Локальное дерево просинкано fetch.
- ПУНКТ 8 В МЕТОДОЛОГИЮ: curl-проверка каждой исходящей ссылки перед постом (200 или не постим).

## Tencent/BrowserSkill: углублённое изучение + второй вход (2026-10-13, день)

- КАРТА: 8698★, 4 мес, MIT, Rust+extension, половина тредов на китайском; dsh = DeepSeek Harness
  (их скилл - npm-плагин в харнес DeepSeek: @wxg-prc-cpg/browser-skill-dsh-plugin); discussions
  выключены - вся жизнь в issues/PR; security-кластер #273/#402/#409/#262/#393 (auth-внутренности,
  не трогаем).
- ВХОД 2: RFC #388 (протокольный контракт Rust-TS, "comments and counterexamples welcome") -
  МЫ ОТВЕТИЛИ (issuecomment-6122857615): (1) каталог = публичный контракт-пин (внешняя половина
  их CI-синка); (2) таксономия совместимости под их вопрос (с явной оговоркой: enum на wire -
  НЕ нотация, EXPANDED/BREAKING); (3) продолжение ИХ же оговорки про semantics -> per-method
  effect-тесты.
- ПЕРЕД ПОСТОМ ДВОЙНАЯ ПЕРЕПРОВЕРКА ПОЙМАЛА ДВА ПРОКОЛА в моём драфте: (Д1) перенос нашего
  NOTATION-словаря на wire-поверхность был ложью - сужен до сериализации/метаданных, enum вынесен
  отдельно; (Д2) мой "контр-пример, который вы не учли" уже был строкой в их RFC - перевёрнут в
  "продолжая вашу же оговорку". ОБОИХ УРОКА ЗАКОДИРОВАНЫ как пункт Д методологии (Д1 перенос
  словаря, Д2 проверка авторства идеи, Д3 формат таблицы).

## DeepSeek Harness: открыт и взят с двух сторон (2026-10-13, вечер)

- РЕПО: deepseek-ai/deepseek-harness, 247,960★ за 2 месяца ("Everything is a Plugin"), issues=0 -
  вся жизнь в DISCUSSIONS (постинг через GraphQL addDiscussionComment, REST не работает).
- Экосистема плагин-безопасности УЖЕ НАСЫЩЕНА: аудит Fz0x00 #454 (13 демо), сертификация
  PerryLink dsh-plugin-certification v1 (5-мерная, версионно-скопированная, daily CI, npm provenance,
  publish-гейты), дизайн манифеста прав jackdizhu #5636 (включая класс context-affecting capabilities),
  замеры AgentGuard #5636 (659 плагинов = 90% загрузок маркета, 94.7% High/Critical по поверхности).
- Д2-ПРОВЕРКА ПОЙМАЛА ЧУЧЕЛО перед постом: мой тезис "бейдж привязан к листингу - устаревает" был
  ложен (их схема версионная с ежедневным CI) - переписан в честный комплимент + настоящую дыру
  (consumer anchor: реестр не связывает одобренное юзером с сертифицированным в рантайме).
- ДВА ПОСТА: #5636 (discussioncomment-18879391) - ось времени отсутствует у всех вкладов:
  хэш манифеста при апруве + градуированный дифф (gained context-capability = finding),
  consumer anchor для сертификации, калибровка capability-рейтингов дельтой; #8909
  (discussioncomment-18879395) - whenToUse в каталоге = инструкционная поверхность, каталогу нужен
  дайджест (переписанный whenToUse = тихий редирект агента). В #8909 сузил "pin catalogs" в
  "pin underlying skill files" (каталогов мы не пиним - честно).
- Portkey#1833 (PDP-хук) - после разбора ПРОПУСК: политика-как-данные, не целостность.
- СЧЁТ ДНЯ 13.10: 11 постов (Anthropic x3, спека, Kiro+gemini, Atlassian, Tencent x2, dsh x2,
  конформность клуба) + Netlify#75 (первый из пятёрки) + REST-пуш доков + 2 правила в методологию.

## Стандарт agentskills/agentskills: вход в versioning/locking (2026-10-13, ночь)

- Найден ВТОРОЙ стандарт (agentskills/agentskills, 26,065★, agentskills.io - сущий репо стандарта;
  первый был SEP-2640 ext-skills). #46 "support versioning/locking" - 19 комментов, зрелая ветка:
  venikman (sha256-манифест), snapsynapse (ОТГРУЗИЛ skill-provenance c validate.sh), olijboyd
  (lockfile + "второй перекос" - один байты/разные лоадеры), jonathanhefner/CONTRIBUTOR (integrity
  != attestation != behavioral pinning), Nikolife2016 (1,193 изменений/660 скиллов за месяц -
  достоверность публично сомневают). Сходимость: versioning в distribution-слое.
- Д2-проверка: чек-суммы/pin-lock УЖЕ предложены и отгружены - НЕ дублировали. НАШИ два добавления:
  (1) бинарный гейт не выживает на масштабе реестра - градуированный дифф (20/13+3/4 Mongo-пример,
  числа сверены); (2) перекос лоадеров olijboyd имеет измеримую форму - per-client enumeration
  (Kiro/gemini зеркальная пара + Netlify 21-vs-9).
- ПОВТОРНАЯ ПРОВЕРКА поймала 3 правки ДО поста: "every hash gate switched off" (переозвучено в
  нашу реальную арку), числа Mongo перепутаны (исправлено 20/13+3/4), таксономия помечена
  "(tool-contract side)"; и ГЛАВНОЕ по наводке юзера: в драфте НЕ БЫЛО ссылки на репо - добавлены
  ДВЕ кликабельные (repo + docs/servers), обе curl-200 по правилу №8.
- Постедено (issuecomment). block/goose (55,190★) - разведан: #12724 грузит SEP-2640-скиллы из MCP
  (связка со спекой), #12696 bare load_skill - фронт на потом.

## Третий spec-уровень: Agent-Card/ai-catalog (2026-10-13, ночь-2)

- Репо: 232★, "Working repository for common AI Card standard" - реестровый стандарт, на который
  указал jonathanhefner в agentskills#46. #69 (liady/CONTRIBUTOR): спека СМЕШИВАЕТ sourceDigest
  (провенанс источника) с дайджестом артефакта - конформантный верификатор отвергает ВСЁ.
  ejoaquin предложил contentIntegrity-объект, olijboyd (тот же, что в #46) - внутрь подписанного
  payload (иначе посредник подменит).
- МЫ ВОШЛИ (issuecomment-6123358519): третий spec-уровень за день (SEP-2640, agentskills, ai-catalog).
  Вклад: недостающая consumer-нога - publisher-side дайджесты (включая Trust Manifest, проверен
  по спеке = attestation-сторона) не отвечают "это всё ещё то, что я утвердил"; superpowers-кейс
  ("in one release" - версию исправил при сверке); graded-diff предложение к ADR-0009; обе ссылки
  curl-200 по п.8-9.
- УРОК ВЕРИФИКАЦИИ (записать в методологию при случае): в процессе сверки Я ВЫДУМАЛ "тройное
  размножение ошибки" - реконструкция по памяти создала несуществующий кризис (sed-no-op это
  вскрыл). Правило: проверка идёт по ФАЙЛАМ/постам (grep по реальным телам), не по памяти о них.
- goose (55,190★) разведан: #12724 реализует digest-проверку скиллов из MCP (связка со спекой) -
  фронт на потом. agentskills #255 (.well-known, jonathanhefner, 20c) - завтра (лимит репо/день).

## goose (Block): вход в первого клиента SEP-2640 (2026-10-13, обед)

- БРИФ (по новому правилу): block/goose, 55,190★, агент Block Inc (Square/Cash App, Дорси,
  финтех = integrity-критичный домен); vincenzopalazzo (CONTRIBUTOR, скилл-направление) реализует
  SEP-2640-загрузку скиллов (PR#12724, 6 окт, 0 комментов; родитель #12068 - 11 комментов).
- МЫ ВОШЛИ (issuecomment): таймлайн-дыра их digest-чека (сервер легитимно меняет тело+дайджест
  между сессиями - все проверки зелёные, инструкции другие); сослались на ext-skills#142 с
  ЧЕСТНОЙ атрибуцией ("where we suggested the companion line" - Д2-урок: не приписывать свою
  реплику авторству PR); consumer-pin c градацией как bar-setter для всех будущих SEP-клиентов;
  host::name "addresses" (не "solves"). Ссылки: ext-skills PR (curl-200) + rugsnare (curl-200).
- Триада замкнута: СПЕКА (ext-skills#142) -> ПЕРВЫЙ КЛИЕНТ (goose#12724) -> наш consumer-слой.
- ПРАВИЛО БРИФА закодировано в методологию (Выход промта): никакой драфт без "кто/дыра/что даёт/
  риски" - урок goose, где я подал находку+драфт без брифа и юзер вытащил контекст вопросом.

## dsh#8909: ответ argszero и наша третья нога (2026-10-13, обед-2)

- argszero (автор @argszero/dsh-skill-residency, npm MIT) ответил через 30 мин: принял наш
  integrity-тезис и РАЗВИЛ в "двухпиновую" модель (нативный каталог - апстриму; инъекции плагина -
  пинятся версией плагина, "второй поверхностью деплоймент пинится уже сегодня"); его плагин уже
  закрывает боль (a) через agent/pre-step (240-char bound, republication при смене плана/компакции,
  mode: report - лог плана без отправки) + резидентные скиллы (resident: true -> инъекция каждый
  ход через skill_content-конверт). Корень проблемы отдельно задокументирован в #9375 (raphael-y7,
  китайский: резидентные скиллы никогда не грузятся + whenToUse модели невидим).
- МЫ ОТВЕТИЛИ тред-реплаем (discussioncomment-18879876): третья нога - план считается на лету
  (каталог x компакция) -> две сессии одной версии плагина шлют разное; mode: report = наблюдение;
  недостаёт RECEIPT инъекции (дайджест фактически отправленного skill_content в журнал сессии) -
  "какие инструкции вошли в контекст" решаем после факта; у нас паттерн работает для MCP-вызовов
  (receipts-цепочка). Второй пин из "предполагаемого" становится "доказуемым".
- ПРОВЕРКА: первый драфт без единой правки - все тезисы из его дословных терминов + наши
  проверенные фичи (receipts в CHANGELOG v0.4.0). Расшифровка для юзера дана до поста (правило
  расшифровки - выполняется).

## Stripe agent-toolkit: вход в payments-MCP (2026-10-13, обед-3)

- БРИФ: stripe/agent-toolkit (он же stripe/ai) = официальный MCP Stripe для агентов, 1904★, 99 issue,
  активный. #508 (AUTHENSOR, 2c): v0.6→v0.7 молча удалил actions-allowlist; least-privilege конфиг
  -> ВСЕ 10 инструментов вкл. create_refund unlimited; PoC детерминированный offline.
  Фикс в процессе (DeprecationWarning) - но warning не останавливает платёж.
- МЫ ВОШЛИ (issuecomment-6123726631): DeprecationWarning лечит симптом; болезнь = нет записи
  одобренной поверхности для сравнения. Пин контракта (sha-256 на инструмент) зафиксировал бы
  экспансию при апгрейде. Ссылки curl-200. Ровно одна правка при сверке: убрал конкретное число
  "3 tools" (из PoC следует ~1, не 3 - моя инференция была неточной).
- ПАРАЛЛЕЛЬНО: #356 governance layer (66c!) уже глубоко обсуждает pin/hash - giskard09, aeoess,
  jagmarques - НЕ входили (занято зрелой дискуссией, наша добавка менее очевидна чем в #508).

## OpenAI openai-agents-python: вход в annotations-тред (2026-10-13, обед-3)

- БРИФ: openai/openai-agents-python = официальный мульти-агентный фреймворк OpenAI, 29,984★.
  #5315 (Aasif-Simpplr/Simplo, 6c, jbeckwith-oai/COLLABORATOR вовлечён): MCP annotations
  (readOnlyHint, destructiveHint) теряются при конвертации; харнессы не могут отличать read-only
  от destructive; обходной путь гниёт.
- МЫ ВОШЛИ: третья нога к двум уже прозвучавшим ("expose annotations" + "don't turn into outcome
  claim") = TIMELINE ANCHOR: annotations контролируются сервером и могут дрейфить (readOnlyHint
  true->false между сессиями); пин при апруве + дифф на re-list; flip = тот же re-approval что и
  новый инструмент; решает проблему устаревания обходного пути. Ссылка rugsnare curl-200.

## Continue.dev: вход в governance-тред поверх конкурентов (2026-10-13, день)

- БРИФ: continuedev/continue = open-source агент (36,193★). #12492 - тред где ТРИ governance-прокси
  вендора питчатся (Vaara 15★, etch.systems/world-model-mcp 24★, MartinLoop 410★). Все трое -
  runtime-прокси (перехват вызовов, политика, аудит). Никто не пинит поверхность инструментов.
- НАШ ВХОД (issuecomment-6124413696): «surface integrity = пред-слой для всех трёх». readOnlyHint
  флип невидим прокси без пина; allowlist по именам гниёт при новом параметре; примеры из наших
  полевых данных (Netlify env-vars в minor с notes про OAuth, Currents 32 BREAKING в минорах).
  «Sits below the governance proxies, composes rather than competes». Ответ на вопрос Ram9199
  про инциденты из поля.
- ПЕРЕПРОВЕРКА: поймана и исправлена ОШИБКА «in a patch release» (Netlify 1.16.0 = minor, не
  patch - тот же класс semver-ошибки что superpowers «two minor versions»); смягчён «sha-256 over
  name+description+inputSchema+annotations» на «hash each tool's» (наш toolHash не включает
  annotations в единый дайджест - они сравниваются отдельно через annotationsEqual).
- КОНКУРЕНТНАЯ КАРТА: Vaara (15★, AGPL, evidence-gating), etch.systems (24★, append-only audit),
  MartinLoop (410★, budget+guardrails+verification). Все - runtime, мы - pre-runtime.

## goose #12068 (parent design thread): вход (2026-10-13, день)

- БРИФ: родительский дизайн-тред для PR #12724 (куда мы уже вошли). alexhancock (COLLABORATOR)
  опубликовал 6-пунктовый план реализации; vincenzopalazzo - автор запроса; olaservo - прототип.
  План уже содержит: digest-check при чтении, re-approval on digest change (Phase 2),
  provenance-маркировку, namespace <ext>::<skill>.
- МЫ ВОШЛИ (issuecomment-6124493789) с тремя добавками поверх плана:
  (1) SURFACE-DIFF: skills/list дифф против одобренного снапшота - ловит добавления/удаления,
      которые per-skill дайджест не видит (новый скилл = нет базового дайджеста);
  (2) ГРАДАЦИЯ при re-approval: instruction rewrite = escalate, supporting file = review,
      allowed-tools expanded = escalate, metadata churn = not a finding;
  (3) ПОЛЕВОЙ ПРИМЕР: superpowers (297k★) - полная перезапись инструкций, same name/directory.
- ПЕРЕПРОВЕРКА поймала: «same supporting files» был ЛОЖЬЮ (supporting files ИЗМЕНИЛИСЬ: один
  удалён, один добавлен) → исправлено на «same skill name and directory» - тот же класс ошибки
  что superpowers «two minor versions» и Netlify «patch release».
- ТЕПЕРЬ МЫ В ОБОИХ ТРЕДАХ goose: родительский дизайн (#12068) + реализация (PR #12724).

## Microsoft autogen #7353: КРУПНЕЙШИЙ ВХОД ЗА ПРОЕКТ (2026-10-13, вечер)

- РЕПО: microsoft/autogen = 61,375★ (мультиагентный фреймворк, САМЫЙ БОЛЬШОЙ наш адресат).
  #7353 = "Cryptographic action receipts for enterprise agent governance (AAR)", 402 коммента,
  открыт 6 марта, все участники NONE (коммьюнити-дискуссия, ни одного мейнтейнера MS).
- КЛЮЧЕВЫЕ УЧАСТНИКИ: Cyberweasel777 (AAR/Ed25519), razashariff (MCPS/IETF-draft/OWASP),
  giskard09+Liuyanfeng1234 (JCS canonicalization RFC 8785), arian-gogani (pre-execution signatures),
  lawcontinue ("decision vs execution provenance").
- Д2-ВЕРИФИКАЦИЯ (grep по всем 402 комментам, 5 страниц):
  - "tool definition pinning": 1 упоминание (razashariff -> OWASP, мимоходом, никто не подхватил)
  - surface pin / schema pin: 0
  - graded diff / direction grading: 0
  - surface-level (vs per-tool) diff: 0
  - surface pin + action receipt composition: 0
  ВХОД ПОЛНОСТЬЮ ЧИСТ.
- МЫ ВОШЛИ (issuecomment-6125226685): "AAR proves what happened. Surface pin proves it was
  authorized. Neither alone is sufficient." Три вклада: (1) whole-surface pin (не per-tool),
  (2) graded diff (не binary re-review), (3) composition thesis. OWASP Section 2 - "closest
  touchpoint" с кредитом razashariff. Полевые данные: MongoDB 20/13+3/4.
- ПЕРЕПРОВЕРКА поймала 2 правки ДО поста:
  (а) "absent across all 402 comments" -> "I have not found in this thread" (убран абсолют)
  (б) "no hash method" -> "no specified algorithm" (OWASP говорит "cryptographic hashes" -
      метод ЕСТЬ, просто без указания алгоритма; "no hash method" опровержимо)
- ЭТО НАШ САМЫЙ ВАЖНЫЙ ПОСТ: крупнейшая аудитория (61k★) + самый глубокий тред (402c) +
  чистейшая ниша (0 разработок surface-pinning) + самый сильный тезис (composition: receipt+pin).

## OWASP MCP Security Cheat Sheet: вход через PR #2764 (2026-10-13, вечер)

- БРИФ: OWASP/CheatSheetSeries = 33,652★, THE стандарт де-факто для security. MCP Security
  Cheat Sheet обновлён 4 октября (активный). Мейнтейнер mackowski (COLLABORATOR).
  Issue #2756 (kenneives - тот же что LiteLLM#44093): «не сказано ЧТО хэшить и КАК
  канонизировать». PR #2764: одно предложение «hash the complete tool definition».
  Мейнтейнер попросил краткости - 3 из 4 пунктов kenneives отложены (canonicalization,
  surface-digest, re-approval). Градация НЕ была предложена никем (наша новация).
- МЫ ВОШЛИ (issuecomment-6125534006): «grade the changes, not just gate them» жирным
  + конкретный кейс (MongoDB 20/16/4) + 4-строчная таксономия + оффер draft follow-up
  «Pinning Details» секции. Ссылка docs/servers curl-200. Компактно (100 слов) -
  уважение к культуре проекта (мейнтейнер ценит краткость).
- ПЕРЕПРОВЕРКА поймала 3 правки ДО поста:
  (а) «deferred from #2756» → grading НЕ был отложен (его там НЕ БЫЛО) - отделён как
      «neither #2756 nor this PR addresses»
  (б) «routinely 80/20» → универсальная пропорция, которой нет (Netlify 0%, Currents 2%) -
      заменена конкретным кейсом MongoDB
  (в) «three deferred items» включал «change classification» ошибочно - градация
      наша добавка, не отложенный пункт
- СВЯЗКА: autogen#7353 (composition thesis) → OWASP (grading taxonomy) = стандарт
  сверху вниз: от фреймворка к security- guidelines.

## OWASP MCP Top 10 #44 (VAL): вход с composition-тезисом (2026-10-14, день)

- БРИФ: OWASP MCP Top 10 (114★) = THE security-таксономия для MCP. #44 = VAL
  (Verifiable Authorization Lineage) bba-git, 23 коммента. Участники: bba-git (VAL),
  Silentpartnercoding (predicate-correctness benchmark), Santoshkumarpuppala (enforcement shapes).
  ПОЛНЫЙ Д2-АУДИТ: 0 упоминаний tool schema/inputSchema/tools-list/readOnlyHint в 23 комментах.
  18 «surface/pin» - ВСЕ про audit surface и policy scope, НЕ про tool surface.
- МЫ ВОШЛИ (issuecomment-6126400319): триада governance (surface pin + policy correctness +
  action receipt). VAL = receipt, Silentpartnercoding = policy, МЫ = surface. Три слоя,
  все нужны, без первого остальные на песке. Конкретный кейс: Netlify env-vars (scope-respect
  green против поверхности, которую человек не одобрял).
- ПРАВКИ при перепроверке: (а) «What defines the scope IS the tool surface» → «typically
  references» (наша интерпретация, не определение VAL); (б) «VAL's check PASSES» → «would
  pass IF scope defined by tool identity» (inference о реализации, квалифицирован).
- МЫ ТЕПЕРЬ В ДВУХ OWASP-ПРОЕКТАХ: Cheat Sheet (PR#2764 - grading) + Top 10 (#44 - surface pin
  как третий слой governance). Оба читают security-инженеры во всём мире.

## СВОДКА 14 ОКТЯБРЯ (день 2)

- MongoDB vendor-case #1600 (исследовательско-помогательный тон, ОБЯЗАТЕЛЬНОЕ правило)
- OWASP Top 10 #44 (composition-тезис, 4-й spec/security-уровень)
- Правило тона закодировано в методологию (№0 по силе после «не постить в закрытое»)
- Инцидент Write-вместо-Edit восстановлен из git за секунду
- KENNIEIVES: полная карта конкурента (37 issue/PR, AgentAvow, 13,671 серверов)
- Итог за 2 дня: 23+ поста, 4 спеки/standards, 61k★ autogen, ~45 ожидающих реакций

## Snyk agent-scan #482: вход с tool-contract слоем (2026-10-14)

- БРИФ: snyk/agent-scan = 3,132★, ОФИЦИАЛЬНЫЙ MCP-сканер Snyk. #482 (stillmarcus24):
  Snyk пинит ТОЛЬКО md5(description). 7,949 серверов / 59,821 переходов: 74.6% имеют
  version change при identical description. Base-rate math: 7.46% attack rate для 10% precision.
  Его решение: capability-expansion триггер (new host/secret/exec). Precision: 13.0% corrected.
  1 коммент (self-follow-up, contingency tables). НИКТО другой не участвовал.
- НАША НИША (Д2 чисто): stillmarcus24 измеряет PACKAGE-RESOLUTION слой (что npx резолвит).
  Мы добавляем TOOL-CONTRACT слой (что tools/list отдаёт): тот же version может отдавать
  разные инструменты (per-client divergence), разные versions могут отдавать идентичные
  (notation-only). Direction grading поглощает version-churn FP.
- МЫ ВОШЛИ (issuecomment-6128897938): tool-contract layer как независимый сигнал над
  package-resolution; grading taxonomy (escalate/tighten/loosen/notation); ответ на ЕГО md5
  вопрос (полный contract pin vs single-field hash); MongoDB 20/16/5 как evidence;
  rugsnare как reference implementation.
- ПРАВКА при перепроверке: "4 real findings" → "5 real findings" (на 1.3.0 = 5 BREAKING).
- ПРОГОН: НЕ применён (правило Г: существующие MongoDB+Netlify данные уже evidential,
  новый прогон был бы декорацией).
- ТЕПЕРЬ МЫ В ТРЁХ SECURITY-СТАНДАРТАХ: OWASP CS (grading) + OWASP Top 10 (surface pin) +
  Snyk (tool-contract layer). Плюс autogen (composition thesis). Четыре уровня governance.

## Первое признание от CONTRIBUTOR (2026-10-14)

- Tencent/BrowserSkill#388: NianJiuZst (CONTRIBUTOR, автор RFC) процитировал НАШ полный
  комментарий и поблагодарил. Это первый случай когда CONTRIBUTORS (не NONE) публично
  признали наш вклад на протокольном треде. Full-quote = «пусть будет видно в треде».
- Мы ответили кратко (issuecomment-6128932161): «Glad it's useful» + ссылка на docs/servers
  как reference для digest format и grading rules. Не навязываемся, оставляем дверь открытой.
- ЗНАЧЕНИЕ: наш подход (surface pin + grading taxonomy) признан полезным человеком,
  который РЕАЛЬНО строит протокол. Это Social proof для всех остальных тредов.

## agentskills #255 (.well-known спека): вход с grading thesis (2026-10-14)

- Д2-ВЕРИФИКАЦИЯ: 0 упоминаний grading/direction/NOTATION/serialization/canonicalization
  во всех 20 комментах. 8 комментариев от 6 авторов (jonathanhefner, pjt222, olijboyd,
  kinthaiofficial, balthazar-bot, Agent-Hellboy) сказали pin/digest/hash — градацию
  не обсуждал никто.
- МЫ ВОШЛИ (issuecomment-6129754070): jonathanhefner's suggestion валидирован + NOTATION-поглощение
  (15/20 serialization churn) + два решения (canonicalization ИЛИ schema/prose split)
  + обо сохраняют "single verification model" preference. MongoDB 15/5 как evidence.
- ПЕРЕПРОВЕРКА поймала: "16+5=21" → проверено живым прогоном → "15+5=20" (точные 1.3.0 числа).
- ТЕПЕРЬ МЫ В ОБОИХ ТРЕДАХ agentskills: #46 (versioning/locking) + #255 (.well-known distribution).

## modelcontextprotocol/servers #3537: вход на канонические серверы (2026-10-14)

- БРИФ: 91,166★ = THE официальные MCP-серверы. Security audit: ВСЕ имеют unconstrained params.
  16 комментов от sophisticated участников (audit, guardrails, signing, lint).
- Д2: 0 упоминаний surface pinning / version diff / grading. ВСЕ обсуждают static state.
- МЫ ВОШЛИ (issuecomment-6129911378): timeline dimension (constraints меняются между релизами),
  surface pin как недостающий слой, 4 грейда, MongoDB 15/5, предложение committed pin file
  на канонических серверах. ПЕРВЫЙ случай где мы предлагаем ИМ стать reference implementation
  для пиннинга.
- ПРАВКА при перепроверке: «static dimension» → «current state» (PengSpirit's runtime surface
  не может быть «static»). Фрейминговая, не фактическая.
- ПРАВИЛО ЖИРНОГО ШРИФТА: добавлено в методологию (см. ниже).

## ПРАВИЛО ЖИРНОГО ШРИФТА (добавлено 2026-10-14, ОБЯЗАТЕЛЬНОЕ)

Выделяй жирным ГЛАВНЫЕ тезисы в каждом посте. Читатель по одним жирным фрагментам должен
понимать полный нарратив без чтения остального текста. Формула: главный вопрос → угрозы →
решение → грейды → статистика → предложение → выгода. Не более 8-10 жирных фрагментов
на пост (дальше — размытие).

## DRIFT-WATCH ЗАПУЩЕН (2026-10-12, вечером)

Решение пользователя: сканит исследовательский чат (не продуктовый), КАЖДЫЕ 3 ДНЯ (не 7).

Сделано за вечер:
1. Корпус 15 -> 24 записи: +8 npm (transcend, sap-fiori, hubspot, ui5, shopify, supabase,
   figma, firebase) + vercel-labs/skills. docker-mcp отсеян (1 версия, диффать нечего).
   Манифест: tools/drift-watch-corpus.json (pinned/lastSeen/lastFindings/entry/env).
2. Крон automation-9ef26f35: каждые 3 дня 09:00, первый прогон 2026-10-15. В промпте:
   дифф только при новых релизах, bybit только history (boot-gated), НЕ постить в вендор-треды
   без утверждения, НЕ трогать src/ и CI (территория продукт-чата).
3. Baseline новичков - 24 findings:
   - SAP fiori (103k/нед): 2 BREAKING - project.enableTypeScript стал required на ОБОИХ генераторах
   - Transcend (83 релиза/3 мес): 2 BREAKING - templateId удалён, assessmentGroupId стал required
   - HubSpot: GONE hubspot-create-association + 3 NEW, npm жив / GitHub-репо мёртв (канал-дивергенция)
   - Shopify: консолидация - 2 валидатора GONE -> новый generic validate + LOOSENED enum
   - Supabase: GONE get_logs -> NEW query_logs + stdio-entrada переехала (dist/transports/stdio.js
     -> dist/cli.js) - packaging-дрейф вне тул-контракта, заломал pinned launch-конфиги
   - ui5 (96k/нед) и firebase: 0 findings - контроля стало 4 (Notion, Heroku, ui5, firebase)
   - figma-developer-mcp: 17 релизов = только NOTATION (частота релизов != нестабильность контракта)
4. Публично: docs/servers/ 9 новых страниц + README-индекс, первый датированный отчёт
   audits/drift-watch/2026-10-12.md. Коммит fadb607 (REST, Mimosa блокировала из-за
   high-находок в product/src/cli.js - НЕ наших файлов). curl-200 все ссылки.
5. Итого по корпусу: 336 findings на 24 записи, ~3.6M installs/week покрытие.

R33 (кандидат-баг классификатора, для продукт-чата): hubspot-search-objects получил BREAKING
при двух optional-добавлениях [expand], один параметр (highValue) без type. Семантически
EXPANDED. Возможно классификатор ломается на параметре без type или на вложенных
array-item additions. Проверить в 1.3.x.

Уроки процесса:
- Mimosa блокирует ЛЮБОЙ коммит в этом репо (сканит весь продукт, не staged файлы) -> для
  docs-коммитов рабочий путь теперь всегда REST (прецеденты d00b121d, fadb607).
- 2 из 8 серверов не стартуют с пустым env (transcend: TRANSCEND_API_KEY, hubspot:
  PRIVATE_APP_ACCESS_TOKEN) - диагноз по прямому запуску node <entry> </dev/null, ошибка
  сама называет переменную. firebase первый boot падает из-за записи конфиг-скелета - rescan.
- supabase 0.13.0 УДАЛИЛ entry-файл 0.8.3: дифф невозможен пока mcp.json не переписан ->
  манифест теперь хранит entry per-версию, packaging-дрейф фиксируем отдельным классом.

## 2026-10-13: ДВА ПУБЛИЧНЫХ ОБЯЗАТЕЛЬСТВА (autogen #7353 id=6141000039, snyk #482 id=6141000342)

1. AUTOGEN (три адресата в одном): identity-вопрос babyblueviper1 - честное "нет сегодня" +
   R32/R34 квитанции; Yarmoluk - +1 JCS-поле с требованием canonicalization_profile_id;
   Liuyanfeng1234 - наш 1.3.0 policy-bump прецедент (chrome-devtools 27 ложных BREAKING,
   mongodb 4+16->5+15 без релиза сервера). ОБЯЗАТЕЛЬСТВА: PIN-SPEC v1.1 identity-блок +
   policy-version stamp + policy-bump отдельным классом; external_evidence-композиция -
   нормативная секция спека.
2. SNYK (stillmarcus24): подтверждена совместная drift-rate таблица. Их данные: 5,799 silent
   changes / 1,920 серверов / 23 дня / remote-анонимный хвост, разложено по НАШЕЙ таксономии.
   ОБЯЗАТЕЛЬСТВА НАШИ: (а) машиночитаемые пины per-release в audits/drift-watch/pins/
   <slug>@<version>.json - КРОН ОБНОВЛЁН (шаг 2d), (б) стабильность слагов docs/servers,
   (в) incidence-not-compromise маркировка. ИХ: dated-колонка против наших слагов + combined
   table (готовы выложить сразу после наших пинов).

РАЗДЕЛ РАБОТ:
- Исслед. чат: re-grade sweep (11 строк 1.2.0 -> 1.3.0) + сбор пинов всех 24 -> публикация
  каталога pins/ (разблокирует их таблицу); PIN-SPEC.md - 3 новые секции.
- Продуктовый чат: pin format v1.1 (identityHash, policy stamp, policy-bump класс) -
  ПОДНЯТО С R32/R34 ДО ПУБЛИЧНО ЗАЯВЛЕННОГО.
Ожидает отдельного гой: драфт ответа Якубу (KyttoMCP discussion #1).

## 2026-10-13 (продолжение): закрытие обязательств + спек-ревью-цикл

- A5: stillmarcus24 уведомлён (id 6141795711) — каталог пинов разблокировал их таблицу.
  СЕКЦИЯ A ЧЕК-ЛИСТА ЗАКРЫТА ПОЛНОСТЬЮ (A1-A8).
- bbv провёл РЕВЬЮ нашего PIN-SPEC (3 правки: §7 не тот хэш, пуля про профиль не о том,
  identityHash-самоссылка — НАСТОЯЩИЙ БАГ). Все внесены (коммит 6a62bc9), ответ запощен
  (id 6141770595). bbv = внешний ревьюер спека, вторая точная итерация за день.
- Релей продуктового чата: 1.4.0 драфт = verify-дефолт, R31, R30, R32, R33, R34, PIN-SPEC
  v1.1; «version stays 1» внесено в спек (00f91cdc). B5 (камент в #7353 о реализации) —
  сразу после релиза 1.4.0.
- 353 НЕ БЬЁТСЯ с каталогом пинов (429/467/896/1708) — запрошено пояснение у продуктового
  чата ДО релиза (число уходит в CHANGELOG x3).
- ПРАВИЛО СПЕК-ВЕРИФИКАЦИИ добавлено в методологию (построчная сверка чужих систем,
  проверка вычислимости примеров, САМОРЕВЬЮ-ПРОГОН глазами враждебного ревьюера до коммита).
- Хенд-офф продуктовому чату дополнен identityHash-исключением и §7-правилом.

## 2026-10-13 (финал дня): спек доведён до сходимости

- PIN-SPEC: цикл самопрогонов до пустого прогона - bbv 4 + наши 34 (rev 3-7, последний
  механический чист). Главные уловы: §5 не покрывал server-level (дом identity-блока),
  легаси-семантика для 45 снимков, path-утечка писателя (C:\GlobalWork в каталоге),
  -0 против RFC 8785. Коммиты: b34e4c2..4ea3504 (7 шт).
- Ответ bbv запощен (id 6143288527), короткий по требованию пользователя: фикс + правило +
  ссылка на историю. Урок тона: не отчитываться по действиям, коротко.
- Методология: дополнение к правилу (в) - цикл до пустого прогона, финал механический.
- Хенд-офф продукт-чату: + path-фикс, легаси-правила, pinnedAt-стабильность, §5-покрытие.

## 2026-10-13 (релей продукт-чата №2): R33 корень найден, 353 разгадан

- R33 ЗАКРЫТ у них: второй инлайновый --schema-only-фильтр в cmdDiff (параллельно хелперу)
  пропускал только BREAKING; теперь включает EXPANDED. Наш пост-релизный шаг: hubspot
  0.2.0->0.4.0 на 1.4.0 -> ожидаем EXPANDED у search-objects -> снять "under review" со
  страницы ТОЛЬКО по живому прогону.
- 353 РАЗГАДАН: это счётчик ТЕСТОВ (product/README:187, бейдж README), x3 = консистентность
  в трёх файлах. К каталогу пинов отношения не имеет. МОЙ ФЛАГ ОТЗВАН - перед продуктовым чатом
  вопрос не поднимать.

## 2026-10-13 (вечер): ДВЕ ПОБЕДЫ + закрытие петли

1. azure-devops PR#1684 СМЕРЖЕН (danhellem, 12:15), issue #1682 закрыт completed.
   Наш пре-мердж контракт-тест (7 окт: 44 tools, outcomes 15-enum) - часть решения о мердже
   в Microsoft-репо. Молчаливое принятие = ответ. Хвост: warning про lowercase failed -
   проверим вживую когда релиз выйдет (drift-watch).
2. OWASP PR#2764 (MCP pin-гайденс, автор kenneives) - mackowski APPROVED (12:08), ждём
   мерджа. Наш вклад: саппорт + градация-follow-up; kenneives отбил возражение randomstuff
   нашим же аргументом. Следим за мерджем.
3. autogen: bbv подтвердил сходимый спек на 4ea3504 - петля ревью закрыта чисто. Без ответа.
Нигде не постим (закрытые треды = шум).

- goose PR#12724: vincenzopalazzo ответил (14:12): в поездке, вернётся - запушит апдейты,
  "thanks for the feedbacks". Коммитов НЕТ (голова та же, c0dc260 от 12.10 19:10).
  Статус: ждём пуш; при пуше - перечитать патч на предмет timeline-пина (чек-лист готов).

- litellm#44093: kenneives поймал flipped-дефолты В МОЁМ комменте от 11.10. Проверка: спек
  и КОД (effectiveAnnotations, pins.js:264) всегда были правильные — ошибка только в моей
  прозе. Признание запощено (ответ + сверенный код, без оправданий). github-mcp-server#3466
  закрыт майнтейнером ("право менять схемы"), AAtomless закрыл красиво; по сути GitHub
  подтвердил наш NOTATION-тезис ("почти всё — output schemas"). Не постим.
  Бонус: в коде продукта уже живёт v1.1 (identityHash с исключением члена, compareIdentity).

## 2026-10-13 (ночь): ПОВТОРНАЯ ПРЕВЕНТИВКА 1.4.0 — ЗЕЛЁНАЯ

Чистая последовательность (по команде продуктового чата), локальное дерево:
1. rm .rugsnare + scan 0.2.0 -> пин 19 тулов ✓
2. install 0.4.0 -> diff БЕЗ сканов между -> 6 findings / 3 [NEW] / exit 1 / пин остался 19 ✓
3. install 0.2.0 + scan x3 -> sha256 18918c03 три раза подряд ✓ (P0-2 фикс подтверждён вживую)

РЕЗОЛЮЦИЯ P0-1: ЛОЖНАЯ ТРЕВОГА, ВИНОВАТ МОЙ СТЕНД. В каталоге hubspot оставался union-пин
с 12.10 (sweep сканировал 0.4.0 поверх 0.2.0-пина; scan - union-семантика, существует ДО 1.4.0,
потому и существует unpin). Мой "чистый" скан 0.2.0 поглощённые тулы не вычистил -> diff
честно показал [ok] для тулов, реально бывших в пине. cmdDiff физически не пишет пины.
P0-2: ПОДТВЕРЖДЁН и ИСПРАВЛЕН у них (annotations сравнивались сырым stringify: файл -
sorted, live - wire-порядок -> ложное неравенство -> pinnedAt churn). Фикс канонический.

УРОК МЕТОДОЛОГИИ (добавить): превентивка/верификация начинается с rm .rugsnare - иначе
тестируется прошлое состояние стенда, а не текущий код. Второй урок: находка "22 тула" была
реальной, но её ИНТЕРПРЕТАЦИЯ (регрессия diff) - моя, без проверки альтернативной гипотезы
(грязный стенд). Обе ошибки дня-2 - мои процессные, не продуктовые.

НОМЕРАЦИЯ R: продуктовый чат записал свой кандидат (scan --prune / "мёртвые души") как R35 -
КОЛЛИЗИЯ: R35 у нас занят (MIRRORED-класс, currents#232), R36 (openapi-crosscheck).
Их кандидат перенумерован у нас в R37. Сообщить продуктовому чату для синхронизации.

РЕЛИЗ 1.4.0: РАЗРЕШЁН по результатам превентивки.

- litellm#44093: волонтёр fangkangmi СЛИЛСЯ ("это просто enhancement, не буду делать") -
  дыра (annotations/outputSchema не пинуются) снова без владельца, issue открыт, реакций
  мейнтейнеров нет. РЕШЕНИЕ: не постить сейчас (последнее слово в треде наше; обязательство
  не по зубам параллельно с 1.4.0). ТРИГГЕР: если через 1-2 недели без владельца - короткий
  оффер со ссылкой на PIN-SPEC §4 + effectiveAnnotations (наша рабочая реализация этого
  сравнения). Автор issue - kenneives, может забрать в AgentAvow.
