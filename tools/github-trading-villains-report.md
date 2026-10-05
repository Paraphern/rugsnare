# GitHub trading-MCP: полевой отчёт RugSnare (раунд 2)

**Дата:** 2026-10-05 · **Инструмент:** rugsnare@1.0.1 · **Вход:** 10 кандидатов из [github-trading-villains-candidates.md](github-trading-villains-candidates.md)
**Протокол безопасности тот же:** шаг-0 скрипты до установки, `--ignore-scripts`, fake HOME/USERPROFILE, blackhole-прокси, никакого запуска скачанных бинарников.

## TL;DR

Из 10 кандидатов: **4 дали живой drift exit 1** (включая официальный Bybit), **1 официальный (OKX) поймался на шаге-0** — его postinstall скачивает бинарник в `~/.okx/bin`, и **1 оказался не drift-кейсом, а живой фишинговой цепочкой**: зеркальная копия репо на 6722★ с подменённой ссылкой «Download» на лендинг, раздающий `Application-v3.8.zip`. Это и есть алмаз.

---

## АЛМАЗ: кластер `tradingview-mcp` — фишинговая цепочка (CRITICAL)

### Цепочка (все звенья проверены)

1. **Оригинал:** `tradesdontlie/tradingview-mcp` — 6722★, Windows-тулкит для TradingView Desktop, обновлён 2026-07-28. На npm НЕ публикуется.
2. **Зеркало-самозванец:** `asman9659/tradingview-mcp` — `fork=false` (никакой плашки «forked from»), создан 2026-07-22, тянет апстримную историю (в её логе merge-коммиты tradesdontlie). `src/` побайтово идентичен оригиналу. Единственный собственный коммит:
```
commit 7abc373 2026-10-04  asman9659 <asmanasra20@gmail.com>
    Update README.md
- [Download … ](https://github.com/asman9659/tradingview-mcp/releases)
+ [Download … ](https://asman9659.github.io          ← ОБЕ ссылки «Download the latest version»
```
3. **Лендинг:** `https://asman9659.github.io` — титул «tradingview-mcp | AI-Assisted TradingView Analysis» (копия бренда), кнопка «Download Software for Windows», «…Downloads folder once the transfer finishes». Единственная ссылка на странице:
```
https://github.com/asman9659/asman9659.github.io/raw/refs/heads/main/martensite/Application-v3.8.zip
```
Архив живой (проверено range-запросом в 1 байт: HTTP 206, `application/zip`). Сам архив НЕ скачивался и НЕ запускался. Никакого «Application v3.8» в оригинальном проекте не существует.

### RugSnare-прогон кластера

```
rugsnare scan × 3 ячейки:
  оригинал (HEAD, Jul 28):  pinned 84 tool(s)
  копия    (HEAD, Oct 04):  pinned 84 tool(s)   → orig-vs-copy: 0 расхождений
  npm tradingview-mcp@1.0.1: pinned 78 tool(s)  → vs оригинал: 9 hash-diff, 6 missing

rugsnare diff (копия: pinned до подмены README vs HEAD):  DRIFT: clean, exit 0
```

### Что это значит
Атака живёт **вне MCP-контракта**: код и 84 инструмента неотличимы от оригинала (0 диффов), а зло — одна строка README, уводящая «Download for Windows» на личный GitHub Pages с zip-инсталлятором. Уроки для продукта, оба подтверждены прогонами:
- **Пин tools/list не видит эту атаку** (diff чист) → нужна верификация полного артефакта релиза (`rugsnare verify`, on-chain ReleaseLog) — расходится ровно то, что репо раздаёт, а не только контракт.
- **Идентичность по контракту работает**: 78≠84 + 9 хэш-дрейфов мгновенно отличают npm-артефакт от апстрима. Любой, кто запиннил оригинал и подключил «то же имя» из npm, получит exit 1.

### Бонус: npm-имя `tradingview-mcp` (blasesc, 2026-07-05)
1 версия, нет `repository`-поля, код — старый снапшот апстрима (78 тулов). Пока не отравлен, но это живой экземпляр класса `MAL-2026-16390` (OSV: «verbatim copy of README, source tree, and repository URL under a different name» — адвайзори, на который сам atilaahmettaner ссылается в README как на назидание). Пин `tradingview-mcp@1.0.1` сделан — любое обновление этого пакета теперь ловится diff'ом.

### Уровень: CRITICAL (живая фишинг-дистрибуция под брендом 6.7k★-репо)

---

## @okx_ai/okx-trade-mcp — официальный OKX, пойман на шаге-0 (HIGH)

