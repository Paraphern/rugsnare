# GitHub trading-MCP: кандидаты для следующей охоты RugSnare

**Дата:** 2026-10-05 · **Источник:** github.com/search?q=trading (51 репо, pushed ≥ 2026-07-01)
**Критерии:** MCP-сервер · категория «деньги» · обновлён июль–октябрь 2026 · 2+ версии (релизы/теги/npm) · живой.
Статус: **поиск остановлен на 10** (запрошено). Тесты rugsnare — следующим заходом.

## Десятка

| # | Цель | Почему злодей / что тестировать |
|---|---|---|
| 1 | **npm `tradingview-mcp` (blasesc)** | Захват имени репозитория tradesdontlie/tradingview-mcp (6722★). Создан 2026-07-05, 1 версия, БЕЗ repository-поля, bin `tv`+`src/server.js` и 51 файл идентичны оригиналу. Пользователи ставят `npx tradingview-mcp`, думая, что это популярный проект. Репаблиш чужого кода без происхождения. |
| 2 | **asman9659/tradingview-mcp** | Замаскированная копия того же 6722★-репо: `fork=false` (создана 2026-07-22 как standalone, чтобы не светить «forked from»), вручную синхронизируется до 2026-10-04. Классика подготовки к тихой подмене. |
| 3 | **baolin1389/trade-runtime** | Закрытый MCP: исходники в приватном репо, публикуется 34-МБ tarball + `curl … install.sh \| bash` в /opt (README: «One-Line Installation (recommended for AI agents)»). CRM + email + DB. Неаудируемо, версия v0.7.1, июль. |
| 4 | **wl18295600077-a11y/okx-trading-mcp** | GitHub-Pages лендинг (кит.) под OKX-фьючерсы от аккаунта с генерёным ником: «AI откроет/закроет позиции за вас», `pro/execute_trade.py` (24КБ live-трейдинг),杠杆 1–125x, install.bat-визард с API-ключом. Август. |
| 5 | **bybit-exchange/trading-mcp** (npm `bybit-official-trading-server`) | Официальный Bybit: 382 инструмента, 21 npm-версия (последняя 2.1.22 @ 2026-09-22), 1332 dl/wk, pushed 2026-10-05. Гигантская drift-поверхность контракта биржевого доступа. |
| 6 | **okx/agent-trade-kit** | Официальный OKX: 100 тегов (0 формальных релизов!), 461★, TS, pushed 2026-10-05. Spot/swap/futures/options/grid-боты. Контракт меняется тегами без релиз-нот. |
| 7 | **trippy-mcp** (danvaneijck/trippy-mcp) | Injective on-chain трейдинг: npm 29 версий, 463 dl/wk, repo pushed 2026-10-01. Высокая скорость версий у кошелько-подобного сервера. |
| 8 | **fiale-plus/tradingview-mcp-server** | 11 релизов (v0.7.1 @ 2026-08-21) + npm 11 версий, 338 dl/wk. Unofficial TradingView API — нормальная история версий = чистый drift-полигон. |
| 9 | **SKalinin909/tradingcalc-mcp** | Опционы (Black-Scholes): 10 релизов, npm 12 версий (npm опережает GitHub-релизы), 204 dl/wk, сентябрь. |
| 10 | **atilaahmettaner/tradingview-mcp** | 4914★, Python, «Hosted or self-host» — REMOTE MCP URL. Тестируется через `rugsnare scan --server X --url` (пин удалённого контракта до добавления в конфиг). Pushed 2026-10-04. |

## Резервы (если понадобятся замены)
- backtest-kit/ai-trading-mcp — TS crypto-trading rig, pushed 2026-10-04, релизов ещё нет (drift по коммитам).
- moeuu/tradingview-mcp — «local-first», 4 bin, 1 релиз, Sep 30.
- tradesdontlie/tradingview-mcp — сам оригинал 6722★ (Jul 28) для кросс-сверки кластера #1/#2.
- JesusRS1/stock-trade-finance-api (138★), jaipreet15 (152★), Weebapp003 (135★), pueschel88 (133★) — npm-имёна не разрешены, проверить при необходимости.

## Готовые углы атаки
- Кластер `tradingview-mcp` (#1+#2+оригинал): сравнить контракты трёх копий (chameleon по происхождению) и задиффить будущие обновления замаскированной копии против пина оригинала.
- Bybit/OKX (#5+#6): пиннуть полный контракт (382 тулa) и ловить NEW/REMOVED на каждом теге.
- Remote-пин (#10): первый тест `rugsnare scan --url` в поле.

Проверки сделаны: релизы/теги/npm для 18 репо, ownership npm-имени, tarball-структура (скачан, не установлен), README/лендинг прочитаны статически. Ничего не запускалось и не устанавливалось.
