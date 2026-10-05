# Охота раунд 3: продолжение поиска (GitHub + npm свежак)

**Дата:** 2026-10-05 (продолжение) · **Инструмент:** rugsnare@1.0.1 · тот же протокол изоляции.

## TL;DR

Новая волна: 60 репо с GitHub (sniper/pump/MEV/copy/binance/robinhood/telegram) + свип 117 свежих npm-пакетов. **3 из 4 новых drift-целей пойманы с exit 1** — все три из архетипа «агентские деньги»: платёжный ponsmcp (мандаты платежей без исходников), мемкоин-лаунчпад parabolic (реферальный инструмент + билдеры транзакций), KOL-copy-trading на «Robinhood Chain». Отдельно закрыты: drasticstatic-копии (честные), свалка имён `tradingview-mcp` (3 репо + 4-й владелец npm).

## Новые поимки (runner-5, все exit 1)

### @ponsmcp/sdk 2.2.1 → 2.3.1 — 6 находок (HIGH)
```
rugsnare diff: DRIFT DETECTED (6 finding(s))
  [NEW ] pons_create_mandate / pons_verify_mandate / pons_receive / pons_chains
  [DRIFT] pons_quote (BREAKING)  # мульти-чейн: USDG-only → settlement-token (Base 8453 beta)
```
**Почему это важно:** платёжный MCP (агент платит из кошелька по `PONSMCP_PRIVATE_KEY`, лимиты в env) добавил инструменты **платёжных мандатов** post-approval, заодно сломав quote-схему. Профиль пакета: создан 2026-10-01, **18 версий за 4 дня**, 2833 dl/wk, maintainer `dosihoki133@gmail.com`, **исходного репозитория на npm нет**. Статика tarball: RPC через `lb.routeme.sh/rpc/evm/4663`, Alchemy, dexscreener, r.jina.ai; эксфильтрационных эндпоинтов не найдено. Сочетание «деньги + нулевая провенансность + стрельба версиями» — эталонный кандидат под постоянный пин.

### @parabolicfamily/mcp 0.1.8 → 0.2.0 — 8 находок (MEDIUM-HIGH)
```
  [NEW ] parabolic.referral_status          ← реферальная программа ВНУТРИ торгового MCP
  [NEW ] parabolic.build_routed_buy_tx / build_routed_sell_tx / quote_routed_* / list_venue_coins
```
Мемкоин-лаунчпад (bonding curves) добавил билдеры транзакций покупки/продажи и **реферальный статус** — у агента появляется собственная материальная заинтересованность в торгах, о которой пользователь может не знать. Классика конфликта интересов, встроенного в tools.

### mcp-server-robinhood-chain 0.11.0 → 0.14.0 — 10 находок (MEDIUM)
```
  [DRIFT] rhc_token_locks (BREAKING)
  [DRIFT] rhc_copytrade_create/update/list (COSMETIC):
    was: "...mirrors 1+ source EVM wallets..."
    now: "...mirrors 1+ TRACKED KOL wallets (the set behind /rhc/kol/wallets)..."
```
KOL-copy-trading сервер на брендово-прилегающем «Robinhood Chain» ( MadeOnSol; RPC routeme.sh, «Amounts are ETH, not SOL» в описании create). Между минорниками меняется семантика источников copy-trading — платные KOL-фиды вместо произвольных кошельков.

### bushido-tradingview-mcp 0.1.25 → 0.1.27 — clean (0)
Самостоятельный TS-проект (не клон tradesdontlie), 27 версий за 6 недель, 2131 dl/wk. Дрейфа между тремя последними патчами нет — быстрый цикл, но дисциплинированный. Оставлен в мониторинге.

## Закрытые сюжетные линии

### drasticstatic «Fortuna working copies» — честные (не злодей)
`drasticstatic/tradingview-mcp-jackson` и `drasticstatic/robinhood-mcp` — working-копии с **полным раскрытием**: «independent repo created from a local clone of <upstream>, upstream tracked as remote, changes reviewed before applying». Ссылки не подменены. Анти-паттерн к asman9659: та же механика зеркала, противоположная честность. Заодно вскрылась экосистема клонов tradesdontlie: LewisWJackson (YouTube-трафик) → drasticstatic / Chefy3x / Weebapp003 / pueschel88.

### Свалка имён `tradingview-mcp` — финальная карта
- npm `tradingview-mcp` → **blasesc** (blasesc@hotmail.com), 1 версия, без repository-поля. Провенанс проверен: НЕ совпадает ни с Weebapp003 (ns-webapp004@cebutele-net.com), ни с pueschel88 (info@kruessel.net), ни с tradesdontlie. Четыре стороны претендуют на одно имя, реестр занял четвёртый, никак не связанный с авторами.
- `tradingview-mcp-server`: **три проекта на одном имени** — npm (fiale-plus TS), PyPI (Atila Ahmettaner, 4914★-репо), GitHub (jaipreet15, 152★ — публиковаться не может, имя занято).
- Вывод для identity-проверок: имя пакета не идентифицирует проект ни внутри одного реестра, ни между реестрами.

### Свежий npm-свип (117 пакетов): отсев
- `@binance/wallet`, `@binance/copy-trading` — настоящий официальный скоуп (binance-bot@binance.com, репо binance/binance-connector-js, с 2025) — но это коннекторные библиотеки, не MCP (нет tools/list) — вне мандата rugsnare.
- `robinhood-chain-sdk` «Official TypeScript SDK for the Robinhood Chain» + cloud `@priors/x402` — инфраструктура вокруг(chain 4663), часть экосистемы, поймана косвенно через ponsmcp/madeonsol.
- Python-сегмент (Robinhood-рой: verygoodplugins 39★, wenhel, jsconiers и ~30 клиентов) — не покрыт: бенч node-only (ограничение зафиксировано).

## Счёт по всем раундам

| Раунд | Прогонов | Поймано exit 1 | Главный villain |
|---|---|---|---|
| 1 (npm общий) | 44 + 25 | 12 | @jadchene/mcp-ssh-service (48 стёртых «Requires confirmation») |
| 2 (GitHub trading) | 10 целей | 3 drift + фишинг-цепочка + OKX postinstall | asman9659: зеркало 6722★ → лендинг → Application-v3.8.zip |
| 3 (продолжение) | 4 drift + свипы | 3 | @ponsmcp/sdk: мандаты платежей без исходников |
| **Итого** | **~90 проверок** | **18 villain-кейсов** | |

## Мониторинг (актуальные пины)
```
rugsnare diff --config <cell>                      # @ponsmcp/sdk (18v/4d — ждать 2.3.2)
rugsnare diff --config <cell>                      # mcp-server-robinhood-chain, @parabolicfamily/mcp, bushido
rugsnare diff --server tradingcalc-remote --url https://tradingcalc.io/api/mcp
# npm tradingview-mcp@1.0.1 (сквоттер) — любое обновление = находка
```

Логи раунда: `/tmp/mcp-hunt/logs/{_ponsmcp_sdk,_parabolicfamily_mcp,mcp-server-robinhood-chain,bushido-tradingview-mcp}.log`