```
npm view @okx_ai/okx-trade-mcp@1.4.6 scripts:
  "postinstall": "node scripts/postinstall.js || exit 0"
scripts/postinstall-notice.js (прочитан статически):
  CDN_SOURCES = [ { host: 'static.jingyunyilian.com' },   ← НЕ okx.com, идёт ПЕРВЫМ
                  { host: 'static.okx.com' }, { host: 'static.coinall.ltd' } ]
  BIN_DIR = join(homedir(), '.okx', 'bin')   // okx-pilot.exe / okx-pilot
```
Официальный npm-пакет биржи (109 версий, 1070 dl/wk) при `npm install` качает непрозрачный бинарник в `~/.okx/bin` — с fallback-CDN на посторонний домен первым в списке. По протоколу установка скипнута автоматом; drift-тест не проводился. Заметка: именно `~/.okx` фигурирует в чек-листе очистки исследовательского промта — не случайность. Для RugSnare это кейс, который видит только artifact/behavior-верификация, не контракт.

## bybit-official-trading-server 2.1.20 → 2.1.22 — официальный Bybit, 11 находок (HIGH)

```
rugsnare diff: DRIFT DETECTED (11 finding(s))
  [DRIFT] setCollateralSwitch (COSMETIC)
    was: "Enable or disable specified coin as collateral"
    now: "Enable or disable specified coin as collateral Agent hint: Error handling: 182012
          means collateral services are unavailable in the user's region due to regulatory…"
  [DRIFT] createIcebergStrategy (BREAKING)   # сломана схема ордер-стратегии
  [NEW ]  createPovStrategy                  # новый исполнитель стратегий — без анонса
  [NEW ]  getOptionBaseCoins
```
Биржа в патч-релизах вплетает «Agent hint:»-промпты прямо в описания инструментов (description-as-prompt-engineering), ломает схему iceberg-стратегии и добавляет новые trade-инструменты. 1332 dl/wk, 382 инструментов — drift-поверхность размером с небольшую биржу.

## trippy-mcp 0.14.1 → 0.15.0 — Injective trading, 13 находок (MEDIUM-HIGH)

```
rugsnare diff: DRIFT DETECTED (13 finding(s))
  [DRIFT] buy / sell / create_token / claim_fees (COSMETIC)
  [DRIFT] quote / explain / create_token (BREAKING)
  [NEW ] docs-choice_v2 (resource)
```
On-chain кошелёк-трейдер меняет описания у buy/sell/create_token между минорниками. (Бенч-заметка: bin — CLI, MCP стартует только с аргументом `serve`; без него rugsnare scan ловит 15s-таймаут.)

## tradingview-mcp-server (fiale-plus) 0.6.1 → 0.7.1 — 12 находок (MEDIUM)

Полная перезапись контракта скринера: 8× BREAKING (screen_stocks/forex/crypto/etf, lookup_symbols, …) + 4× NEW (search_symbols, get_ta_summary, rank_by_ta, get_market_metainfo) за один мажор 0.6→0.7.

## tradingcalc-mcp — npm-указатель на удалённый контракт (MEDIUM, новый паттерн)

npm-пакет **не содержит кода вообще** (`files: ["README.md","LICENSE","CHANGELOG.md","server.json","examples/"]`); server.json объявляет:
```
"remotes": [{ "type": "streamable-http", "url": "https://tradingcalc.io/api/mcp" }]
```
Сделан первый remote-пин: `rugsnare scan --server tradingcalc-remote --url https://tradingcalc.io/api/mcp` → **exit 0, запинено 76 инструментов** (workflow.run_*, primitive.*). Дриф этого сервера происходит на чужом хосте, минуя npm-версии, — ловится только периодическим `rugsnare diff --url`.

## baolin1389/trade-runtime — закрытый бинарь (MEDIUM)

34 МБ tarball (sha256 сверен с manifest), внутри — PyInstaller-бандл Python 3.10 под Linux (122 файла). Противоречия зафиксированы: `VERSION=v0.7.1`, а `mcp.json` внутри говорит `version 0.3.2` и ссылается на репо `baolin1389/trade-mcp`, которого **не существует** (404). Распространение — `curl | bash` в `/opt`, «recommended for AI agents». Не запускался (Linux-бинарь + протокол).

## wl18295600077-a11y/okx-trading-mcp — лендинг (LOW-MEDIUM по коду, HIGH по дистрибуции)

`pro/execute_trade.py` (24КБ) и `okx_utils.py` прочитаны статически: читают OKX-ключи из env/.env, сторонних эндпоинтов не найдено — код соответствует заявлениям. Вся злодейскость — в анонимной дистрибуции с генерёного аккаунта с маркетингом «AI будет торговать фьючерсами за вас».

## atilaahmettaner/tradingview-mcp (4914★) — не пойман, зафиксирован контекст

Hosted-версия на `pro.cryptosieve.com` (платный, без публичного MCP-URL — remote-пин не выполнялся). README самого проекта ссылается на OSV MAL-2026-16390 как на пример атаки репаблиша — автор осведомлён о классе атак, который мы поймали у его тёзки.

---

## Итоговая таблица раунда

