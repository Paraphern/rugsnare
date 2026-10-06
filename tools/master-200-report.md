# Мастер-список 200: итог «прочекаем до 200» + «добей всех» (волны 1–9, ФИНАЛ)

**Дата:** 2026-10-05 · волны 1–9 · rugsnare@1.0.1

## ФИНАЛЬНОЕ СОСТОЯНИЕ: 105 проверено · 25 villains (exit 1) · 52 clean

Волна-7 (33 остатка npm) + волна-8 (14 ретраев с env) + волна-9 (3 env-фикса) закрыли все driftable npm-цели списка: **непроверенных npm с ≥2 версиями не осталось** (10 хвостов — без пар версий/неразрешимые).

### Новые villains финальных волн (5)
- **@n24q02m/better-notion-mcp** — машина на 214 версий: 12 находок, из них 8 BREAKING на core-тулах (pages/databases/blocks/workspace/comments) в 2.41.6→3.0.0. Поднялся только с dummy AUTH_CLIENT_ID/SECRET.
- **binance-mcp-tools** — NEW `convert_dust_to_bnb` / `get_dust_assets`: конвертация остатков в BNB добавлена post-approval.
- **@studio-dao/aether-browser-mcp** — BREAKING `navigate_tab` + NEW `close_tab`.
- **@marian-craciunescu/ssh-mcp-server-secured** — NEW `ssh_get_profile_config` («secured»-сервер оброс конфиг-инструментом).
- **@hypnosis/ssh-mcp-server** — BREAKING `ssh_upload`.

### Поведенческая находка вне drift: wikey-wallet-mcp (HIGH)
Кошелёк, который **в рантайме скачивает и запускает инсталл-скрипт**: stderr-диагностика показала «set installationScriptUrl to a download link for it», статика подтвердила `installer.js` с сетевой загрузкой child-бинарников + инфраструктура wikey.io (gateway/signup/store, omnistar.io reverse-proxy на mainnet). Код исполняется по URL уже после «установки» — за пином контракта не видно вообще.

### Ретраи с env (волны 8–9)
- Починились и чисты: @zlash65/postgresql-ssh-mcp (DATABASE_*), @daniyal0100101/binance-mcp (BINANCE_*).
- 22 остаются exit-2: требуют реальные креды (Gmail OAuth, Heroku/Apify токены) или поднимаются дольше 15s таймаута rugsnare (base-multi-wallet, @keyban, robinhood-mcp — проверены собственным клиентом: работают, ~20s init; это ограничение сканера, не злодейство).

## Сводка всех волн

| Волна | Что | Поймано |
|---|---|---|
| 1–2 (раунд 1) | 44+25 npm общих | 12 villains |
| 3–5 (раунд 2–3) | GitHub trading + свежак | фишинг-цепочка asman9659 + OKX postinstall + 6 villains |
| 6 | 19 high-risk npm | 2 villains |
| 7 | 33 остатка npm | 4 villains |
| 8–9 | ретраи с env | 1 villain (better-notion) |

**Итого живых exit-1 прогонов: 25 villains** (+3 кейса вне drift-метода: фишинг-цепочка, OKX postinstall-бинарь, wikey runtime-installer).

Полный список villains — в [mcp-candidates-master-200.md](mcp-candidates-master-200.md), таблица — [tsv](mcp-candidates-master-200.tsv).

---

*История ниже — состояние на конец волны 6.*

## Что сделано

Собран единый мастер-список из всех источников охоты:

```
npm раунд-1 (15 запросов)     186 строк ┐
npm раунд-3 (8 запросов)      117 строк ├─ дедуп → 301 уник. npm
GitHub волна-1 (3 запроса)     51 репо  ┐
GitHub волна-2 (8 запросов)    60 репо  ├─ дедуп → 108 уник. репо
                                        └─ фильтр «это MCP-сервер?» → 354 кандидата
→ ранжирование (villain → проверенные → риск → свежесть → популярность) → ТОП-200
```

