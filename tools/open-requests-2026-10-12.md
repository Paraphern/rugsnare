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
