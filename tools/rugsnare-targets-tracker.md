# RugSnare targets tracker (верифицированный, живой файл)

**Создан:** 2026-10-21 на базе rugsnare-growth-targets-2.md (50 целей) после верификации.
**Урок A-волны:** три «тёплых сигнала» из исходного списка оказались НАШЕЙ собственной активностью до компакции (skills#492, agents#5315; вероятно и gemini-cli#25693) — перед заходом ВЕЗДЕ сначала искать свои следы.

**Правила:** перед каждым постом — pre-flight: (1) чек упоминаний rugsnare в issues+PR+коде, (2) шаблоны площадки (.github/ISSUE_TEMPLATE, config.yml — n8n-урок), (3) свежесть тикета (state, не отвечен ли уже), (4) перечитать тред целиком, включая свои старые комменты (goose-урок). Звёзды у всех 50 проверены 2026-10-21 ✓.

## Пачка A — «Открытые двери» (боль = дословно наш функционал) — СТАРТ

| # | Репо ★ | Тикет боли | Наш вход | Pre-flight | Статус |
|---|---|---|---|---|---|
| A1 | anthropics/skills 182k | #492 (cc-switch 8673: владелец ответил, наш FAQ-ответ запощен 6325549501 — ждём реакцию на pointer-вариант) | УЖЕ В ТРЕДЕ: наши 2 коммента 11-12.10 (skills-integrity + conformance-прогон их дайджест-фикстуры); тишина после 12.10 | — | WATCH (продолжить при оживании) |
| A2 | thedotmack/claude-mem 102k | #4788 unpinned transitive deps в uvx | Floating-advisory + R32-provenance (поправка: «each captured contract records») | запощено 6325611818 | следить |
| A3 | janhq/jan 45k | #8777 same-name tool as built-in | Shadow detection + undeclared-tool + qualified-names root cause | запощено 6325612459 | следить |
| A4 | openai/openai-agents-python 30k | #5315 | ЗАКРЫТ completed 13.10; наш timeline-anchor коммент 12.10 в треде; аннотации доступны через require_approval/policy | — | УЖЕ ВОВЛЕЧЕНЫ, премис закрыт |
| A5 | sickn33/agentic-awesome-skills 48k | #1687 SkillSpector CI-гейт | ЗАКРЫТ completed 29.09 — премис (просят гейт) исполнен; вход альтернативой = sales-тон | — | DROPPED |

## Пачка B — «Stale-cache клиенты» (пройдена 21.10: 1 запощен B2 + PIVOT zed#59354 — ЗАПОЩЕНО 6326014295: три афорданса для нового MCP-UI)

| # | Репо ★ | Тикет | Наш вход | Статус |
|---|---|---|---|---|
| B1 | microsoft/vscode 194k | #281911 | SKIP: тред эволюционировал в UX-дискуссию мейнтейнеров о кэше выбора (DanTup/aeschli), integrity-вход боком | закрыто |
| B2 | openai/codex 130k | #19155 stale schema | ЗАПОЩЕНО 6325837147: ответ на «Unfortunately not!» (три слоя: fix barryw / watcher / pin); #52730 (overrides) — не трогали, отдельный вход | следить |
| B3 | google-gemini/gemini-cli 107k | #28361 wildcard DENY | DROP: контрибьютор поднял фикс-PR, issue помечен stale-ботом | закрыто |
| B4 | zed-industries/zed 92k | #60649 | PIVOT: UI настроек переписывается в #59354 — вход только туда после изучения | кандидат |
| B5 | crewAIInc/crewAI 60k | #8098 | SKIP: чистый pagination-баг, ответ — фикс, пин тут фон | закрыто |
| B6 | code-yeongyu/oh-my-openagent 70k | #10416 | DROP: фикс реализован в core (senpi#3648 «Did you mean») | закрыто |

## Пачка C — «Dogfood издателей»

| # | Репо ★ | Вход | Статус |
|---|---|---|---|
| C1 | github/github-mcp-server 34k | УЖЕ ЗАЯВЛЕНЫ: #3466 (закрыт) — наша декомпозиция 123/131 + разбор с AAtomless | закрыто |
| C2 | firecrawl 194k | history публично + пины в release-процессе | не начинали |
| C3 | netdata 81k | #24296 | ЗАПОЩЕНО 6326015099 (dogfood-оффер, смягчённый после нулевого раунда) | следить |
| C4 | stripe/agent-toolkit 2k | Финансовый dogfood, A19-кейс | чек не сделан |
| C5 | gradio 44k | #13989: сигнатура функции = контракт, пин при сборке | не начинали |

## Пачка D — «Skills-кураторы»

| # | Репо ★ | Вход | Статус |
|---|---|---|---|
| D1 | affaan-m/ECC 285k | #2900 | ЗАПОЩЕНО 6326013605 (deterministic pinning vs scoring + mirror-hash группировка + оффер прогона 898) | следить, возможен прогон |
| D2 | wshobson/agents 41k | DROP+МИНА: #717 закрыт владельцом как спам (платный lint-спам 20.09); владелец спам-чувствителен — не упоминать инструменты без глубокой субстанции | закрыто |
| D3 | coreyhaines31/marketingskills 56k | Пометка pinned + skills report QA | не начинали |
| D4 | anthropics/claude-plugins-official 44k | DROP: #6369/#6253 — конкретные тех-issue, метаданные листинга идут через registry#1720 | закрыто |

## Пачка E — «zh-триада»

| # | Репо ★ | Вход | Статус |
|---|---|---|---|
| E1 | AstrBotDevs/AstrBot 43k | DROP: #10521 = stdio-COMMAND allowlist (не tool-allowlist) — mismatch | закрыто |
| E2 | zhayujie/CowAgent 47k | Тот же заход + zh | чисто |

## Вычтено из списка (уже заявлены / не цели)

- **playwright-mcp** — #1796 НАШ issue (закрыт completed 19.10), follow-up вопрос висит; следующий ход = ждать ответа pavelfeldman
- awesome-mcp-servers — мы в README (PR #15692)
- Все вендоры docs/servers, cline/continue/goose, teleport, litellm, spec-репо, deepseek, promptfoo#11906, cc-switch#8673, registry#1720, cherry#22381/#16128, netlify#75, notion#367, mcp-servers#5218 (см. кампанию 18-21.10)

## Уроки C/D/E-волны (21.10)
- C1 = четвёртый случай «уже заявлены» у списков другого чата — ВСЕГДА искать свои следы первым делом
- wshobson = спам-мина: владельцы, жёстящие кросс-постинг, помечают любые тул-упоминания спамом
- «живой тикет ≠ актуальный вход»: B-волна потеряла 5/6 на эволюции тредов, C/D/E — 6/13

## Резерв (фреймворки/платформы без прямого тикета — холодный вход, позже)

OpenHands 91k, agno 43k, pydantic-ai 21k, smolagents 30k, adk-python 22k, langgraph 44k, langflow 156k, LibreChat 46k, NextChat 89k, Roo-Code 24k, anything-llm 67k, Kong 44k, daytona 72k, deer-flow 84k, rea 357k, hermes-agent 256k, UI-TARS 39k, LocalAI 50k, Codewhale 41k, codebase-memory-mcp 47k, PageIndex 39k, crawl4ai 86k, workers-mcp 647, spring-ai 9.5k, claude-mem → в A2, oh-my-openagent → B6

## Отдельно

- **n8n** (208k) — фичи только через форум community.n8n.io (blank issues выключены); ручной постинг с аккаунта пользователя; текст драфта сохранён
- Тёплые упоминания к отработке: anthropics/skills#492 (→A1), gemini-cli#25693 (→B3), github-mcp-server (→C1)

## Волна 4-5 (список rugsnare-growth-targets-3.md, 150 целей) — триаж 21.10

Вычеркнуто сразу (уже заявлены, вопреки заявлению списка): litellm#44093 (глубоко), inspector (#2727 not_planned, тот же вендор), SkillSpector#498 (наш коммент стоит).

### Тир 1 — запощено 21.10 (после pre-flight + нулевого раунда; 3 правки: camel-R32, uber-offline/§3.2, voltagent-смягчение)
| Цель | Статус |
|---|---|
| camel#4414 (unpinned mcp-remote) | ЗАПОЩЕНО 6326412124 — три якоря + mongodb-кейс |
| ComposioHQ/awesome-claude-skills#1981 (skill scanner in scope?) | ЗАПОЩЕНО 6326412605 — пара skill-clinic/rugsnare |
| uber/ADR#163 (offline-verifiable attestations) | ЗАПОЩЕНО 6326413027 — Ed25519+on-chain, attest-vs-verdict. **ОТВЕТ Aicent-com (6336640148, 22.10):** цитирует наши 218 + 140/66 раздельно и точно; оффер field-mapping §3.2 ↔ их AE-128 envelope. **НАШ ОТВЕТ ЗАПОЩЕН (6347432661, 22.10):** приняли, таблица non-carried properties, POLICY §3.1 как receipt-аналог, обязательство прогнать их offline-verify на published payload как шаг №1. Мяч у Aicent-com (ждём их драфт таблицы) |
| agentskills#42 (RFC Remote Skills) | ЗАПОЩЕНО 6326413573 — третий тред репо, опора на наши #46/#255 |
| VoltAgent/awesome-openclaw-skills#594 (живой эксфильтратор) | ЗАПОЩЕНО 6326414121 — advisory-класс + оффер intake-гейта |
| microsoft/skill-recorder#8 | DOWNGRADED: контрибьютер забрал; их боль = allowed-tools ПАТТЕРНЫ, не наш schema-guard класс |

### Тир 2 — грейд-когорта: pre-flight 22.10, вердикты
Грейд-бот опознан: **mcp.market (thebigasif)** — сканирует весь официальный реестр по публичному рубрику (code patterns, tool poisoning, auth, maintenance, identity, uptime), бейджи self-updating, «no action needed, close any time». Второй грейдер — Hlido (letta 80/100, «right of reply open»).
- **repomix#1933 — ЗАПОЩЕНО 6348008745 (22.10)** после нулевого раунда (open ✓, #1866 жив ✓, history repomix валиден ✓)
- **arxiv#296 — ЗАПОЩЕНО 6348010991 (22.10)**; нулевой раунд спас: npm-пакет arxiv-mcp-server = чужой publish с плейсхолдером «yourusername», репо blazickjp = Python → строку с history вычистили, оставили scan/diff (stdio, uvx/pipx поддерживаются)
- **excel-mcp#211 — ОТСЕВ: мейнтейнер публично отказался от сторонних бейджей** («As a project policy we don't add third-party badges or directory listings to the README») — заходить с бейджем = глухота
- **korean-law#176 — ОТСЕВ:** закрыт «Closing as suggested», вежливо, без обсуждения — некро-вход
- **Scrapling#511 — ОТСЕВ:** закрыт мейнтейнером без единого коммента («close any time» от самого бота)
- **letta#3452 — ОТСЕВ:** авто-закрыт их github-actions анти-спам гейтом (7 непройденных пунктов шаблона!); у letta строгие third-party disclosure шаблоны — будущий вход только через шаблон с реальной болью
- **caveman#1333 — ЗАПОЩЕНО 6348605473 (22.10):** «Docs: optional "Verified on MCPwell" badge», автор mcpwell (ТРЕТИЙ грейдер-каталог; тестер шлёт ровно initialize+tools/list = наша capture-поверхность). Заход через их культуру провности: HONEST-NUMBERS.md + v1.9.0 «Rock pinned. Rock verified.» (тег+SHA-256 чексаммы хуков) → MCP-поверхность как последний срез, проверяемый только чужим сканером; мы = self-attestation, не бейдж. Нулевой раунд поймал устаревший слоган «make it provable» (в README v4 его нет) — заменён на дословный заголовок релиза v1.9.0

### Тир 3: pre-flight 22.10, вердикты
- **claude-seo#319 — ЗАПОЩЕНО 6348004439 (22.10), приоритет волны:** мейнтейнер пинновал 2.8.10 руками («v2.4.0 keeps the 2.8.10 pin»), elliottwaves-20 предложил PR миграции с фолбэком — вход термин-в-термин (пин обеих поверхностей → дифф = карта миграции). Нулевой раунд: dataforseo-mcp-server на npm подтверждён (latest 3.1.3, их пин 2.8.10), REMOVED→GONE display, «renames» убрано
- **blender#366 — ОТСЕВ: боль саморазрешилась** — сам тикет мейнтейнера начинается «TL;DR — nothing breaks»: PyPI blender-mcp стал compat-обёрткой, старые конфиги работают; заход «пиннинг решит» бьёт мимо. Материал для контента (IDENTITY-класс), не вход
- **gpt-researcher#2192 — ОТСЕВ:** закрыт COMPLETED 10-10 (баг Config discards MCP_SERVERS пофикшен); кейс-стади в контент, не в камент
- **superpowers-zh#95 — ОТСЕВ:** закрыт COMPLETED — они САМИ добавили Zcode в v1.7.12 (`--tool zcode` → ~/.zcode/skills/, глобально, дока README.zcode.md, ссылаются на официальные доки ZCode). Интеллект: подтверждение нашего CANDIDATES-пути ~/.zcode

Упоминаний rugsnare во всех 10 репо: 0 (нет «тёплых сигналов», включая наши собственные следы).

### Волна 7 (growth-targets-4.md, #251-750, 500 целей) — зарегистрирована 22.10, НЕ прогонялась
Очередь: после остатка волны 4-5 (~100 целей: секции A-F из growth-targets-3). В файле введена колонка «Вердикт: входим?» (правило 22.10: ВХОДИМ → ссылка на вход / НЕ ВХОДИМ → причина / пусто = очередь). Заполнено при регистрации: #507 snyk (диалог #482), #322 agent-framework (#5864 наш), #338 apify (#1515 наш + грейд mcp.market «A 98/100»). Новые феномены: **Loaditout — четвёртый грейдер** (#273 vercel-labs/agent-skills#221); грейды mcp.market шире — apify 98/100 (#1596), mobile-mcp 94/100 (#370); официальные SDK-репо TS/Go/ext-apps/spec (#326/#449/#516/#377 — python-sdk уже вычеркнут); security-сканеры SkillSpector-класса: cisco skill-scanner #537, Tencent AI-Infra-Guard #405, agentshield #666 (SkillSpector вычеркнут — к этой когорте осторожно). Пересечения с корпусом: #472 notion (питч отправлен), #616 mcp-remote (мост из camel#4414), #504 punkpeye/fastmcp, #618/#74/#138 n8n-mcp семейство.

### Остаток волны 4-5 — пакет 1 прогнан 22.10 (вечер)
Сетка 32 тикетных строк + 2-й проход по 8. **Запощено 5:** fastmcp#5864 (6349141071 — §2.1 identity как birth-certificate), scientific-agent-skills#324 (6349141552 — skills scan/diff замена триаж-дока), mastra#21989 (6349146964 — typegen из пина, в день закрытия фичи), OmniRoute#17131 (6349147483 — pin-per-protocol-version + SDK-provenance), claude-code-templates#1127 (6349147968 — alias-карта, честная оговорка). **Отсев 4:** CLIProxyAPI#6848 (NOT_PLANNED), last30days#663 (живой security-disclosure — этика), awesome-agent-skills#1165 (NOT_PLANNED), alirezarezvani#1001 (закрыт; мейнтейнер разобрал Shield-отчёт — 10 «критических» = примеры в доке — и заявил анти-бейджевую политику; 2-й анти-бейджевый мейнтейнер). **В очереди ~30:** 23 тикетных (AionUi#4307, qwen-code#8966, agentscope#3371 (фикс в полёте), crush#3791, grafana#1281, cognee#5662, serena#2105, activepieces#16683, aider#3314, FastGPT#7427 (zh), chatbox#3962, awesome-claude-code#2670, graphify#2937, open-design#7968, Agent-Reach#608, ui-ux-pro-max#238, addyosmani#602, diagram-design#189, mukul975#144, pm-skills#62, khoj#1364, ag2ai#3186, claude-code-router#1148) + 7 без-тикетных кураторских (opencode, appcypher/wong2 awesome, agent-zero, learn-claude-code, claude-code-best-practice, academic-research-skills). Интеллект: RJL667 в aider#3314 в августе сформулировал наш тезис про канонические имена — опора для будущего входа.

### Волна 8 (growth-targets-5.md, #751-1112, 362 цели) — зарегистрирована 22.10, ПУЛ ≥500★ ИСЧЕРПАН (итого 1182 цели)
Колонка «Вердикт» введена. Выделить при прогоне: #1068 Puliczek/awesome-mcp-security; #760 zai-org/GLM-5 (MCP-боль в репо нашей модели); официальные SDK csharp/java/php/ruby/rust (#796/#831/#932/#1023/#815); #920 cc-safety-net (соседний guard-инструмент — партнёрский заход); #1105 1mcp-app/agent (агрегатор). Очередь: после остатка 4-5 и волны 7.

### Первая волна (rugsnare-growth-targets.md, десятка) — статус на 22.10
Вошли 4: cc-switch#8673 (владелец ответил, наш FAQ-ответ 6325549501 — ждём), punkpeye/awesome PR#15692 (ждём мерж), cherry-studio #22381+#16128 (ждём), registry#1720 (ждём). Отложен 1: n8n (форум-only, ручной пост юзером — драфт сохранён). НЕ ВОШЛИ 5: dify, open-webui, browser-use, paperclip, lobehub — их заходы были «PR-концепт»-класса (дорогие), перекрыты приоритетами поздних волн; остаются в резерве. Запасные: promptfoo#11906 ВОШЁЛ; langflow/nanobot/Flowise/vercel-ai — резерв.

Стратегическая находка волны: грейд-бот раздал «A 88–92/100» 7+ репо (все opaque) — позиция «выдающего» верифицируемых бейджей (то, что мы отказались НОСИТЬ от mcprush, занимаем с другой стороны).
Остальное (~120) — резерв в категориях списка.

### 23.10 — Дельта-прогон (боль 20-23.10, 500+★)
Верифицировано по API: carpet-bomb free-scan = Grey Ridge Signals Group LLC (rezearcher; akto-атрибуция дельты неверна). Запощено 3 (zilla#2751, Observal#1950, hermes#142803 — consent-persistence). Очередь: lunar#87/#88, mcpm.sh#475 (после реакции). Ironheights/clawhub#4018 не трогаем (OSS-сосед). Новые репо в списки: openclaw (392.9k★!), clawhub, pollinations, zilla, akto, mcpm.sh, agents-radar, nextdns/metadata, botmux, agentic-qe, rea (372k★).

### 24.10 — Watch-раунд 2: правила из наших проб в проде + registry-эскалация
- **ATR 4.2.1**: PR#749 (invisible control before directive — из probe #653) MERGED, changelog кредитует @Paraphern поимённо. Phone-rule (#654) ещё не открылся — ждём PR с линком. НОВЫЙ ПРИОРИТЕТ-WATCH: ATR#727 «Cross-validating MCP tool-poisoning detection: labeled-set exchange» (открыт, наша территория).
- **registry#1720 → #82**: rdimitrov закрыл как DUPLICATE с консолидацией в #82, наше различение (publisher-attested fingerprints vs externally observed change history) сохранено в мастер-треде. #82 = живая спека-точка для участия (дизайн-вопросы: canonicalization, dynamic/auth-dependent tools, annotations, verification).
- Grade-бот thebigasif закрыл COMPLETED ×4 (repomix/mobile-mcp/arxiv/apify), наш коммент последний — треды исчерпаны.
- cc-haha#1625: баг жив («还出现»), тишина мейнтейнеров — watch.

### 24.10 — ДРИФТ-ВОТЧ: ПРОГОН ПРЕРВАН (вернуться по команде юзера)
- Крон перенесён на 21:00/3 дня (был 09:00).
- Ручной прогон НЕ ЗАВЕРШЁН: фоновый раннер (13 серверов последовательно; npm-реестр медленный, добавлены ретраи+prefer-offline) продолжал работать на момент паузы — к 20:34 дошёл до mongodb. Готово на паузе: chrome-devtools 1.8.0→1.12.0 = 32 findings (снапы обеих версий в pins/); netlify 1.14.0→1.20.0 = 10 findings (BREAKING team-services-reader + 5 LOOSENED; снапы есть); currents — pinned-снап есть, latest падал на сети (ретрай в раннере). Остальные результаты — в логе раннера (call_82a75d2f24ce4b799e450d10-stdout.log) по его завершении.
- SKILLS-ПРОГОН ПРОВАЛИЛСЯ и ПЕРЕДЕЛАТЬ: superpowers v7.0.1 и vercel-skills a80e4c9 клонированы, но skills scan не отработал (баг команды); пинов нет. Upstream: superpowers v7.0.1 (21.10), vercel-skills a80e4c9 (19.10).
- Осталось после раннера: собрать результаты → lastSeen/lastFindings в drift-watch-corpus.json → отчёт audits/drift-watch/2026-10-24.md → docs/servers-страницы → REST-коммит (git commit через Bash блокируется Mimosa; прецеденты fadb607/3a976ab/466d529).