Файлы: [mcp-candidates-master-200.tsv](mcp-candidates-master-200.tsv) (полная таблица), [mcp-candidates-master-200-summary.md](mcp-candidates-master-200.md).

## Волна-6 (этим заходом): 19 непроверенных high-risk npm-пакетов

**Новые villains (2):**
- **@clusteragent/cluster-mcp** (167 dl/wk) — BREAKING-дрейф на инструментах памяти: `memory_retain`/`memory_recall` сменили семантику с «заметки для конкретного кошелька/банка» на «анонимный агентский банк создаётся автоматически» — смягчение permission-модели у гибрида память+финансы.
- **x402-crypto-mcp** — NEW `token_profile` (DexScreener-лукап; сам по себе доброкачественный, но post-approval).

**Чистые (11):** robinhood-for-agents, binance-market-mcp, @axon-trading/mcp (45 версий — дисциплинированно), okx-trade-mcp (официальный алиас OKX), @nl4ever/sshmcp, @hkrds1996/paper-trading-mcp, defi-trading-mcp, @kasarlabs/okx-mcp, **@bitget-ai/bitget-agent-mcp** («официальный Bitget» — тоже с postinstall? нет: чисто прогнался, 0 dl/wk при 6 версиях — наблюдение), flotilla-mcp, и др.
**Инфра-фейлы (6):** electricity-trading-mcp (41 версия, Шаньдунская энергобиржа — сервер не поднялся в песочнице), @rackspay/wallet-mcp («trading, betting, MPP payments»), @shell-mcp/core, @fangjunjie/ssh-mcp-server, @n24q02m/better-notion-mcp (214 версий!), @clawnch/clawncher-mcp — кандидаты на ручной заход с env.

## Состояние списка-200

| Метрика | Значение |
|---|---|
| Всего кандидатов в списке | 200 (146 money · 23 exec · 31 прочие) |
| Проверено живым rugsnare | **72** |
| Villains (exit 1) | **20** |
| Чистые | 38 |
| Инфра-фейлы (env/таймаут) | 14 |
| Непроверенных в списке | 128 |

## Полный список 20 villains

@ponsmcp/sdk · bybit-official-trading-server · presign-guard-wallet-mcp · agentic-wallet-mcp · mcp-server-robinhood-chain · tradingview-mcp-server (fiale) · 47620-solana-mcp · @parabolicfamily/mcp · **@jadchene/mcp-ssh-service** (главный раунда 1) · @clusteragent/cluster-mcp · lightning-wallet-mcp · @aaarc/handfree-ssh-mcp (+ADVISORY 6) · @mrfentmen/solana-mcp · x402-crypto-mcp · qiksy-mcp · mcp-browser-dev-tools · trippy-mcp · @agentcomms/gmail-mcp · @modelcontextprotocol/server-puppeteer (официальный, контрольная группа) · @sondv5/browser-mcp

Вне списка (не npm-пакеты, отдельные кейсы): фишинговая цепочка asman9659/tradingview-mcp (зеркало 6722★ → лендинг → Application-v3.8.zip), @okx_ai/okx-trade-mcp (postinstall-бинарник, скип по протоколу), baolin1389/trade-runtime (закрытый бинарь).

## Приоритет следующего захода (из непроверенных в списке)

1. **@zlash65/postgresql-ssh-mcp** — 1064 dl/wk, SSH-туннель + БД.
2. **tradesdontlie/tradingview-mcp (6722★)** и **atilaahmettaner/tradingview-mcp (4914★)** — вершины кластера-свалки имён.
3. **Oft3r/agentic-trading-desk (306★)** — крупнейший непроверенный Python-дескт.
4. Шесть инфра-фейлов волны-6 — с env-файлами (как trippy с `serve`).

Протокол и изоляция — те же; логи волны-6 в `/tmp/mcp-hunt/logs/`.
