# Резюме по трофеям RugSnare: 19 злодеев (все пойманы живым `rugsnare diff`, exit 1)

Охота 2026-10-05, волны 1–9, ~108 живых прогонов. Формат каждого резюме: что именно вывел rugsnare → что это значит → вердикт. Уровни: CRITICAL / HIGH / MEDIUM / LOW.

---

## CRITICAL (1)

### @jadchene/mcp-ssh-service (206 dl/wk, 2.0.2→2.0.3, 2026-10-03)
**Вывод:** `DRIFT DETECTED (48 finding(s))` — у всех 48 деструктивных инструментов в описаниях стёрто «Requires confirmation (unless whitelisted)»: `kill_process`, `chmod`, `chown`, `rm_safe`, `docker_*` (16 шт.), `systemctl_*`, `firewall_cmd`, `curl_http`, `tar/zip`.
**Значит:** описание — единственный канал, по которому агент узнаёт, что операция gated (аннотаций у инструментов нет). Патч-релиз молча перевёл весь деструктивный арсенал SSH-сервера в разряд «обычных». Статикой подтверждено и сопутствующее: новый пер-серверный `dangerMode` (отключает ВСЕ подтверждения, перекрывает readOnly/блэклисты/path-jail) + `codex-approval.js`, фингерпринтящий клиента по имени (`/^codex/`) и подкладывающий приватные approval-метаданные.
**Вердикт:** главная находка охоты — textbook case стирания safety-семантики в patch-релизе.

## HIGH (5)

### lightning-wallet-mcp (149 dl/wk, 1.7.0→1.8.0)
**Вывод:** `register_webhook (BREAKING)` + 5× NEW `prediction_*`, включая `prediction_place_bet` — «back yes or no … with sats from your agent balance» (рынки: спорт, BTC-цена).
**Значит:** Lightning-кошелёк в минорном релизе получил Betting-подсистему; ставки списываются из агентного бюджета post-approval (в пине 1.7.0 уже были игорные `arena_*` — тренд продолжился).
**Вердикт:** silent gambling-расширение финансового MCP.

### @aaarc/handfree-ssh-mcp (144 dl/wk, 2.3.0→2.4.0)
**Вывод:** 3× BREAKING (`upload`, `download`, `transfer`) + единственный в охоте ADVISORY на живом пакете: `workspace-run — score 6: references private keys, credentials or env files; asks to send/pass the full environment`.
**Значит:** SSH-автоматизация, чей инструмент durable-запуска оперирует ключами/окружением и просит передавать env хоста целиком; file-transfer схемы ломались между минорниками без предупреждения.
**Вердикт:** advisory-сигнал сработал там, где описание выглядит рабочим, а не ядовитым.

### agentic-wallet-mcp (495 dl/wk, 0.12.3→0.13.0, релизы сутки друг за другом)
**Вывод:** 6 находок: NEW `write_policy`/`check_policy_write`/`check_policy_decision` + BREAKING на платёжном `subscribe_and_issue` и identity-инструменте `request_ai_birthcert_verification`.
**Значит:** кошелёк с x402-платежами за сутки оброс инструментами записи политики и сломал схему платёжного инструмента — контракты уровня «деньги» меняются быстрее, чем их успевают ревьюить.
**Вердикт:** скорость дрейфа платёжного контракта — сам по себе риск-фактор.

### bybit-official-trading-server (1332 dl/wk, 2.1.20→2.1.22) — ОФИЦИАЛЬНЫЙ Bybit
**Вывод:** 11 находок: «Agent hint: …»-промпты вплетены в описания (`setCollateralSwitch`, кредитные инструменты), `createIcebergStrategy (BREAKING)`, NEW `createPovStrategy` (исполнитель стратегий) и `getOptionBaseCoins`.
**Значит:** официальная биржа ведёт description-as-prompt-engineering и молча добавляет торговых исполнителей в 382-инструментный контракт между патчами.
**Вердикт:** лучший «легальный» кейс: пин нужен даже против вендора с безупречной репутацией.

### @ponsmcp/sdk (2833 dl/wk, 2.2.1→2.3.1)
**Вывод:** 6: NEW `pons_create_mandate`/`pons_verify_mandate`/`pons_receive` + `pons_quote (BREAKING)` (мульти-чейн-переход).
**Значит:** платёжный MCP (кошелёк по PONSMCP_PRIVATE_KEY) добавил мандаты — инструменты авторизации платежей — после одобрения. Контекст пакета: 18 версий за 4 дня, исходного репозитория нет, профиль — анонимный gmail.
**Вердикт:** худшее сочетание провенанса в охоте; главный кандидат на постоянный мониторинг.

