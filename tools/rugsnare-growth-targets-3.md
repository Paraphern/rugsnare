# Волна 4: ещё 50 целей, 500+★, с открытыми болями

**Дата:** 2026-10-21 · Не пересекается с волнами 1–3 (70 целей) и уже прогретыми. Боль: 40 из 50 — прямые issue-ссылки, остальные — кураторские/платформенные с обоснованием. Все ≥500★, живые.

**СТАТУС ПРОГОНА (обновлено 2026-10-22):** запощено 21.10 (Тир 1, 5/5): #24 camel#4414, #33 composio#1981, #37 voltagent#594, #56 uber#163 (+ наш ответ Aicent-com 22.10), #116 agentskills#42. **Тир 2/Тир 3 закрыты 22.10 — запощено 3:** #50 repomix#1933 (6348008745), #78 arxiv#296 (6348010991), #138 claude-seo#319 (6348004439, приоритет). **#44 caveman#1333 — ЗАПОЩЕНО 6348605473 (22.10).** Downgraded: #55 skill-recorder#8 (их боль = allowed-tools ПАТТЕРНЫ, не наш schema-guard класс). Вычеркнуто: #8 litellm, #12 inspector, #57 SkillSpector. **Отсев 7 с причинами:** #48 Scrapling#511 (закрыт без обсуждения), #76 excel#211 (мейнтейнер публично против сторонних бейджей), #82 korean-law#176 (закрыт as suggested), #21 letta#3452 (анти-спам гейт), #9 blender#366 (боль саморазрешилась compat-обёрткой), #18 gpt-researcher#2192 (пофикшен), #120 superpowers-zh#95 (Zcode добавили сами в v1.7.12). Грейдеры: mcp.market (thebigasif) + Hlido + MCPwell (в самом #1333). Остаток волны 4-5 (~100 целей, секции A-F) — следующий прогон; далее волна 7 (growth-targets-4.md, 500 целей, колонка «Вердикт»). Полная фактология — rugsnare-targets-tracker.md.