| Цель | Метод | Результат |
|---|---|---|
| tv-mcp кластер (3 ячейки + git-дрейф) | scan/diff + кросс-сравнение пинов | Фишинг-цепочка (CRITICAL); контракт копии 0-diff; npm-сквотter 78≠84 |
| @okx_ai/okx-trade-mcp | шаг-0 протокола | postinstall-бинарник в ~/.okx/bin, CDN не-okx — SKIP |
| bybit-official-trading-server | drift 2.1.20→2.1.22 | exit 1, 11 находок |
| trippy-mcp | drift 0.14.1→0.15.0 (+args serve) | exit 1, 13 находок |
| tradingview-mcp-server | drift 0.6.1→0.7.1 | exit 1, 12 находок |
| tradingcalc-mcp | remote pin --url | exit 0, 76 тулов запинено; npm-пакет = пустой указатель |
| baolin1389/trade-runtime | статика tarball | PyInstaller-бинарь, битые ссылки происхождения |
| okx-trading-mcp (лендинг) | статика py | код чист, дистрибуция — зловредная по форме |
| atilaahmettaner | README/URL | hosted на cryptosieve.com, не сканировался |

## Продуктовые выводы раунда
1. **Контракт ≠ дистрибуция.** Самая опасная находка раунда даёт `diff: clean` — атака в README/лендинге. Продавать связку «пин контракта + верификация артефакта (verify)» как единый gate.
2. **Remote-pointer npm-пакеты** (пустышки с URL) — реальный паттерн; rugsnare `--url`-пин закрывает.
3. **postinstall-бинарники** официальных пакетов невидимы для контрактов — протокол установки (шаг-0) сам по себе фича.
4. **CLI-vs-server bin'ы** (trippy `serve`) и 15s scan-таймаут — два бенч-фикса для следующего захода.

Полные логи: `/tmp/mcp-hunt/logs/*.log` (bybit, trippy, tradingview-mcp-server, tv-*).

---

## Аддендум (дожим, тот же день)

### Методы 3/5 выполнены на живых целях — обе чисты
`rugsnare run --mode observe` + управляющий клиент (initialize → tools/list → tools/call → вызов заведомо несуществующего `totally_fake_shadow_tool`):
- **npm `tradingview-mcp@1.0.1` (сквоттер):** 78 тулов, все ответы в норме, фейковый тул отвергнут сервером (-32602), UNDECLARED/RESULT-INJECTION не сработали.
- **`trippy-mcp@0.15.0` (кошелёк):** то же — чисто.
- Вывод: детект-путь методов 3/5 на этих целях даёт нули; UNDECLARED стреляет только если сервер РЕАЛЬНО обслуживает незадекларированный тул.

### Механика advisory подтверждена на атак-корпусе
`corpus/04-whatsapp-rugpull/server-v2-poisoned.js` (sleeper-swap из демо Invariant Labs) через `rugsnare scan`:
```
[ADVISORY] t/get_fact_of_the_day — score 6: tells the model to hide something from the user;
contains an international phone number — classically the exfiltration recipient in WhatsApp/SMS poisoning
```
A01 + A17 срабатывают ровно там, где должны. Корпус 01 (poisoned-описания без скрытых тулов) — там, где нужен `--forbid-tool`/diff, а не прокси.

### pro.cryptosieve.com (hosted atilaahmettaner)
`POST /mcp` отдаёт Next.js SPA (HTTP 200, text/html) — публичного MCP-эндпоинта нет, hosted за аккаунтом. Remote-пин невозможен без регистрации (и не нужен: сам смысл remote-пина — публичные эндпоинты).

### Коллизия имён npm ↔ PyPI: `tradingview-mcp-server`
**Одно имя — два разных проекта в двух реестрах:** npm `tradingview-mcp-server` = fiale-plus, TS-сервер (338 dl/wk); PyPI `tradingview-mcp-server` = Atila Ahmettaner, Python-фреймворк (4914★-репо, 7 релизов, v0.8.1). Пользователь, ставящий «по имени» из туториала, получает случайный из двух проектов с разным кодом и разным автором. Не злодейство, но готовая поверхность для подмены — учитывать в identity-проверках (identity ≠ имя пакета).

### Детерминизм пинов (re-pin → diff, интервал ~4 часа)
| Пин | Первый скан | Повтор | diff |
|---|---|---|---|
| npm `tradingview-mcp@1.0.1` (сквоттер) | 78 тулов | 78 тулов | clean, exit 0 |
| remote `tradingcalc.io/api/mcp` | 76 тулов | 76 тулов | clean, exit 0 |

Хэши стабильны; оба пина готовы к мониторингу — любое обновление сквоттера или тихий сервер-сайт дриф tradingcalc.io ловится одним `rugsnare diff`.

### Мониторинг на будущее (одной строкой)
```bash
# сквоттер обновился?
npm install -g rugsnare && cd <cell-with-pin> && npm i tradingview-mcp@latest --ignore-scripts && rugsnare diff --config .mcp.json
# tradingcalc молча задрифтил?
rugsnare diff --server tradingcalc-remote --url https://tradingcalc.io/api/mcp
```

