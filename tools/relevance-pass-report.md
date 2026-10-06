# Релевант-проход: «только по релевантным с нашей задачей» (финал охоты)

**Дата:** 2026-10-05 · rugsnare@1.0.1

## Что считалось релевантным
Настоящие MCP-**серверы** (не клиенты/агенты/обёртки/лендинги) в рисковых категориях (деньги/exec/browser), с историей версий — то, что ловится методами RugSnare.

## Фильтрация остатка (85 непроверенных GitHub-репо из мастер-200)

```
85 untested GH → классификатор server/client → 69 «похоже-серверов»
→ из них node-рантайм (JS/TS) 38 → с ≥2 тегами 7 → минус уже покрытые npm'ом
   (bybit ✓villain, fiale ✓villain, trippy ✓villain, okx-kit ✓postinstall-skip)
= 3 релевантные git-цели
```

Параллельно: **Python-сегмент (38 репо) недоступен на этой машине** — `python` оказался заглушкой Microsoft Store (без pip/uv). PyPI-дрифты (atilaahmettaner 4914★, robinhood-серies) остаются за пределами бенча — единственный непокрытый класс, требующий окружения с реальным Python.

## Три git-цели: итоги

### steveyangpi/binance-research-pro — CLEAN (git-drift v1.0.0 → v1.1.0)
Монорепо (bin в `packages/mcp`) — резолвер точки входа доработан на ходу. Контракт запинен на обоих тегах, `rugsnare diff` → exit 0. Единственный чистый git-дрейф охоты.

### SKalinin909/tradingcalc-mcp — репозиторий-пустышка (закрытие сюжета)
Клонировал: **кода в репо нет вообще** (README, server.json, examples, scripts) — та же pointer-схема, что и в npm-пакете. Сервер существует только как `https://tradingcalc.io/api/mcp`. Remote-pin (76 тулов) был и остаётся единственным способом держать этот контракт; git-история для аудита отсутствует by design. Паттерн «open-source проект без open-source кода» — сам по себе наблюдение для реестра.

### ayggdrasil/callput-option-agent — win32-зависание (документировано)
Опционы (spread-трейдинг BTC/ETH/TSLA/SPY на Base). Сервер стартует, но никогда не отвечает по stdio (пустой stderr; прямой клиент — таймаут). Попутно вскрыто: это тонкий клиент к **hosted-бэкенду `mcp.callput.app`** + маркет-данные с S3 — локальный «сервер» без бэкенда всё равно не работает. 33 тега — в основном load-тесты их API. Для Linux-раннера может быть дрифtable — кандидатом записан.

## Финальное состояние мастер-200 (все волны + релевант-проход)

| | |
|---|---|
| Проверено живым rugsnare | **108** (105 npm/git + 3 финальных) |
| Villains (exit 1) | **25** |
| Clean | 53 |
| Кред-локнуты / таймауты / win32 | ~25 |
| Untested в списке | 92 — из них релевантных задаче: **0 npm**, ~10 Python-серверов (нужен python-бенч), остальное клиенты/агенты/лендинги |

## Полный список 25 villains
@ponsmcp/sdk · bybit-official-trading-server · presign-guard-wallet-mcp · agentic-wallet-mcp · mcp-server-robinhood-chain · tradingview-mcp-server · 47620-solana-mcp · @parabolicfamily/mcp · @jadchene/mcp-ssh-service · @clusteragent/cluster-mcp · lightning-wallet-mcp · @aaarc/handfree-ssh-mcp · @mrfentmen/solana-mcp · binance-mcp-tools · x402-crypto-mcp · @n24q02m/better-notion-mcp · @studio-dao/aether-browser-mcp · @marian-craciunescu/ssh-mcp-server-secured · @hypnosis/ssh-mcp-server · qiksy-mcp · mcp-browser-dev-tools · trippy-mcp · @agentcomms/gmail-mcp · @modelcontextprotocol/server-puppeteer · @sondv5/browser-mcp

Вне drift-метода (3): фишинг-цепочка asman9659 (Application-v3.8.zip), @okx_ai/okx-trade-mcp (postinstall-бинарь в ~/.okx/bin), wikey-wallet-mcp (runtime-загрузка инсталл-скриптов).

## Вывод
Релевантное задаче покрытие — **исчерпано для node-мира**: ни одного driftable npm/JS/TS-сервера из мастер-200 не осталось непроверенным. Единственная系统性 дыра — Python-сегмент (нужен бенч с реальным интерпретатором; готовый список целей: atilaahmettaner/tradingview-mcp-server, verygoodplugins/robinhood-mcp, AnalyticAce/binance-mcp-server, tohsaka888, vincentwongso/mt5, trustxai).

Файлы: [master-200.tsv](mcp-candidates-master-200.tsv) · [сводка](mcp-candidates-master-200.md) · логи git-охоты: `/tmp/mcp-hunt/logs/{steveyangpi,SKalinin909,ayggdrasil}*.log`