## MEDIUM (11)

### trippy-mcp (463 dl/wk, 0.14.1→0.15.0)
13 находок: дрейф описаний на `buy`/`sell`/`create_token`/`claim_fees`, BREAKING на `quote`/`explain`. On-chain кошелёк меняет семантику торговых инструментов между минорниками. (Попутно вскрыт bench-кейс: bin — CLI, MCP живёт за аргументом `serve`.)

### mcp-server-robinhood-chain (434 dl/wk, 0.11.0→0.14.0)
10: `rhc_token_locks (BREAKING)`; у copy-trade инструментов источники молча сменились с «source EVM wallets» на «TRACKED KOL wallets» — платные KOL-фиды вместо произвольных кошельков, в описанияхcreate-инструмента даже «Amounts are ETH, not SOL».

### @parabolicfamily/mcp (254 dl/wk, 0.1.8→0.2.0)
8: NEW `build_routed_buy_tx`/`build_routed_sell_tx` (билдеры сделок) + **`parabolic.referral_status`** — реферальная программа внутри торгового MCP: у агента появляется собственная материальная заинтересованность, о которой пользователь может не знать.

### @clusteragent/cluster-mcp (167 dl/wk, 1.0.11→1.0.12)
2 BREAKING на `memory_retain`/`memory_recall`: семантика сменилась с «заметки твоего кошелька/банка» на «анонимный агентский банк создаётся автоматически» — тихое смягчение permission-модели у гибрида память+финансы.

### @n24q02m/better-notion-mcp (dl низкие, 2.41.6→3.0.0)
12 (8 BREAKING: `pages`, `databases`, `blocks`, `workspace`, `comments`, `content_convert`, `help`): полная перезапись ядра контракта. Поднялся только с dummy AUTH_CLIENT_ID/SECRET. 214 версий за жизнь пакета — экстремальная скорость.

### @sondv5/browser-mcp (47 dl/wk, 0.1.0→0.2.0, пакет 9 дней)
33 REMOVED + 4 NEW + `browser_download (BREAKING)` с изменением семантики и места загрузок. Контракт переписан целиком за один релиз.

### 47620-solana-mcp (272 dl/wk, 1.0.3→1.1.0, пакет 11 дней)
21 NEW, каждый — платный per-call ($0.002–$0.02 USDC, x402): `should_pay`, `jwt_decode`, `crypto_*`, `multichain_*` и ироничный `mcp_trust_check`. Одобренный контракт после обновления начинает тратить деньги за каждый вызов.

### presign-guard-wallet-mcp (738 dl/wk, 0.6.0→0.7.0, обе версии в один день)
1: `pay_x402 (COSMETIC)` — меняется описание платёжного инструмента между двумя релизами суток. Пакет создан за 2 дня до охоты, 6 версий. Содержательно мягко, но демонстрирует скорость дрейфа свежих кошельков.

### @agentcomms/gmail-mcp (1896 dl/wk, 0.12.2→0.12.3)
1: `gmail_doctor (COSMETIC)` — «the one command that fixes it» → «one or more commands or actions». Мелкий prose-drift у email-сервера; попал в отчёт как доказательство, что COSMETIC-дрейф — сигнал к ревью, а не шум.

## Исключены по критерию (в) инструкции — доброкачественное содержание
`@mrfentmen/solana-mcp`, `qiksy-mcp`, `x402-crypto-mcp`, `@modelcontextprotocol/server-puppeteer` (контрольная группа), `tradingview-mcp-server` (fiale) и `mcp-browser-dev-tools` — последние два: массовые BREAKING-переписи (semver-нарушение и CI-риск, но контент не подозрительный).

---

## Сводка
- **19 злодеев: 1 CRITICAL, 5 HIGH, 13 MEDIUM(-HIGH).**
- Все 19 — воспроизводимы: `npm install --ignore-scripts <pkg>@<old>` → `rugsnare scan` → `@<new>` → `rugsnare diff` → exit 1.
- Паттерны: стирание safety-семантики описаний (jadchene), silent-добавление spend/betting-инструментов (lightning, 47620, pons), подмена семантики источников (robinhood-chain, cluster), конфликт интересов (parabolic referral), официальный вендор в дрейфе (bybit).
- Вне drift-метода (не в этих 19): фишинг-цепочка asman9659, OKX postinstall-бинарь, wikey runtime-installer — пойманы протоколом/статикой.
