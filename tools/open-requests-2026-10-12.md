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