**Три явления этой волны:** (1) сторонние MCP-safety-грейды уже существуют (MCPwell-бейджи, Hlido, «independent MCP safety scan» — repomix и Scrapling по 92/100, AI Skill Shield прошёлся по трём коллекциям скиллов) — рынок голосует за доверие-как-сервис; (2) в курируемых skills-списках найдены ЖИВЫЕ эксфильтраторы (#594, #663); (3) переименования серверов ломают клиентов (blender-mcp→mcp-for-blender).

## A. Терминалы / роутеры агентов

| # | Репо | ★ | Боль (ссылка) | Заход RugSnare | Вердикт: входим? |
|---|---|---|---|---|---|
| 1 | [sst/opencode](https://github.com/sst/opencode) | 219.6k | MCP-first терминал; прямого тикета поиск не дал (болями завалены их discussions) | `rugsnare wrap` в их конфиг-флоу; наш drift-feed в их статус-баре — крупнейшая необслуженная аудитория | РЕЗЕРВ high-value (22.10): точечного входа нет, discussions требуют ручного погружения |
| 2 | [router-for-me/CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) | 55.9k | [#6848 «Claude OAuth MCP alias not restored when model drops the mcp__<server>__ prefix»](https://github.com/router-for-me/CLIProxyAPI/issues/6848); [#5839 permission_denied на tool declaration](https://github.com/router-for-me/CLIProxyAPI/issues/5839) | Пин как источник канонических имён тула: alias-восстановление из pins.json | НЕ ВХОДИМ (22.10): #6848 закрыт NOT_PLANNED 21.10 ночью |
| 3 | [Aider-AI/aider](https://github.com/Aider-AI/aider) | 49.7k | [#3314 «MCP SUPPORT» — открытый запрос с 2024](https://github.com/Aider-AI/aider/issues/3314) | Когда добавят MCP — рождаться сразу с пиннингом; PR-сопровождение с нашим gate | ЗАПОЩЕНО 6349531054 (22.10): pin-at-birth + опора на чужой тезис RJL667 (авг: канонические имена из конфига юзера) — рынок сам дорёк |
| 4 | [musistudio/claude-code-router](https://github.com/musistudio/claude-code-router) | 37.8k | [#1148 «No configuration guide to integrate mcp servers»](https://github.com/musistudio/claude-code-router/issues/1148) | Router = идеальное место прокси-режима rugsnare (enforce на роуте) + доки-PR | НЕ ВХОДИМ: решено в треде (март, add-json), тихий с июня |
| 5 | [iOfficeAI/AionUi](https://github.com/iOfficeAI/AionUi) | 33.7k | [#4307 «MCP tool calls return "No result" for team agents»](https://github.com/iOfficeAI/AionUi/issues/4307); [#4119 OAuth 500](https://github.com/iOfficeAI/AionUi/issues/4119) | Диагностика «тул молчит» через diff с пином; zh-рынок | ЗАПОЩЕНО 6349524704 (22.10): пин = self-диагностика Problem 1 (mcp_count vs ожидание = GONE), инвентарь vs транспорт раздельно |
| 6 | [charmbracelet/crush](https://github.com/charmbracelet/crush) | 28.7k | [#3791 «MCP Management in TUI»](https://github.com/charmbracelet/crush/issues/3791); [#4060](https://github.com/charmbracelet/crush/issues/4060) | MCP-менеджер в TUI с колонкой статуса пина (наш report) | ЗАПОЩЕНО 6349520971 (22.10): колонка pinned-vs-drifted; статус-чек отдельным соединением — не через сессию модели (прямой ответ на запрос kallisti5) |
| 7 | [QwenLM/qwen-code](https://github.com/QwenLM/qwen-code) | 28.6k | [#8968 «support MCP 2026-07-28 and MCP Apps»](https://github.com/QwenLM/qwen-code/issues/8968) | При поддержке новых MCP-ревизий — пины обязательны (спека меняется = контракт меняется) | ЗАПОЩЕНО 6349525148 (22.10): pin-per-capability — репро BigDaddy1337 (ui-capability → write-тулы деферятся) + наш scan --chameleon; в нулевом раунде поймана опечатка номера (8968, не 8966) |

## B. MCP-инфраструктура и фреймворки серверов

| # | Репо | ★ | Боль | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 8 | [BerriAI/litellm](https://github.com/BerriAI/litellm) | 61.7k | [«BYOK/static-auth MCP tools/list rejects per-request credential»](https://github.com/BerRIAI/litellm/issues) (bug в их MCP-проксировании) | litellm = самый массовый LLM-шлюз: rugsnare как integrity-модуль рядом (пин/диф на MCP-роутах) |
| 9 | [ahujasid/mcp-for-blender](https://github.com/ahujasid/mcp-for-blender) | 31.9k | [#366 «blender-mcp is now mcp-for-blender» — переименование сломало всем конфиги](https://github.com/ahujasid/mcp-for-blender/issues/366); [#392](https://github.com/ahujasid/mcp-for-blender/issues/392) | Идеальный кейс launch-entry пиннинга (v1.4: bin/name moves) — заход с готовым решением |
| 10 | [mastra-ai/mastra](https://github.com/mastra-ai/mastra) | 29k | [#21989 «Generate TypeScript types for discovered MCP tools»](https://github.com/mastra-ai/mastra/issues/21989) | Типы генерировать из ПИНА (стабильного), а не из живого tools/list — иначе типы плывут | ЗАПОЩЕНО 6349146964 (22.10): typegen закрыт COMPLETED утром 22.10 (PR #25569) — вход «генерируй из пина, не из live discovery» точно ко времени |
| 11 | [PrefectHQ/fastmcp](https://github.com/PrefectHQ/fastmcp) | 28.2k | [#5864 «Proxy components lose version metadata, breaking VersionFilter»](https://github.com/PrefectHQ/fastmcp/issues/5864); [#5866 hash-shaped tool names](https://github.com/PrefectHQ/fastmcp/issues/5866) | Главный python-фреймворк MCP-серверов: наш PIN-SPEC как экспорт из fastmcp (birth-certificate сервера) | ЗАПОЩЕНО 6349141071 (22.10): #5864 OPEN, 0 комментов — версионность должна ехать в артефакте (§2.1 identity); нулевой раунд сверил поля §2.1 байт-в-байт |
| 12 | [modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector) | 11.1k | [#2765 «CLI tests seed the developer's REAL ~/.mcp-inspector/mcp.json»](https://github.com/modelcontextprotocol/inspector/issues/2765) | Официальный inspector = наш комплемент по FAQ: «inspect → pin»; PR-кнопка «Pin with rugsnare» |
| 13 | [appcypher/awesome-mcp-servers](https://github.com/appcypher/awesome-mcp-servers) | 5.8k | Кураторская (сестра punkpeye-списка): 178 MCP-упоминаний, integrity нет | Маркер «drift-checked» + ссылки на rugsnare.com/scans | НЕ ВХОДИМ (22.10, пре-флайт): репо АРХИВНО (514 открытых issues, PR невозможны) — посыл волны «живая» неверен |
| 14 | [wong2/awesome-mcp-servers](https://github.com/wong2/awesome-mcp-servers) | 4.4k | Кураторская (старейший список, 502 упоминания) | Тот же заход; их аудитория — ранние адоптеры | НЕ ВХОДИМ как PR (22.10, пре-флайт): README — «We do not accept PRs», приём только через mcpservers.org/submit (pulls-API выключен); текст сабмита подготовлен — ручной шаг юзера |
| 15 | [grafana/mcp-grafana](https://github.com/grafana/mcp-grafana) | 3.6k | [#1281 «Improve tool ergonomics for code-mode clients»](https://github.com/grafana/mcp-grafana/issues/1281); [#1367 сторонний screening-proxy интегрируют](https://github.com/grafana/mcp-grafana/issues/1367) | Издатель: пин собственного контракта; #1367 показывает спрос на integrity-прокси — мы готовые | ЗАПОЩЕНО 6349530260 (22.10): code-mode делает дрейф ДОРОЖЕ (скрипт компилируется, пока сервер переименовал тул) → издательский пин + surfaceHash §3.2 |

## C. Агентные платформы

| # | Репо | ★ | Боль | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 16 | [khoj-ai/khoj](https://github.com/khoj-ai/khoj) | 37.8k | [#1364 «MCP server endpoint undocumented»](https://github.com/khoj-ai/khoj/issues/1364) | Самопубликованный MCP без документированного контракта — пин + публичная страница контракта | НЕ ВХОДИМ: тикет тихий 3.5 мес (один +1 в июле), вход = доки без тяги |
| 17 | [topoteretes/cognee](https://github.com/topoteretes/cognee) | 32.6k | [#5662 MCP resources data-source connector](https://github.com/topoteretes/cognee/issues/5662); [#5619](https://github.com/topoteretes/cognee/issues/5619) | Memory-MCP: пин контент-хэшей ресурсов (v1.5 R13) — память агента нельзя тихо переписывать | ЗАПОЩЕНО 6349525520 (22.10): R13-хэши ingested-ресурсов как дизайн-нота коннектору — строится прямо сейчас (Mergetober) |
| 18 | [assafelovic/gpt-researcher](https://github.com/assafelovic/gpt-researcher) | 30.2k | [#2192 «MCP configuration lists are RESET during Config initialization» — тулы молча пропадают](https://github.com/assafelovic/gpt-researcher/issues/2192); [#2096 transport autodetect bug](https://github.com/assafelovic/gpt-researcher/issues/2096) | Пин = детектор «а где мои тулы»: #2192 был бы виден сразу |
| 19 | [labring/FastGPT](https://github.com/labring/FastGPT) | 29.9k | [#7427 «MCP服务名称自动生成不能修改» — автогенерируемые имена нельзя зафиксировать](https://github.com/labring/FastGPT/issues/7427); [#7561 _meta](https://github.com/labring/FastGPT/issues/7561) | Канонические имена из пина (IDENTITY-класс v1.4); zh-рынок, огромная установка | НЕ ВХОДИМ: корень найден сообществом (lirenjie95, окт — шаблон拼名字, фикс через mcp.name спроектирован в треде) |
| 20 | [oraios/serena](https://github.com/oraios/serena) | 30.6k | [#2105 «MCP registry manifest duplicates package spec as stray positional»](https://github.com/oraios/serena/issues/2105) | Serena сама — MCP-сервер: dogfood-пин собственного контракта | НЕ ВХОДИМ: фикс спроектирован (88subarno88, сент) и предложен; у мейнтейнера лишь вопрос об источнике VSCode-манифеста |
| 21 | [letta-ai/letta](https://github.com/letta-ai/letta) | 25.2k | [#3419 «MCP server name read from tags[0] picks the WRONG server»](https://github.com/letta-ai/letta/issues/3419); [#3452 — Hlido-грейд 80/100](https://github.com/letta-ai/letta/issues/3452) | Пин решает идентичность сервера; Hlido-грейд — рынок trust-оценок уже тут |
| 22 | [activepieces/activepieces](https://github.com/activepieces/activepieces) | 25.2k | [#16683 «Per-consumer MCP tool sets (tool selection per OAuth grant)»](https://github.com/activepieces/activepieces/issues/16683); [#16588](https://github.com/activepieces/activepieces/issues/16588) | Пины как основа per-consumer наборов: выдать потребителю снапшот контракта | ЗАПОЩЕНО 6349530631 (22.10): per-grant pin-снапшоты, enforcement через SHADOW-детект; риск: тред уведён в Linear (GIT-2020) |
| 23 | [frdel/agent-zero](https://github.com/frdel/agent-zero) | 19.5k | Прямого тикета нет (MCP-поддержка есть, mcp=4) | Пин MCP-тулов в конфигах агентов, создаваемых юзерами en masse | РЕЗЕРВ: болевого якоря нет |
| 24 | [camel-ai/camel](https://github.com/camel-ai/camel) | 17.9k | [#4414 «NotionMCPToolkit: PIN the mcp-remote bridge» — они уже думают словами пиннинга](https://github.com/camel-ai/camel/issues/4414) | заход термин-в-термин: у нас пиннинг моста — готовая реализация |
| 25 | [ag2ai/ag2](https://github.com/ag2ai/ag2) | 5k | [#3186 «mcp 2.0 — resource subscriptions»](https://github.com/ag2ai/ag2/issues/3186); [#3399 reuse MCP discovery](https://github.com/ag2ai/ag2/issues/3399) | Кэш discovery = пин: реюз конфигураций с верификацией контракта | НЕ ВХОДИМ: фича-запрос тихий 2 мес |

## D. UI и гайды-кураторы

| # | Репо | ★ | Боль | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 26 | [chatboxai/chatbox](https://github.com/chatboxai/chatbox) | 42.1k | [#3962/#3963 «MCP support on android/mobile/web» — массовый спрос](https://github.com/chatboxai/chatbox/issues/3962) | При расширении MCP — pin-on-add по умолчанию; десктоп-аудитория уже страдает от тихих смен | НЕ ВХОДИМ: преждевременно — MCP на мобиле ещё не вышел (реквизит при релизе) |
| 27 | [agentscope-ai/agentscope](https://github.com/agentscope-ai/agentscope) | 33.6k | [#3371 «MCP tool name longer than 64 chars fails EVERY model request»](https://github.com/agentscope-ai/agentscope/issues/3371); [#2113 gateway bootstrap](https://github.com/agentscope-ai/agentscope/issues/2113) | Пиннинг имён + валидация при добавлении (64-char ловится до продакшна); Alibaba-экосистема | НЕ ВХОДИМ: фикс #3372 в полёте (assigned, тесты зелёные) |
| 28 | [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) | 79k | Гайды-куратор (zh): конфиги MCP тиражируются копипастом без верификации | «Проверь перед вставкой»: rugsnare scan в каждом примере конфига | РЕЗЕРВ: PR-class (шаг scan в примеры) |
| 29 | [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) | 67.9k | Гайды (mcp=9): лучшие практики без практики integrity | PR-секция «MCP hygiene» с нашим gate — стать каноническим ответом | РЕЗЕРВ: PR-class (секция MCP hygiene) |
| 30 | [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 56.2k | [#2670 resharper-cli-mcp](https://github.com/hesreallyhim/awesome-claude-code/issues/2670), [#2392 talkthrough-mcp](https://github.com/hesreallyhim/awesome-claude-code/issues/2392) — приём MCP-сабмитов в список без проверок | Процесс приёма: сабмит = пин + бейдж; список становится integrity-aware | НЕ ВХОДИМ в этот тикет (чужой сабмит под их бот-валидатором); РЕЗЕРВ: отдельный issue «пиннинг в intake-валидацию» — у них уже автоматический валидатор, добавим контракт-слой |

## E. Skills-вселенная (rugsnare skills scan/diff)

| # | Репо | ★ | Боль | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 31 | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 138.4k | [#238 «Add Skill for Claude.ai»](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/issues/238) — дистрибуция без версионирования | Пин скиллов в их install-флоу: юзер знает, ЧТО он установил | НЕ ВХОДИМ: тред в дизайн-стадии у мейнтейнеров, тихий 4 мес |
| 32 | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | 109.3k | [#602 «agent does not invoke skills named only as…»](https://github.com/addyosmani/agent-skills/issues/602); [#583](https://github.com/addyosmani/agent-skills/issues/583) | skills report как QA-инструмент автору; пины в каждом скилле | НЕ ВХОДИМ: мейнтейнер сам ответил (сент) — ждёт before/after пруфы качества ревью, не тулинг |
| 33 | [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | 77.6k | [#1981 «Is a skill safety scanner in scope?» — ОТКРЫТЫЙ ВОПРОС](https://github.com/ComposioHQ/awesome-claude-skills/issues/1981); [#1762 AI Skill Shield просканировал 864 скилла](https://github.com/ComposioHQ/awesome-claude-skills/issues/1762) | Ответ «да»: rugsnare skills scan — готовый; заход с PR в один тикет |
| 34 | [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) | 65k | [#663 «Security disclosure: ambient credential-file access, unproxied OAuth tokens» — ЖИВОЙ security-кейс](https://github.com/mvanhorn/last30days-skill/issues/663) | Наш audit (секреты) + skills pinning как follow-up этого disclosure | НЕ ВХОДИМ (22.10): открытое координированное disclosure (hold-captain-security) — питч поверх чужого security-инцидента = оппортунизм; берём как интеллект для контента |
| 35 | [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) | 59.5k | [#189 «Host-aware install doctor»](https://github.com/cathrynlavery/diagram-design/issues/189) | doctor-подход к скиллам: наш `rugsnare doctor` + skills diff после апдейтов | ЗАПОЩЕНО 6349520109 (22.10): их боль — буквально unpinned installs (Pi из unpinned Git, marketplace auto-update); наш skills scan/diff + doctor; нулевой раунд: «host matrix» → «channels you listed» (матрицы у них нет) |
| 36 | [K-Dense-AI/scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) | 53.6k | [#324 «security-triage.md describes an OUTDATED security scan»](https://github.com/K-Dense-AI/scientific-agent-skills/issues/324) | Актуальный security-флоу: наш скан в их CI вместо устаревшего описания | ЗАПОЩЕНО 6349141552 (22.10): #324 OPEN — наш skills scan/diff как поддерживаемая замена + оффер PR триаж-дока; нулевой раунд: гранулярность диффа переписана консервативно (находка на файл, не поэлементно), скрипты в хэше подтверждены (skills-pin.js:28) |
| 37 | [VoltAgent/awesome-openclaw-skills](https://github.com/VoltAgent/awesome-openclaw-skills) | 53.3k | [#594 «Security: pr-risk-analyzer EXFILTRATES GitHub tokens to third-party server» — живой малварь-скилл в списке](https://github.com/VoltAgent/awesome-openclaw-skills/issues/594) | Наш A-класс advisory поймал бы это на входе: приём скиллов только через skills scan |
| 38 | [Imbad0202/academic-research-skills](https://github.com/Imbad0202/academic-research-skills) | 53.3k | Кураторская (35 skill-упоминаний), без integrity-процесса | Пометка «pinned» в листинге | РЕЗЕРВ: кандидат на отдельный issue (intake-серия, вместе с mukul975/pm-skills) |
| 39 | [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | 36.1k | [#1165 «preview-first skills directory»](https://github.com/VoltAgent/awesome-agent-skills/issues/1165) | Каталог с превью контракта скилла = наш skills report HTML | НЕ ВХОДИМ (22.10): #1165 закрыт NOT_PLANNED |
| 40 | [mukul975/Anthropic-Cybersecurity-Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills) | 34.8k | [#144/#160 — шаблонные заявки без проверки](https://github.com/mukul975/Anthropic-Cybersecurity-Skills/issues/144) | Секьюрити-скиллы под чужим именем — самая ироничная цель для integrity-гейта | НЕ ВХОДИМ в этот тикет: тело #144 = НЕЗАПОЛНЕННЫЙ шаблон (подтверждено); РЕЗЕРВ: отдельный issue intake-гейт |
| 41 | [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates) | 32.8k | [#1127 «alias ids point to OLD Claude models» — устаревшие алиасы](https://github.com/davila7/claude-code-templates/issues/1127); [#847 silently drops plugins](https://github.com/davila7/claude-code-templates/issues/847) | Дрифт-детект их каталога шаблонов: устаревание видно автоматически | ЗАПОЩЕНО 6349147968 (22.10): #1127 OPEN — пин alias-карты; честная оговорка: rugsnare пиннит контракты/skills, не алиасы — паттерн спеки, не тул |
| 42 | [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) | 28.4k | [#1001 AI Skill Shield scan (846 skills)](https://github.com/alirezarezvani/claude-skills/issues/1001) | Третий отсканированный список — предложить Shield→rugsnare миграцию | НЕ ВХОДИМ (22.10): закрыт 21.10 — мейнтейнер разобрал отчёт (10 «критических» = примеры в документации, единственный реальный фиксирован #1038) и заявил анти-бейджевую политику; ВТОРОЙ анти-бейджевый мейнтейнер + прямой удар по качеству Shield |
| 43 | [phuryn/pm-skills](https://github.com/phuryn/pm-skills) | 27.5k | [#62/#70 — приём скиллов без проверок](https://github.com/phuryn/pm-skills/issues/62) | Приём через skills scan + pinned-листинг | НЕ ВХОДИМ в этот тикет: #62 = чужой сабмит (BulkPublish), мейнтейнер молчит; РЕЗЕРВ: отдельный issue intake-гейт |

## F. Мега-инструменты с MCP-интеграцией

| # | Репо | ★ | Боль | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 44 | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) | 114.1k | [#1333 «Verified on MCPwell badge + listing check» — сами внедряют бейджи доверия](https://github.com/JuliusBrussee/caveman/issues/1333) | Наш badge (с Ed25519-верификацией пина!) — следующий шаг их же идеи |
| 45 | [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) | 131.4k | [#2937 «Add discovery of MCP Servers»](https://github.com/Graphify-Labs/graphify/issues/2937); [#4440 MCP hosts hang](https://github.com/Graphify-Labs/graphify/issues/4440) | Дискавери с integrity: находить и сразу пиннить | НЕ ВХОДИМ: фича-запрос тихий 2 мес (авг), без реакции мейнтейнеров |
| 46 | [nexu-io/open-design](https://github.com/nexu-io/open-design) | 103.1k | [#7968 «Support opencode2 MCP config: nested mcp.servers»](https://github.com/nexu-io/open-design/issues/7968); [#8853](https://github.com/nexu-io/open-design/issues/8853) | Читалка конфигов с верификацией: doctor для чужих .mcp.json | НЕ ВХОДИМ: #7968 назначено (Bryandero98), фикс в работе с сентября |
| 47 | [Panniantong/Agent-Reach](https://github.com/Panniantong/Agent-Reach) | 100.6k | [#608 «MCP install guidance references MISSING package extra»](https://github.com/Panniantong/Agent-Reach/issues/608); [#792](https://github.com/Panniantong/Agent-Reach/issues/792) | Floating-пакеты в инструкциях = наш floating-version advisory; zh | ЗАПОЩЕНО 6349520559 (22.10): рекламируемый extra agent-reach[mcp] НЕ существует (Provides-Extra = all/browser/cookies/dev, проверка 17lijunyi на 1.5.0) = install-guidance drift; нулевой раунд: floating-advisory vs scan-fail разведены точно |
| 48 | [D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) | 89k | [#511 «Scrapling scored A (92/100) in an independent MCP safety scan»](https://github.com/D4Vinci/Scrapling/issues/511); [#514 TLS-верификация](https://github.com/D4Vinci/Scrapling/issues/514) | Им уже выставляют оценки за MCP-безопасность — подарить верифицируемый бейдж вместо opaque-грейда |
| 49 | [cheaper-inference/OmniRoute](https://github.com/cheaper-inference/OmniRoute) | 79.4k | [#17131 «Adopt MCP 2026-07-28 stateless transport»](https://github.com/cheaper-inference/OmniRoute/issues/17131); [#17185 stale docs](https://github.com/cheaper-inference/OmniRoute/issues/17185) | Шлюз 375-провайдеров + MCP: пины на каждом маршруте | ЗАПОЩЕНО 6349147483 (22.10): #17131 живой, мейнтейнер в работе (PR #15983, 92/94 тестов) — pin-per-protocol-version (дуал 2025/2026 поверхности) + SDK-provenance (v2 split-пакеты — их же находка треда) |
| 50 | [yamadashy/repomix](https://github.com/yamadashy/repomix) | 29k | [#1866 «--mcp --verbose writes logger output to stdout, CORRUPTING JSON-RPC»](https://github.com/yamadashy/repomix/issues/1866); [#1933 A-92/100 safety scan](https://github.com/yamadashy/repomix/issues/1933) | Контракт-чистота их MCP-режима + снова грейды: наш верифицируемый вариант |

## Сводка волны 4
- 50 целей: 40 с прямыми issue-ссылками, 10 кураторских/платформенных с обоснованием.
- Категории: терминалы/роутеры 7 · инфраструктура 8 · платформы 10 · UI/гайды 5 · skills 13 · мега-тулы 7.
- Живые инциденты в списке: эксфильтрация токенов скиллом (#594), ambient credential access (#663) — skills-poisoning не теория.
- Рынок trust-грейдов уже существует (MCPwell/Hlido/AI-Skill Shield/independent scans — 6 репо волны) — все они opaque; наш Ed25519+on-chain бейдж верифицируем.

**Суммарно по 4 волнам: 120 целей.**

---

# Волна 5: +100 целей (51–150), все 500+★

Проверка как раньше: README/code-верификация MCP/skills-релевантности, боль через issues (ссылки у ~70 из 100), нигде не заявлены. Явления волны: (1) «independent MCP safety scan»-бот уже наградил грейдами «A 88–92/100» минимум 5 серверов из списка; (2) вендоры сами предлагают receipts/attestations (haystack #11039, uber/ADR #163) — рынок дошёл до нашего функционала самостоятельно; (3) живые security-баги в MCP-серверах: pentestagent #90, jadx #127, metamcp #375, claudecodeui #1211.

## Г. Официальные платформы и SDK (8)

| # | Репо | ★ | Боль / ссылка | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 51 | [modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk) | 24.6k | [#3729 OAuth-граничные фейлы тестов](https://github.com/modelcontextprotocol/python-sdk/issues/3729); мажоры SDK переписывают контракты у всех вниз по цепочке | PIN-SPEC + contract-provenance как официальный экспорт SDK |
| 52 | [awslabs/mcp](https://github.com/awslabs/mcp) | 9.8k | Коллекция официальных AWS MCP-серверов (295 упоминаний), релизы меняют тулсеты | Corporate-аудитория AWS: наши pins в их CI + drift-feed на awslabs/* |
| 53 | [IBM/mcp-context-forge](https://github.com/IBM/mcp-context-forge) | 4.7k | [#6536 бенчмарки ControlPlane/DataPlane](https://github.com/IBM/mcp-context-forge/issues/6536) | IBM-гейтвей: rugsnare как integrity-плагин forge |
| 54 | [microsoft/SkillOpt](https://github.com/microsoft/SkillOpt) | 18.6k | [#97 harvest из Copilot-сессий](https://github.com/microsoft/SkillOpt/issues/97) | Skills-харвест Microsoft: пиннинг скиллов при сборе |
| 55 | [microsoft/skill-recorder](https://github.com/microsoft/skill-recorder) | 4.3k | [#8 [High] «Skill install can broaden allowed-tools beyond the human-approved plan»](https://github.com/microsoft/skill-recorder/issues/8) — прямое попадание в наш класс | Guard-parameter warnings + пин allowlist: готовый ответ на High-баг |
| 56 | [uber/ADR](https://github.com/uber/ADR) | 2.1k | [#163 «Proposal: portable offline-verifiable attestations» — Uber сам предлагает верифицируемые аттестации](https://github.com/uber/ADR/issues/163) | Наши Ed25519 receipts + on-chain: реализация их же предложения |
| 57 | [NVIDIA/SkillSpector](https://github.com/NVIDIA/SkillSpector) | 20.8k | [#832 recursive-скан падает после 32 скиллов](https://github.com/NVIDIA/SkillSpector/issues/842); их отчётами завалены skills-репо | Партнёрство: SkillSpector сканит → rugsnare пиннит (scan→pin конвейер) |
| 58 | [trailofbits/skills](https://github.com/trailofbits/skills) | 7.7k | [#351 «HVTrust supply-chain scorecard + optional badge» — ToB внедряет скоркард скиллов](https://github.com/trailofbits/skills/issues/351) | Наш бейдж (верифицируемый) как следующий шаг их scorecard |

## Д. MCP-инфраструктура: агрегаторы, роутеры, гейтвеи (14)

| # | Репо | ★ | Боль / ссылка | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 59 | [metatool-ai/metamcp](https://github.com/metatool-ai/metamcp) | 2.7k | [#375 «Endpoint owners can ENUMERATE MCP servers and reset error state across all tenants»](https://github.com/metatool-ai/metamcp/issues/375) | Агрегатор №1: integrity+изоляция на уровне пинов (per-tenant pin store) |
| 60 | [mcp-router/mcp-router](https://github.com/mcp-router/mcp-router) | 2.1k | [#210 «Stdio servers inherit Router's working dir and never recover»](https://github.com/mcp-router/mcp-router/issues/210) | Роутер = точка обязательной верификации: diff на каждом маршруте |
| 61 | [MCPJam/inspector](https://github.com/MCPJam/inspector) | 2.3k | [#6177 примеры Parallel Search MCP](https://github.com/MCPJam/inspector/issues/6177) | Community-inspector: кнопка «Pin after inspect» |
| 62 | [stacklok/toolhive](https://github.com/stacklok/toolhive) | 2.3k | [#6805 парсер MCP](https://github.com/stacklok/toolhive/issues/6805) | Stacklok = security-компания, раздающая MCP: pins+verify в их verify-флоу |
| 63 | [TykTechnologies/tyk](https://github.com/TykTechnologies/tyk) | 10.9k | MCP-гейтвей (mcp=8), без integrity-слоя | Kong-класс заход: rugsnare-модуль на MCP-роутах |
| 64 | [maximhq/bifrost](https://github.com/maximhq/bifrost) | 9k | [#8639 «Native MCP Apps support through the MCP gateway»](https://github.com/maximhq/bifrost/issues/8639) | Gateway + our gateway-proxies: партнёрская интеграция |
| 65 | [prest/prest](https://github.com/prest/prest) | 4.6k | [#1064 «Adjust MCP adapter for the MCP server rework» — реMCP-ворк ломает адаптеры](https://github.com/prest/prest/issues/1064) | Пример сервера, переписывающего MCP-слой: пины как страховка клиентов |
| 66 | [archestra-ai/archestra](https://github.com/archestra-ai/archestra) | 4.4k | [#9009 каталог MCP (Google Hotels и т.д.)](https://github.com/archestra-ai/archestra/issues/9009) | Каталог = листинги с пинами (PIN-SPEC метаданные) |
| 67 | [mcp-use/mcp-use](https://github.com/mcp-use/mcp-use) | 10.8k | Главный python-клиент (mcp=80) | SDK-уровень: pin-check при подключении в lib |
| 68 | [lastmile-ai/mcp-agent](https://github.com/lastmile-ai/mcp-agent) | 8.6k | [#765 интеграции](https://github.com/lastmile-ai/mcp-agent/issues/765) | Agent-фреймворк LastMile: pins как first-class |
| 69 | [evalstate/fast-agent](https://github.com/evalstate/fast-agent) | 3.9k | [#1016 `--url` рвётся на запятых](https://github.com/evalstate/fast-agent/issues/1016) | Их QA-культуре зайдёт наш canary replay |
| 70 | [Upsonic/Upsonic](https://github.com/Upsonic/Upsonic) | 8k | [#624 платный security-scan MCP по x402](https://github.com/Upsonic/Upsonic/issues/624) | Платный скан по вызову + наш пин = scan-once-pin-forever экономия |
| 71 | [tractorjuice/arc-kit](https://github.com/tractorjuice/arc-kit) | 2.3k | [#580 rolling tracker Claude Code platform](https://github.com/tractorjuice/arc-kit/issues/580) | Платформенные трекеры = наши pins в их payload |
| 72 | [internet-court/internet-court-skill](https://github.com/internet-court/internet-court-skill) | 6.8k | [#9 AgentServices vendored skill (x402 платные API)](https://github.com/internet-court/internet-court-skill/issues/9) | Платные скиллы: [PAYWALL]-флаг + бюджеты |

## Е. Популярные MCP-серверы (издатели) (14)

| # | Репо | ★ | Боль / ссылка | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 73 | [firecrawl/firecrawl-mcp-server](https://github.com/firecrawl/firecrawl-mcp-server) | 7.7k | [#580](https://github.com/firecrawl/firecrawl-mcp-server/issues/580) + грейд «A 92/100» от стороннего скан-бота | Пин собственного контракта + верифицируемый бейдж вместо opaque-грейда |
| 74 | [czlonkowski/n8n-mcp](https://github.com/czlonkowski/n8n-mcp) | 23.1k | [#1159 1-click config generator](https://github.com/czlonkowski/n8n-mcp/issues/1159) | 23k★ н8n-через-MCP: наш PR-diff в их релизы |
| 75 | [IvanMurzak/Unity-MCP](https://github.com/IvanMurzak/Unity-MCP) | 4.5k | [#1046 включение в awesome-листы](https://github.com/IvanMurzak/Unity-MCP/issues/1046) | Game-dev аудитория; пин контракта Unity-тулов |
| 76 | [haris-musa/excel-mcp-server](https://github.com/haris-musa/excel-mcp-server) | 4.3k | [#211 «scored A (92/100)» — третий сервер с таким грейдом](https://github.com/haris-musa/excel-mcp-server/issues/211) | Верифицируемый бейдж: пусть любой проверит, а не верит боту |
| 77 | [stickerdaniel/linkedin-mcp-server](https://github.com/stickerdaniel/linkedin-mcp-server) | 4k | [#1320 usage rules как server instructions](https://github.com/stickerdaniel/linkedin-mcp-server/issues/1320) | Pinned instructions + result-inspection |
| 78 | [blazickjp/arxiv-mcp-server](https://github.com/blazickjp/arxiv-mcp-server) | 3.2k | [#296 тоже «A 92/100»](https://github.com/blazickjp/arxiv-mcp-server/issues/296) | Аналогично; научная аудитория |
| 79 | [ahujasid/ableton-mcp](https://github.com/ahujasid/ableton-mcp) | 3.2k | [#130 «Massive token usage»](https://github.com/ahujasid/ableton-mcp/issues/130) | Пины описаний против token-bloat (COSMETIC-дрейф виден) |
| 80 | [zcaceres/markdownify-mcp](https://github.com/zcaceres/markdownify-mcp) | 3k | [#148 config generator PR-бот](https://github.com/zcaceres/markdownify-mcp/issues/148) | Классический инди-сервер: birth-certificate пин |
| 81 | [zinja-coder/jadx-ai-mcp](https://github.com/zinja-coder/jadx-ai-mcp) | 2.9k | [#127 «Unauthenticated GET refactoring endpoints permit CSRF»](https://github.com/zinja-coder/jadx-ai-mcp/issues/127) | Security-hardening параллельно нашему enforce-прокси |
| 82 | [chrisryugj/korean-law-mcp](https://github.com/chrisryugj/korean-law-mcp) | 2.7k | [#176 «A 88/100»](https://github.com/chrisryugj/korean-law-mcp/issues/176) | Корейский рынок (наш ja-гайд адаптируется) |
| 83 | [vibheksoni/stealth-browser-mcp](https://github.com/vibheksoni/stealth-browser-mcp) | 3.2k | [#34 stdout-флуд убивает MCP-соединение](https://github.com/vibheksoni/stealth-browser-mcp/issues/34) | Браузерный stealth: enforce-прокси + result-inspection |
| 84 | [vybenetwork/solana-mcp-vybe](https://github.com/vybenetwork/solana-mcp-vybe) | 2.1k | Категория «деньги» из нашей охоты (болевых тикетов нет) | `--forbid-tool` на списывающие тулы + бюджеты |
| 85 | [grab/cursor-talk-to-figma-mcp](https://github.com/grab/cursor-talk-to-figma-mcp) | 7.1k | [#82](https://github.com/grab/cursor-talk-to-figma-mcp/issues/82) | Grab-корпоративный: dogfood pins |
| 86 | [0x4m4/hexstrike-ai](https://github.com/0x4m4/hexstrike-ai) | 13k | [#183 security-тулы](https://github.com/0x4m4/hexstrike-ai/issues/183); MCP=16 — security-автоматизация | Pentest-агент с MCP: enforce-режим обязателен |
| 87 | [GH05TCREW/pentestagent](https://github.com/GH05TCREW/pentestagent) | 3.2k | [#90 «Unauthenticated MCP HTTP Exposes FULL Agent Control» — открытая SS-дыра](https://github.com/GH05TCREW/pentestagent/issues/90) | Живой кейс «почему MCP-эндпоинты надо верифицировать» для наших материалов |

## Ж. Платформы/клиенты/агенты (28)

| # | Репо | ★ | Боль / ссылка | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 88 | [HKUDS/Vibe-Trading](https://github.com/HKUDS/Vibe-Trading) | 36.2k | [#1367 Tracker брокер-коннекторов](https://github.com/HKUDS/Vibe-Trading/issues/1367); MCP=124 | Трейдинг+MCP (наша охотничья категория): pins+budgets |
| 89 | [agentscope-ai/QwenPaw](https://github.com/agentscope-ai/QwenPaw) | 35.9k | [#8275 «единое управление Skill и MCP»](https://github.com/agentscope-ai/QwenPaw/issues/8275) | Единый менеджер = наш report + pins; zh |
| 90 | [pascalorg/editor](https://github.com/pascalorg/editor) | 25k | [#288 Perplexity MCP-коннекторы: POST /api/mcp rejects](https://github.com/pascalorg/editor/issues/288) | Текстовый редактор с MCP: pin-on-connect |
| 91 | [screenpipe/screenpipe](https://github.com/screenpipe/screenpipe) | 22k | [#7560 фантомные bun.exe MCP-процессы](https://github.com/screenpipe/screenpipe/issues/7560) | Локальный MCP-зоопарк: doctor+events как аудит процессов |
| 92 | [winfunc/opcode](https://github.com/winfunc/opcode) | 22.4k | [#162 «MCP doesn't work»](https://github.com/winfunc/opcode/issues/162) | Диф-диагностика MCP-фейлов через pins |
| 93 | [steipete/CodexBar](https://github.com/steipete/CodexBar) | 22.7k | [#3727 Context7 API/MCP rate-limit tracking](https://github.com/steipete/CodexBar/issues/3727) | Bar-приложение: наш статус дрейфа рядом с лимитами |
| 94 | [yetone/magpie](https://github.com/yetone/magpie) | 18.8k | [#3109 `mcp add` без env/headers/timeout](https://github.com/yetone/magpie/issues/3109) | mcp-менеджер magpie: add = scan+pin |
| 95 | [NanmiCoder/cc-haha](https://github.com/NanmiCoder/cc-haha) | 15.1k | [#1625 «иногда сессия не видит mcp»](https://github.com/NanmiCoder/cc-haha/issues/1625) | Пин = ожидаемый состав тулов; ноль виден сразу; zh |
| 96 | [siteboon/claudecodeui](https://github.com/siteboon/claudecodeui) | 14.2k | [#1211 «MCP credentials exposed in child argv»](https://github.com/siteboon/claudecodeui/issues/1211) | Наш vault ({{VAULT:}}) закрывает экспозицию кредов |
| 97 | [krillinai/OpenCreator](https://github.com/krillinai/OpenCreator) | 13.8k | [#359 Parallel Search MCP接入](https://github.com/krillinai/OpenCreator/issues/359) | Контент-платформа: верификация подключаемых MCP; zh |
| 98 | [xerj-org/xerj](https://github.com/xerj-org/xerj) | 12.7k | MCP=15, агентная платформа | Пины в конфигах агентов |
| 99 | [tw93/Kami](https://github.com/tw93/Kami) | 12k | Прямого MCP-тикета нет (mcp=1), автор tw93 — мультипликатор | Точечный авторский заход: skills+MCP hygiene |
| 100 | [holaboss-ai/holaOS](https://github.com/holaboss-ai/holaOS) | 11.5k | mcp=5, агентная ОС | OS-уровень: pins как системный сервис |
| 101 | [rowboatlabs/rowboat](https://github.com/rowboatlabs/rowboat) | 18k | [#1093 «Auto mode repeatedly prompts for read-only MCP calls; permission context lost»](https://github.com/rowboatlabs/rowboat/issues/1093) | Pinned annotations (readOnlyHint) решают промпты-качели |
| 102 | [Canner/WrenAI](https://github.com/Canner/WrenAI) | 17.9k | [#2693 «Safe multiplayer mode: Impersonation»](https://github.com/Canner/WrenAI/issues/2693) | Multiplayer-агенты: per-user pins + receipts |
| 103 | [RightNow-AI/openfang](https://github.com/RightNow-AI/openfang) | 18.2k | [#1096 MCP server-initiated notifications](https://github.com/RightNow-AI/openfang/issues/1096) | Push-контракты: our HTTP-proxy в цепочке |
| 104 | [getpaseo/paseo](https://github.com/getpaseo/paseo) | 21.6k | [#3941 «Claude provider never answers MCP elicitation»](https://github.com/getpaseo/paseo/issues/3941) | Approval-флоу: наш прокси знает, что ждать |
| 105 | [nukeop/nuclear](https://github.com/nukeop/nuclear) | 18.8k | [#2168 token metering](https://github.com/nukeop/nuclear/issues/2168) | Музыка+MCP: бюджеты вызовов |
| 106 | [iFurySt/open-computer-use](https://github.com/iFurySt/open-computer-use) | 2.6k | [#83 «wrong-window targeting, silent session errors»](https://github.com/iFurySt/open-computer-use/issues/83) | Computer-use = kernel-класс угроз: enforce+canary |
| 107 | [Syngnat/GoNavi](https://github.com/Syngnat/GoNavi) | 2.1k | [#1467 SQL через MCP требует журнал выполнения (zh)](https://github.com/Syngnat/GoNavi/issues/1467) | events.jsonl+receipts = готовый execution-журнал |
| 108 | [vmoranv/jshookmcp](https://github.com/vmoranv/jshookmcp) | 2.1k | [#193 видимые консоли при process_launch](https://github.com/vmoranv/jshookmcp/issues/193) | Hook-MCP: policies поверх вызовов |
| 109 | [bostrot/wslmanager](https://github.com/bostrot/wslmanager) | 4k | mcp=24 без integrity | Пины контрактов WSL-менеджмента |
| 110 | [skyhook-io/radar](https://github.com/skyhook-io/radar) | 3.9k | [#2089 фоновый режим](https://github.com/skyhook-io/radar/issues/2089) | Desktop-радар: наш drift-feed в виджетах |
| 111 | [refly-ai/refly](https://github.com/refly-ai/refly) | 7.5k | [#2295 web-search MCP-провайдер](https://github.com/refly-ai/refly/issues/2295) | Canvas-платформа: верификация MCP-провайдеров |
| 112 | [XiaoDuoYa/codex-with-chatgpt](https://github.com/XiaoDuoYa/codex-with-chatgpt) | 7.5k | [#457 OAuth-loopback не завершается](https://github.com/XiaoDuoYa/codex-with-chatgpt/issues/457) | zh; диагностика подключений |
| 113 | [titanwings/distilly](https://github.com/titanwings/distilly) | 25.9k | skill=39, дистилляция знаний | Пиннинг дистиллированных скиллов |
| 114 | [tigerless-labs/autoharness](https://github.com/tigerless-labs/autoharness) | 10.5k | skill=57, harness | Skills-пиннинг в harness-конфигах |
| 115 | [jub0t/Concat](https://github.com/jub0t/Concat) | 10.5k | mcp=5 | CLI-композер: MCP-верификация |

## З. Skills-вселенная 2 и гайды (35)

| # | Репо | ★ | Боль / ссылка | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 116 | [agentskills/agentskills](https://github.com/agentskills/agentskills) | 26.4k | [#42 «RFC: Remote Agent Skills — URL-based import» — удалённые скиллы без integrity](https://github.com/agentskills/agentskills/issues/42) | Стандарт-репо: URL-скиллы обязаны нести пин-хэш — RFC-комментарий |
| 117 | [JimLiu/baoyu-skills](https://github.com/JimLiu/baoyu-skills) | 26.8k | [#216 vendored-код в скилле протух](https://github.com/JimLiu/baoyu-skills/issues/216) | Vendoring = drift: наш skills diff |
| 118 | [KKKKhazix/khazix-skills](https://github.com/KKKKhazix/khazix-skills) | 21.6k | [#64 менеджер трио](https://github.com/KKKKhazix/khazix-skills/issues/64) | zh; manager+pin |
| 119 | [jnMetaCode/agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh) | 21.5k | [#15 просьбы новых платформ](https://github.com/jnMetaCode/agency-agents-zh/issues/15) | zh-агенты: skills scan |
| 120 | [jnMetaCode/superpowers-zh](https://github.com/jnMetaCode/superpowers-zh) | 8.4k | [#95 «предложение поддержать Zcode»](https://github.com/jnMetaCode/superpowers-zh/issues/95) | Наш init уже поддерживает ZCode — ответ в один тикет |
| 121 | [anbeime/skill](https://github.com/anbeime/skill) | 8.5k | [#28 сабмит скиллов без проверок](https://github.com/anbeime/skill/issues/28) | Приём через skills scan |
| 122 | [Orchestra-Research/AI-Research-SKILLs](https://github.com/Orchestra-Research/AI-Research-SKILLs) | 13.8k | [#66 профили ForgeCat](https://github.com/Orchestra-Research/AI-Research-SKILLs/issues/66); 202 скилла | Research-скиллы: pinned-листинг |
| 123 | [Agents365-ai/drawio-skill](https://github.com/Agents365-ai/drawio-skill) | 10.3k | skill=53 | Пин диаграмм-скиллов |
| 124 | [ningzimu/codex-ppt-skill](https://github.com/ningzimu/codex-ppt-skill) | 7.1k | skill=42, zh | PPT-скиллы: пин при апдейтах |
| 125 | [zenstory-ai/oh-story-claudecode](https://github.com/zenstory-ai/oh-story-claudecode) | 7.8k | skill=26 | Skills+MCP hygiene |
| 126 | [xixu-me/awesome-persona-distill-skills](https://github.com/xixu-me/awesome-persona-distill-skills) | 4.7k | [#70 сабмиссии персон](https://github.com/xixu-me/awesome-persona-distill-skills/issues/70); skill=76 | Персонажи-скиллы: integrity листинга |
| 127 | [ScrapeCreators/social-media-research-skills](https://github.com/ScrapeCreators/social-media-research-skills) | 4.4k | [#7 AI Skill Shield scan report](https://github.com/ScrapeCreators/social-media-research-skills/issues/7) | Четвёртый Shield-отчёт: миграция на нас |
| 128 | [JimLiu/baoyu-design](https://github.com/JimLiu/baoyu-design) | 4.4k | [#16 Path traversal в @import-уокере](https://github.com/JimLiu/baoyu-design/issues/16) | Дизайн-скиллы с security-фиксами: пин после каждого фикса |
| 129 | [mvschwarz/openrig](https://github.com/mvschwarz/openrig) | 8k | [#1478 per-seat MCP-серверы](https://github.com/mvschwarz/openrig/issues/1478) | Per-seat pins: изоляция конфигов |
| 130 | [WenyuChiou/awesome-agentic-ai-zh](https://github.com/WenyuChiou/awesome-agentic-ai-zh) | 7.8k | [#286 content health review](https://github.com/WenyuChiou/awesome-agentic-ai-zh/issues/286) | Кураторский health-check = наш skills report |
| 131 | [yzfly/Awesome-MCP-ZH](https://github.com/yzfly/Awesome-MCP-ZH) | 7.8k | [#758 заявки на включение](https://github.com/yzfly/Awesome-MCP-ZH/issues/758); mcp=906 | Главный zh-список MCP: маркеры «drift-checked» |
| 132 | [dipakkr/awesome-ai-engineering](https://github.com/dipakkr/awesome-ai-engineering) | 22.4k | skill=25 куратор | Пин-секция в гайдах |
| 133 | [zebbern/claude-code-guide](https://github.com/zebbern/claude-code-guide) | 4.7k | [#28 Agent QA для MCP-workflows](https://github.com/zebbern/claude-code-guide/issues/28) | QA-раздел = canary replay |
| 134 | [datawhalechina/easy-vibe](https://github.com/datawhalechina/easy-vibe) | 20.1k | mcp=3, zh-образование | В каждый туториал — rugsnare step |
| 135 | [liyupi/ai-guide](https://github.com/liyupi/ai-guide) | 21.5k | zh-гайды | Аналогично |
| 136 | [NirDiamant/GenAI_Agents](https://github.com/NirDiamant/GenAI_Agents) | 24.7k | [#165 tutorial proposal](https://github.com/NirDiamant/GenAI_Agents/issues/165) | Туториал «MCP integrity» от NirDiamant = массовый охват |
| 137 | [NirDiamant/agents-towards-production](https://github.com/NirDiamant/agents-towards-production) | 21.7k | [#27 broken link в agent-with-mcp](https://github.com/NirDiamant/agents-towards-production/issues/27) | Prod-серия: наш CI-gate как глава |
| 138 | [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) | 19.6k | [#319 «16 файлов ссылаются на имена тулов, которых больше нет» — КЛАССИЧЕСКАЯ жертва дрейфа](https://github.com/AgriciDaniel/claude-seo/issues/319) | Живой пострадавший: наш diff предотвратил бы; кейс-стади |
| 139 | [img2threejs/img2threejs](https://github.com/img2threejs/img2threejs) | 18.6k | [#7 расширение хостов](https://github.com/img2threejs/img2threejs/issues/7) | Пин при каждом адаптере |
| 140 | [Evil0ctal/Douyin_TikTok_Download_API](https://github.com/Evil0ctal/Douyin_TikTok_Download_API) | 20.8k | mcp=17 | zh-массовый сервис: MCP-контракт в пин |
| 141 | [microsoft/SkillOpt](https://github.com/microsoft/SkillOpt) — дубль выше, заменяем на [candlelabs/swap-mcp](https://github.com/candlelabs/swap-mcp) | — | Свопы+MCP (деньги) | `--forbid-tool` + бюджеты |
| 142 | [tw93/Waza](https://github.com/tw93/Waza) | 7.3k | [#84 punctuation-скилл правит wikilinks](https://github.com/tw93/Waza/issues/84) | Пин SKILL.md — поведение скиллов видно |
| 143 | [mcp-use/mcp-use — дубль; заменяем: Appllama/appllama-skills](https://github.com/Appllama/appllama-skills) | 2.9k | skill=21 | Пин коллекции |
| 144 | [kaankiziltug/logo-design-skill](https://github.com/kaankiziltug/logo-design-skill) | 4k | skill=39 | Пин дизайн-скиллов |
| 145 | [Jakeschincariol/replica-skill](https://github.com/Jakeschincariol/replica-skill) | 4k | skill=28 | Пин |
| 146 | [nateherkai/scroll-craft](https://github.com/nateherkai/scroll-craft) | 3.8k | skill=23 | Пин |
| 147 | [muxuuu/serenity-skill](https://github.com/muxuuu/serenity-skill) | 4.1k | skill=33 | Пин |
| 148 | [0x0funky/agent-sprite-forge](https://github.com/0x0funky/agent-sprite-forge) | 4.5k | skill=36 | Пин |
| 149 | [xianyu110/awesome-openclaw-tutorial](https://github.com/xianyu110/awesome-openclaw-tutorial) | 4.6k | skill=10; туториалы openclaw | Verified-конфиги в примерах |
| 150 | [inkeep/open-knowledge](https://github.com/inkeep/open-knowledge) | 4.7k | mcp=3, knowledge-платформа | Пины их MCP-интеграций |

## Сводка волны 5
- 100 целей: ~70 с прямыми болевыми ссылками; 30 — платформенные/кураторские с обоснованием.
- Категории: официальные платформы 8 · инфраструктура 14 · серверы-издатели 15 · платформы/клиенты 28 · skills/гайды 35.
- Новые явления: грейд-бот раздал «A 88–92/100» минимум 5 серверам (excel, arxiv, korean-law, +repomix/Scrapling ранее) — верифицируемый бейдж как ответ; вендоры сами RFC-ят receipts/attestations (haystack, uber); открытые дыры (pentestagent #90, jadx #127, metamcp #375) — готовый материал для security-контента.

**Суммарно по 5 волнам: 220 целей.**

---

# Волна 6: +100 целей (151–250), все 500+★

Явления волны: (1) аудиторы-одиночки уже сами проходят по MCP-серверам — [meta-ads-mcp #69 «167 findings, Score 0/100»](https://github.com/pipeboard-co/meta-ads-mcp/issues/69), exa «A 88/100»; (2) отдельный класс тикетов «инструмент молча врёт» (Premiere #115, MobileBuildMCP #535, matlab #123); (3) платформы тихо убивают API (boss-agent-cli #472) — жертвы дрейфа в дикой природе.

## И. Официальные платформы и вендоры (12)

| # | Репо | ★ | Боль / ссылка | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 151 | [googleapis/mcp-toolbox](https://github.com/googleapis/mcp-toolbox) | 16.7k | [#4253](https://github.com/googleapis/mcp-toolbox/issues/4253) | Официальный Google: pins в toolbox-конфигах |
| 152 | [microsoft/mcp-for-beginners](https://github.com/microsoft/mcp-for-beginners) | 17.5k | [#984](https://github.com/microsoft/mcp-for-beginners/issues/984) | Курс Microsoft: глава про drift/pinning в curriculum |
| 153 | [zereight/gitlab-mcp](https://github.com/zereight/gitlab-mcp) | 2.1k | [#876 «v3: strict validation»](https://github.com/zereight/gitlab-mcp/issues/876) | Официальный GitLab: пины к v3-миграции |
| 154 | [matlab/matlab-mcp-server](https://github.com/matlab/matlab-mcp-server) | 1.7k | [#123 «silently wedges»](https://github.com/matlab/matlab-mcp-server/issues/123) | MathWorks: пин+diff как regression-гейт |
| 155 | [matlab/simulink-agentic-toolkit](https://github.com/matlab/simulink-agentic-toolkit) | 1.3k | [#24](https://github.com/matlab/simulink-agentic-toolkit/issues/24) | Industrial-рынок |
| 156 | [MiniMax-AI/MiniMax-MCP](https://github.com/MiniMax-AI/MiniMax-MCP) | 1.5k | [#36](https://github.com/MiniMax-AI/MiniMax-MCP/issues/36) | Официальный MiniMax |
| 157 | [NVIDIA-AI-Blueprints/video-search-and-summarization](https://github.com/NVIDIA-AI-Blueprints/video-search-and-summarization) | 1.9k | [#1518](https://github.com/NVIDIA-AI-Blueprints/video-search-and-summarization/issues/1518) | NVIDIA-блюпринты: pins в деплой-конфиг |
| 158 | [getsentry/MobileBuildMCP](https://github.com/getsentry/MobileBuildMCP) | 6.5k | [#535 «tools silently do nothing»](https://github.com/getsentry/MobileBuildMCP/issues/535) | Sentry-семья: canary ловит контракт-vs-поведение |
| 159 | [awslabs/cli-agent-orchestrator](https://github.com/awslabs/cli-agent-orchestrator) | 1.5k | [#965 identity binding](https://github.com/awslabs/cli-agent-orchestrator/issues/965) | AWS: receipts как identity-трейл |
| 160 | [openai/tunnel-client](https://github.com/openai/tunnel-client) | 589★ | [#87 «tools/call arrives without session»](https://github.com/openai/tunnel-client/issues/87) | Прокси-тесты как conformance для их транспорта |
| 161 | [dotnet/skills](https://github.com/dotnet/skills) | 5.7k | [#170](https://github.com/dotnet/skills/issues/170) | Официальные .NET-скиллы: пиннинг |
| 162 | [IBM/AssetOpsBench](https://github.com/IBM/AssetOpsBench) | 2.4k | [#645 opaque schema guard](https://github.com/IBM/AssetOpsBench/issues/645) | Schema-прозрачность через пины |

## К. Инфраструктура, реестры, клиенты (16)

| # | Репо | ★ | Боль / ссылка | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 163 | [mcpjungle/MCPJungle](https://github.com/mcpjungle/MCPJungle) | 1.3k | [#260 «tools/list_changed + polling fallback»](https://github.com/mcpjungle/MCPJungle/issues/260) | Реестр: пин + дрейф-уведомления в каталоге |
| 164 | [ravitemer/mcphub.nvim](https://github.com/ravitemer/mcphub.nvim) | 1.8k | [#291](https://github.com/ravitemer/mcphub.nvim/issues/291) | Neovim-хаб: diff-статус в статуслайне |
| 165 | [jonigl/mcp-client-for-ollama](https://github.com/jonigl/mcp-client-for-ollama) | 832★ | [#311 «tool calling hangs indefinitely»](https://github.com/jonigl/mcp-client-for-ollama/issues/311) | Ollama-клиенты: doctor для зависаний |
| 166 | [HelpCode-ai/anythingmcp](https://github.com/HelpCode-ai/anythingmcp) | 774★ | [#982 адаптеры](https://github.com/HelpCode-ai/anythingmcp/issues/982) | good-first-issue + пины |
| 167 | [ArcadeAI/arcade-mcp](https://github.com/ArcadeAI/arcade-mcp) | 1.1k | [#915 «spec conformance violated»](https://github.com/ArcadeAI/arcade-mcp/issues/915) | Пины как фиксация спека |
| 168 | [evilsocket/nerve](https://github.com/evilsocket/nerve) | 1.3k | [#67 «not working with ANY streamableHttp MCP»](https://github.com/evilsocket/nerve/issues/67) | Легендарный sec-автор: PR + наш gate в CI |
| 169 | [nicobailon/pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) | 1.6k | [#872 frozen ui.theme валит каждый вызов](https://github.com/nicobailon/pi-mcp-adapter/issues/872) | Диагностика «среда ломает контракт» |
| 170 | [MinishLab/semble](https://github.com/MinishLab/semble) | 6.3k | [#297 shared MCP server across sessions](https://github.com/MinishLab/semble/issues/297) | Общий сервер = общий пин + изоляция |
| 171 | [Vexa-ai/vexa](https://github.com/Vexa-ai/vexa) | 2.9k | [#1646 «annotations on EVERY tool»](https://github.com/Vexa-ai/vexa/issues/1646) | Пиннинг аннотаций v1.5 — готовый ответ |
| 172 | [universal-tool-calling-protocol/code-mode](https://github.com/universal-tool-calling-protocol/code-mode) | 1.6k | Протокол UTC поверх MCP | PIN-SPEC как совместимый формат |
| 173 | [isaacphi/mcp-language-server](https://github.com/isaacphi/mcp-language-server) | 1.6k | LSP-over-MCP | Пины editor-интеграций |
| 174 | [0xSteph/pentest-ai](https://github.com/0xSteph/pentest-ai) | 1.8k | [#58 findings never persist](https://github.com/0xSteph/pentest-ai/issues/58) | receipts как persistence-слой |
| 175 | [OpenOSINT/OpenOSINT](https://github.com/OpenOSINT/OpenOSINT) | 1.8k | [#48 «Security scan integration for agent tooling»](https://github.com/OpenOSINT/OpenOSINT/issues/48) | Прямая интеграция сканера |
| 176 | [LING71671/open-reverselab](https://github.com/LING71671/open-reverselab) | 1.3k | [#19](https://github.com/LING71671/open-reverselab/issues/19) | Router-поддержка |
| 177 | [trpc-group/trpc-agent-go](https://github.com/trpc-group/trpc-agent-go) | 1.9k | [#2507 numeric schema bounds](https://github.com/trpc-group/trpc-agent-go/issues/2507) | Deep schema-diff им в тесты |
| 178 | [uvwt/agentdock](https://github.com/uvwt/agentdock) | 1.3k | MCP-док агентов | Пины на слот дока |

## Л. Серверы-издатели (20)

| # | Репо | ★ | Боль / ссылка | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 179 | [exa-labs/exa-mcp-server](https://github.com/exa-labs/exa-mcp-server) | 5.2k | [#459 «scored A 88/100»](https://github.com/exa-labs/exa-mcp-server/issues/459) | Верифицируемый бейдж вместо opaque-грейда |
| 180 | [bethington/ghidra-mcp](https://github.com/bethington/ghidra-mcp) | 5.8k | [#608](https://github.com/bethington/ghidra-mcp/issues/608) | RE-сообщество: жёсткий аудит-рынок |
| 181 | [CoplayDev/unity-mcp](https://github.com/CoplayDev/unity-mcp) | 15.3k | [#1480](https://github.com/CoplayDev/unity-mcp/issues/1480) | GameDev: пины движковых тулов |
| 182 | [21st-dev/magic-mcp](https://github.com/21st-dev/magic-mcp) | 6.2k | [#85](https://github.com/21st-dev/magic-mcp/issues/85) | UI-генерация: пины |
| 183 | [54yyyu/zotero-mcp](https://github.com/54yyyu/zotero-mcp) | 5.5k | [#723](https://github.com/54yyyu/zotero-mcp/issues/723) | Academia |
| 184 | [homeassistant-ai/ha-mcp](https://github.com/homeassistant-ai/ha-mcp) | 5.2k | [#2787 «Version reads take the manifest PIN's version…»](https://github.com/homeassistant-ai/ha-mcp/issues/2787) — уже наша лексика | HA: manifest-pins вместе с нашим pin store |
| 185 | [hetpatel-11/Adobe_Premiere_Pro_MCP](https://github.com/hetpatel-11/Adobe_Premiere_Pro_MCP) | 735★ | [#115 «ignores binName and reports success» — тул врёт](https://github.com/hetpatel-11/Adobe_Premiere_Pro_MCP/issues/115) | canary ловит «успех без действия» |
| 186 | [kimsungwhee/apple-docs-mcp](https://github.com/kimsungwhee/apple-docs-mcp) | 4.4k | [#51 «returns 0 for valid APIs» — дрейф источника](https://github.com/kimsungwhee/apple-docs-mcp/issues/51) | Мониторинг против дрейфа Apple-страниц |
| 187 | [mukul975/cve-mcp-server](https://github.com/mukul975/cve-mcp-server) | 1.6k | [#12 «5 schema mismatches vs docs»](https://github.com/mukul975/cve-mcp-server/issues/12) | Документация из пина |
| 188 | [designcomputer/mysql_mcp_server](https://github.com/designcomputer/mysql_mcp_server) | 1.4k | [#99 «name conflicts across instances»](https://github.com/designcomputer/mysql_mcp_server/issues/99) | Cross-server shadow detection |
| 189 | [irinabuht12-oss/google-ads-meta-ads-mcp](https://github.com/irinabuht12-oss/google-ads-meta-ads-mcp) | 5.5k | [#2 «can't self-host»](https://github.com/irinabuht12-oss/google-ads-meta-ads-mcp/issues/2) | Конфиг из пина = воспроизводимость |
| 190 | [pipeboard-co/meta-ads-mcp](https://github.com/pipeboard-co/meta-ads-mcp) | 1.3k | [#69 «Security audit: 167 findings, 0/100»](https://github.com/pipeboard-co/meta-ads-mcp/issues/69) | Continuous-audit вместо разовых проверок |
| 191 | [dsphper/lanhu-mcp](https://github.com/dsphper/lanhu-mcp) | 2.5k | [#92](https://github.com/dsphper/lanhu-mcp/issues/92) | zh-дизайн: пины |
| 192 | [jgravelle/jcodemunch-mcp](https://github.com/jgravelle/jcodemunch-mcp) | 2.8k | — (mcp=39) | Пины код-аналитики |
| 193 | [gyoridavid/short-video-maker](https://github.com/gyoridavid/short-video-maker) | 1.4k | — | Пины генеративных тулов |
| 194 | [feder-cr/invisible_playwright_mcp](https://github.com/feder-cr/invisible_playwright_mcp) | 873★ | — | Stealth-браузер: enforce |
| 195 | [golf-mcp/golf](https://github.com/golf-mcp/golf) | 841★ | — | Мини-язык MCP: PIN-SPEC |
| 196 | [jamubc/gemini-mcp-tool](https://github.com/jamubc/gemini-mcp-tool) | 2.3k | [#32](https://github.com/jamubc/gemini-mcp-tool/issues/32) | Диагностика внешних API-сдвигов |
| 197 | [mixelpixx/Konnect](https://github.com/mixelpixx/Konnect) | 1.4k | [#536 «tools never callable — catalog not refreshed»](https://github.com/mixelpixx/Konnect/issues/536) | Каталог из пина: refresh по diff |
| 198 | [zhu1090093659/deepseek-pp](https://github.com/zhu1090093659/deepseek-pp) | 1.9k | — (mcp=93) | zh-мега-проект |

## М. Платформы, клиенты, агенты (38)

| # | Репо | ★ | Боль / ссылка | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 199 | [deepset-ai/haystack](https://github.com/deepset-ai/haystack) | 26.8k | [#11039 «RFC: Signed receipts»](https://github.com/deepset-ai/haystack/issues/11039) | Заход «ваш RFC уже реализован» |
| 200 | [browser-use/browser-harness](https://github.com/browser-use/browser-harness) | 18.5k | [#690 «advertises matching that does not work»](https://github.com/browser-use/browser-harness/issues/690) | Описание vs поведение: canary replay |
| 201 | [every-app/open-seo](https://github.com/every-app/open-seo) | 24.4k | — (mcp=4) | Пины SEO-MCP |
| 202 | [rocketride-org/rocketride-server](https://github.com/rocketride-org/rocketride-server) | 17.7k | — | Пины |
| 203 | [wanshuiyin/Auto-claude-code-research-in-sleep](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep) | 17.9k | [#289](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep/issues/289) | Ночные автономные агенты: пины обязательны |
| 204 | [latent-spaces/brag](https://github.com/latent-spaces/brag) | 17.3k | [#51 batch mode](https://github.com/latent-spaces/brag/issues/51) | Batch = batch-diff |
| 205 | [MemoriLabs/Memori](https://github.com/MemoriLabs/Memori) | 17.1k | [#250](https://github.com/MemoriLabs/Memori/issues/250) | Пины memory-тулов |
| 206 | [xbtlin/ai-berkshire](https://github.com/xbtlin/ai-berkshire) | 17.1k | [#91 перенос скиллов (zh)](https://github.com/xbtlin/ai-berkshire/issues/91) | Пин-манифест для переносимости |
| 207 | [YishenTu/claudian](https://github.com/YishenTu/claudian) | 15.8k | [#1338](https://github.com/YishenTu/claudian/issues/1338) | TUI-клиент: MCP-статус |
| 208 | [eigent-ai/eigent](https://github.com/eigent-ai/eigent) | 15.6k | [#1459](https://github.com/eigent-ai/eigent/issues/1459) | Мульти-агентность: pins per-agent |
| 209 | [superset-sh/superset](https://github.com/superset-sh/superset) | 15.4k | [#8165](https://github.com/superset-sh/superset/issues/8165) | Verify перед exec |
| 210 | [Arindam200/awesome-ai-apps](https://github.com/Arindam200/awesome-ai-apps) | 16.5k | [#356](https://github.com/Arindam200/awesome-ai-apps/issues/356) | Листинг с integrity-пометками |
| 211 | [ThinkInAIXYZ/deepchat](https://github.com/ThinkInAIXYZ/deepchat) | 6.4k | [#2440](https://github.com/ThinkInAIXYZ/deepchat/issues/2440) | DeepChat (zh/en): pin-on-add |
| 212 | [nanbingxyz/5ire](https://github.com/nanbingxyz/5ire) | 5.4k | [#368 MCP Instructions](https://github.com/nanbingxyz/5ire/issues/368) | Instructions = pinned prompts |
| 213 | [Devin-AXIS/iPolloWork](https://github.com/Devin-AXIS/iPolloWork) | 7.1k | [#319](https://github.com/Devin-AXIS/iPolloWork/issues/319) | Каталог с пинами |
| 214 | [KnockOutEZ/wigolo](https://github.com/KnockOutEZ/wigolo) | 5.5k | [#225](https://github.com/KnockOutEZ/wigolo/issues/225) | Пины поисковых тулов |
| 215 | [the-open-agent/openagent](https://github.com/the-open-agent/openagent) | 5.7k | — | Пины |
| 216 | [epoko77-ai/im-not-ai](https://github.com/epoko77-ai/im-not-ai) | 6.2k | — (skill=28) | Skills-пиннинг |
| 217 | [oomol-lab/open-connector](https://github.com/oomol-lab/open-connector) | 6.1k | [#649 «source-rights evidence BEFORE tool admission»](https://github.com/oomol-lab/open-connector/issues/649) | Admission по пину — прямое попадание |
| 218 | [clidey/whodb](https://github.com/clidey/whodb) | 5k | — | Пины SQL-тулов |
| 219 | [breaking-brake/cc-wf-studio](https://github.com/breaking-brake/cc-wf-studio) | 5.4k | [#430 fine-grained allowed-tools](https://github.com/breaking-brake/cc-wf-studio/issues/430) | Allowlist из пина |
| 220 | [davepoon/buildwithclaude](https://github.com/davepoon/buildwithclaude) | 3.7k | [#162 click-to-mcp](https://github.com/davepoon/buildwithclaude/issues/162) | Авто-пин при авто-обёртке CLI |
| 221 | [nitrocloudofficial/nitrostack](https://github.com/nitrocloudofficial/nitrostack) | 2.5k | [#328 docs vs args](https://github.com/nitrocloudofficial/nitrostack/issues/328) | Доки из пина |
| 222 | [can4hou6joeng4/boss-agent-cli](https://github.com/can4hou6joeng4/boss-agent-cli) | 2.1k | [#472 «旧简历接口已下线» — платформа тихо убила API](https://github.com/can4hou6joeng4/boss-agent-cli/issues/472) | Жертва дрейфа — кейс-стади |
| 223 | [aoci-spec/aoci-code](https://github.com/aoci-spec/aoci-code) | 1.7k | — (mcp=44) | Пины |
| 224 | [Zen4-bit/Proxima](https://github.com/Zen4-bit/Proxima) | 1.2k | [#86](https://github.com/Zen4-bit/Proxima/issues/86) | Budgets |
| 225 | [wzyn20051216/solidworks-automation-skill](https://github.com/wzyn20051216/solidworks-automation-skill) | 1.3k | — (skill=25) | CAD-скиллы |
| 226 | [conorluddy/ios-simulator-skill](https://github.com/conorluddy/ios-simulator-skill) | 1.3k | — (skill=31) | Пины |
| 227 | [nduckmink/arkon](https://github.com/nduckmink/arkon) | 1.5k | [#35](https://github.com/nduckmink/arkon/issues/35) | Пины |
| 228 | [reticlehq/reticle](https://github.com/reticlehq/reticle) | 1.3k | [#1698](https://github.com/reticlehq/reticle/issues/1698) | Devtools-host: пины |
| 229 | [thClaws/thClaws](https://github.com/thClaws/thClaws) | 1.2k | [#227](https://github.com/thClaws/thClaws/issues/227) | Пины |
| 230 | [i365dev/free4chat](https://github.com/i365dev/free4chat) | 1.2k | [#482 «terminate tool descendants»](https://github.com/i365dev/free4chat/issues/482) | Наш kill-switch |
| 231 | [cinderline/northcinder](https://github.com/cinderline/northcinder) | 1.2k | — | Пины |
| 232 | [genieincodebottle/generative-ai](https://github.com/genieincodebottle/generative-ai) | 2.6k | — | Пины |
| 233 | [bartolli/codanna](https://github.com/bartolli/codanna) | 756★ | [#139](https://github.com/bartolli/codanna/issues/139) | Пины код-аналитики |
| 234 | [benmaster82/Kwipu](https://github.com/benmaster82/Kwipu) | 610★ | [#3](https://github.com/benmaster82/Kwipu/issues/3) | Пины |
| 235 | [Bessouat40/RAGLight](https://github.com/Bessouat40/RAGLight) | 673★ | [#175 v4 rebuild](https://github.com/Bessouat40/RAGLight/issues/175) | Пины как changelog мажора |
| 236 | [Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts) | 12.9k | Библиотека промптов (mcp=37) | Pinned prompts |

## Н. Skills-вселенная 3 (14)

| # | Репо | ★ | Боль / ссылка | Заход | Вердикт: входим? |
|---|---|---|---|---|---|
| 237 | [heilcheng/awesome-agent-skills](https://github.com/heilcheng/awesome-agent-skills) | 6.3k | [#246](https://github.com/heilcheng/awesome-agent-skills/issues/246); 501 скилл | Приём через skills scan |
| 238 | [antfu/skills](https://github.com/antfu/skills) | 6k | [#37 «Broken refs in skill»](https://github.com/antfu/skills/issues/37) | Anthony Fu = мультипликатор |
| 239 | [wuyoscar/GPT-Image2-Skill](https://github.com/wuyoscar/GPT-Image2-Skill) | 5.8k | [#32](https://github.com/wuyoscar/GPT-Image2-Skill/issues/32) | Пины |
| 240 | [OpenSenseNova/SenseNova-Skills](https://github.com/OpenSenseNova/SenseNova-Skills) | 5.8k | [#180 «SKILL.md frontmatter assumptions» — дрейф фронтматтера](https://github.com/OpenSenseNova/SenseNova-Skills/issues/180) | skills diff ловит фронтматтер |
| 241 | [sergebulaev/linkedin-skills](https://github.com/sergebulaev/linkedin-skills) | 5k | [#71](https://github.com/sergebulaev/linkedin-skills/issues/71) | Пины |
| 242 | [kajisho5/ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) | 2k | [#143 «real-hands verification»](https://github.com/kajisho5/ffmpeg-skill/issues/143) | skills report = verification-артефакт |
| 243 | [eugeniughelbur/obsidian-second-brain](https://github.com/eugeniughelbur/obsidian-second-brain) | 4.8k | [#332](https://github.com/eugeniughelbur/obsidian-second-brain/issues/332) | Пины содержимого |
| 244 | [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) | 15.5k | [#635](https://github.com/travisvn/awesome-claude-skills/issues/635) | Куратор: integrity-пометки |
| 245 | [AgriciDaniel/claude-obsidian](https://github.com/AgriciDaniel/claude-obsidian) | 15.7k | Obsidian-агент | Пины его тулов |
| 246 | [brycewang-stanford/Auto-Empirical-Research-Skills](https://github.com/brycewang-stanford/Auto-Empirical-Research-Skills) | 4.7k | [#76](https://github.com/brycewang-stanford/Auto-Empirical-Research-Skills/issues/76) | Research-скиллы |
| 247 | [nexu-io/html-anything](https://github.com/nexu-io/html-anything) | 9.2k | [#128](https://github.com/nexu-io/html-anything/issues/128); 136 скиллов | Пины |
| 248 | [0xNyk/awesome-hermes-agent](https://github.com/0xNyk/awesome-hermes-agent) | 5.9k | [#468](https://github.com/0xNyk/awesome-hermes-agent/issues/468) | Куратор hermes-экосистемы |
| 249 | [RyanAlberts/best-of-Agent-Harnesses](https://github.com/RyanAlberts/best-of-Agent-Harnesses) | 1.3k | [#145](https://github.com/RyanAlberts/best-of-Agent-Harnesses/issues/145) | Колонка «integrity: pinned?» в рейтинге |
| 250 | [ikaijua/Awesome-AITools](https://github.com/ikaijua/Awesome-AITools) | 6.2k | Мега-лист AI-тулов (mcp=38) | Integrity-пометки в листинге |

## Сводка волны 6
- 100 целей: ~70 с болевыми ссылками; 30 платформенных/кураторских.
- Категории: официальные платформы 12 · инфраструктура 16 · серверы-издатели 20 · платформы/клиенты 38 · skills 14.
- Явления: аудиторы-одиночки публикуют «0/100» и «167 findings» по MCP-серверам; класс «тул молча врёт об успехе» (Premiere #115, MobileBuild #535, matlab #123) — кейсы для canary-пиара; ha-mcp уже оперирует «manifest pin» — наша лексика проникает в экосистему.

**Суммарно по 6 волнам: 320 целей.**
