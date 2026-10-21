# 10 репозиториев 500+★, где RugSnare полезен — и куда мы ещё не заявились

**Дата:** 2026-10-21 · Проверка «не заявились»: поиск issues по слову rugsnare в каждом репо (0 упоминаний у всех десяти; вычеркнуты cline — 2 упоминания, continue — 1, goose — 1; вендоры из docs/servers не включались). Звёзды — на день проверки, все живые (pushed за последние дни).

| # | Репо | ★ | Что это | Боль | Заход |
|---|---|---|---|---|---|
| 1 | [n8n-io/n8n](https://github.com/n8n-io/n8n) | 208k | Workflow-автоматизация, нативные MCP-ноды (43 TS-файла McpClientTool) | **Ощущаемая:** воркфлоу с MCP-нодами молча ломаются при дрейфе сервера — исполнение падает или меняет поведение в проде | Issue + доки-PR: «пин контракта MCP-инструмента в ноде» — rugsnare diff как pre-deploy шаг воркфлоу; canary replay перед сменой версии сервера в ноде |
| 2 | [langgenius/dify](https://github.com/langgenius/dify) | 159k | Платформа агентных воркфлоу с MCP-инструментами | **Ощущаемая:** продакшн-агенты с MCP-тулами меняют поведение после апдейта сервера; для enterprise = инцидент без следа | Enterprise-заход: PIN-SPEC для их каталога инструментов + drift-события и receipts в ops-контур Dify |
| 3 | [open-webui/open-webui](https://github.com/open-webui/open-webui) | 156k | Самый массовый self-hosted AI-интерфейс с MCP | **Не нащупанная:** юзер подключает сервер в UI — и отдаёт агента на волю любого молчаливого апдейта; никто не ждёт «проверки» инструмента | PR-концепт: «pin on connect» — при добавлении сервера автоматический scan, периодический diff, бейдж статуса у каждого сервера в UI |
| 4 | [farion1231/cc-switch](https://github.com/farion1231/cc-switch) | 147k | Десктоп-менеджер конфигов Claude Code/агентов (17 MCP-упоминаний в README), китайская аудитория | **Не нащупанная:** агрегирует десятки MCP-конфигов, но ничего их не верифицирует | Фича «integrity check» на конфиг (rugsnare doctor/diff под капотом); у нас готов zh-гайд (llms-install.zh.md) — идеальный заход |
| 5 | [browser-use/browser-use](https://github.com/browser-use/browser-use) | 118k | Браузерные агенты + MCP-инструменты | **Ощущаемая + злая:** браузер = cookies/сессии; дрейф инструмента меняет, что агент делает на страницах (наша охота ловила именно browser-MCP) | MCP-тулы в конфиге агента пиннятся; enforce-прокси для чувствительных сессий; наш полевой материал по browser-villains — готовый аргумент |
| 6 | [paperclipai/paperclip](https://github.com/paperclipai/paperclip) | 105k | «Управление агентами на работе» | **Не нащупанная (enterprise):** флот агентов = compliance-требование «что делал агент и не менялись ли его инструменты» | Fleet-интеграция: report --live + drift-feed + receipts-досье как аудит-артефакт для регуляторов |
| 7 | [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | 96k | ГЛАВНЫЙ курируемый список MCP-серверов, оттуда ставят все | **Не нащупанная:** курация без integrity — 96k★ доверия без единой проверки контрактов | PR: маркер «drift-checked» у записей со ссылкой на публичный архив rugsnare.com/scans (`rugsnare history` уже выдаёт данные) — список становится целостностно-осознанным |
| 8 | [lobehub/lobehub](https://github.com/lobehub/lobehub) | 83k | Agent-оператор с маркетплейс-плагинами (MCP) | **Ощущаемая:** маркетплейс-записи никто не перепроверяет после листинга | Пин контракта в момент листинга + статус дрейфа на карточке плагина |
| 9 | [CherryHQ/cherry-studio](https://github.com/CherryHQ/cherry-studio) | 52.8k | Десктоп-MCP-клиент для массового пользователя (вкл. огромную zh-аудиторию) | **Ощущаемая и кровавая:** именно таких юзеров ловят лендинги в стиле нашей okx-phishing-находки | В панель MCP-настроек — «verify & pin» на каждый сервер; заход через zh-гайд |
| 10 | [modelcontextprotocol/registry](https://github.com/modelcontextprotocol/registry) | 7.4k | ОФИЦИАЛЬНЫЙ реестр MCP | **Не нащупанная (экосистемная):** листинг не несёт никакой информации о стабильности контракта | Предложение: pins по PIN-SPEC как опциональные метаданные server.json + верификация на стороне реестра; у нас готовы спека, реестровый опыт (Smithery) и 384 теста |

## Запасные (если кто-то из десятки окажется занят/нерелевантен)
- **langflow-ai/langflow** (155k★) — MCP-компоненты, та же боль, что Dify/Flowise.
- **HKUDS/nanobot** (49k★) — личный агент, 8 MCP-хитов в README.
- **promptfoo/promptfoo** (26k★) — уже имеет MCP-интеграцию (site/docs/integrations/mcp.md); canary-replay как eval-стратегия.
- **FlowiseAI/Flowise** (55k★) — визуальные агенты; осторожно: последний push 2026-08-13, проект притормозил.
- **vercel/ai** (27k★) — @ai-sdk/mcp: CI-пиннинг для приложений на AI SDK.

## Уже заявлены (не трогаем в этом заходе)
cline (2 упоминания rugsnare), continue (1), goose (1), все вендоры из docs/servers (apify, bybit, azure-devops, chrome-devtools, context7, currents, heroku, hostinger, hubspot и др.), autogen (#7353), snyk/agent-scan (#482), teleport (#61434), mcp-shield.

## Приоритет захода (мой порядок)
1. **modelcontextprotocol/registry** — одна стратегическая победа покрывает экосистему (PIN-SPEC в метаданных).
2. **punkpeye/awesome-mcp-servers** — дешёвый PR с мультипликатором 96k★.
3. **cc-switch / cherry-studio** — готовые zh-материалы, массовый юзер, быстрые фичи.
4. **n8n / dify** — enterprise-боль, платные сценарии.
5. **open-webui / lobehub / paperclip / browser-use** — PR-концепты «pin on connect» и fleet-аудит.
