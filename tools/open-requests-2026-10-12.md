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
