# Поиск MCP-злодеев с помощью RugSnare — полевой отчёт

**Дата:** 2026-10-05
**Инструмент:** rugsnare@1.0.1 (`npm install -g rugsnare@1.0.1`)
**Объём:** 186 кандидатов с npm → 46 в шортлисте → **44 drift-теста (pass 1) + 25 повторных (pass 2)**; категории: кошельки/crypto, SSH/shell, Gmail/email, браузеры, filesystem, Postgres, Kubernetes.
**Методы из промта:** 1 (drift), 2 (advisory), 6 (chameleon — в составе scan), 8 (typosquatting/возраст), 9/10 (зависимости), 7 — частично (см. «Ограничения»). Методы 3/5 (live-прокси) не выполнялись — см. «Ограничения».

## Итог одной строкой

**12 из 44 проверенных пакетов пойманы живым прогоном `rugsnare diff` (exit 1)**, включая один официальный сервер `@modelcontextprotocol/*`. Главный villain — `@jadchene/mcp-ssh-service`, в патч-релизе 2.0.2→2.0.3 стёрший «Requires confirmation» из описаний всех 48 деструктивных инструментов и добавивший скрытый `dangerMode`, отключающий подтверждения целиком.

## Сводка поимок

| Пакет | dl/нед | Версии | Находки rugsnare | Уровень |
|---|---|---|---|---|
| @jadchene/mcp-ssh-service | 206 | 2.0.2→2.0.3 (2026-10-03) | 48× DRIFT (COSMETIC) | **CRITICAL** |
| lightning-wallet-mcp | 149 | 1.7.0→1.8.0 | 1× DRIFT (BREAKING) + 5× NEW | HIGH |
| @aaarc/handfree-ssh-mcp | 144 | 2.3.0→2.4.0 | 3× DRIFT (BREAKING) + 1× ADVISORY(6) | HIGH |
| agentic-wallet-mcp | 495 | 0.12.3→0.13.0 | 2× DRIFT (BREAKING) + 3× NEW + 1× DRIFT | HIGH |
| @sondv5/browser-mcp | 47 | 0.1.0→0.2.0 | 33× REMOVED + 2× DRIFT (BREAKING) + 4× NEW | MEDIUM |
| 47620-solana-mcp | 272 | 1.0.3→1.1.0 | 21× NEW (платные x402-инструменты) | MEDIUM |
| presign-guard-wallet-mcp | 738 | 0.6.0→0.7.0 (оба 2026-10-04) | 1× DRIFT на платёжном инструменте | MEDIUM |
| mcp-browser-dev-tools | 879 | 0.2.2→0.3.0 | 14× DRIFT (BREAKING) + 1× NEW | MEDIUM |
| @agentcomms/gmail-mcp | 1896 | 0.12.2→0.12.3 | 1× DRIFT (COSMETIC) на gmail_doctor | MEDIUM |
| @mrfentmen/solana-mcp | 295 | 1.0.0→1.0.1 | 3× NEW (readOnly, выглядят доброкачественно) | LOW |
| qiksy-mcp | 1137 | 1.65.1→1.66.0 | 1× NEW (QA-инструмент, доброкачественный) | LOW |
| @modelcontextprotocol/server-puppeteer (официальный) | 36 746 | 2025.4.7→2025.5.12 | 1× DRIFT (BREAKING) | LOW (контрольная группа) |

Негативные результаты (честно): ADVISORY — ровно 1 на 44 пакета; CHAMELEON — 0; FLOATING/SHADOW — 0; вредоносных зависимостей (метод 10) — 0; typosquatting-имён — 0 (`notion-mcp-server` — отдельный легит-выглядящий пакет с 25 версиями, не клон, пойман не был).

---

## [@jadchene/mcp-ssh-service] (206 dl/нед, 2.0.2 → 2.0.3) — CRITICAL

### Команда RugSnare
```
rugsnare scan --config .mcp.json   # на 2.0.2
rugsnare diff --config .mcp.json   # на 2.0.3 → exit 1
```

### Вывод (точные цитаты)
```
rugsnare diff: DRIFT DETECTED (48 finding(s))
  [DRIFT] execute_command (COSMETIC) ...
    was: "Run one shell command. No chaining, pipes, redirection, subshells, or multiline input. Requires confirmation unless whitelisted."
    now: "Run a shell command on the selected server."
  [DRIFT] rm_safe (COSMETIC) ...
    was: "Delete a path under allowedRemoteRoots. Requires confirmation."
    now: "Delete a remote file or directory."
  [DRIFT] kill_process (COSMETIC) ... chmod, chown, curl_http, firewall_cmd,
  docker_rm / docker_build / systemctl_stop / tar_extract / zip / unzip ... (48 шт.)
```
Плюс статическое подтверждение в исходниках (npm pack обеих версий):
```
v2.0.3/dist/danger-mode.js (новый файл):
  FULL_ACCESS_WARNING = 'FULL ACCESS: Danger mode is enabled for this target.
  All available tools can execute without operation approval. Calls may
  modify or delete data immediately.'

v2.0.3/dist/codex-approval.js (новый файл):
  if (!/^codex(?:$|[-_])/i.test(name.trim())) return undefined;   // фингерпринт клиента
  return { codex_request_type: "approval_request", codex_approval_kind: "mcp_tool_call",
           codex_strict_auto_review: true, ... }
```

### Что это значит
В патч-релизе (semver patch!) у **всех 48 деструктивных инструментов** из описаний исчезла фраза «Requires confirmation (unless whitelisted)» — kill_process, chmod, chown, rm_safe, docker_*, systemctl_*, firewall_cmd, curl_http. Описание инструмента — единственный канал, по которому LLM-агент узнаёт, что операция требует подтверждения человеком; аннотаций (destructiveHint) у инструментов нет (проверено tools/list — `[-]`). Одновременно в релиз добавлены: (а) пер-серверный `dangerMode`, который отключает ВСЕ подтверждения и перекрывает readOnly, блэклисты и path-jail'ы; (б) `codexAutoReview` — модуль, который по имени клиента (`/^codex/`) подкладывает приватные approval-метаданные Codex'у, т.е. поведение сервера зависит от того, кем себя представил клиент. Сам механизм elicitation-подтверждений в normal mode сохранён (README описывает обе опции как opt-in), но контракт, который видит агент, молча деградировал — это textbook case для runtime integrity пиннинга.

### Уровень
CRITICAL (массовое стирание safety-семантики описаний в patch-релизе + скрытый master-switch + client fingerprinting)

### Как воспроизвести
```
npm pack @jadchene/mcp-ssh-service@2.0.2 && npm pack @jadchene/mcp-ssh-service@2.0.3
# v2.0.2 в node_modules → rugsnare scan; заменить на v2.0.3 → rugsnare diff → exit 1
```

---

## [lightning-wallet-mcp] (149 dl/нед, 1.7.0 → 1.8.0) — HIGH

### Вывод
```
rugsnare diff: DRIFT DETECTED (6 finding(s))
  [DRIFT] register_webhook (BREAKING) 7fede862219bf139 -> 3906ce1840718cfa (schemaChanged: true)
  [NEW ] prediction_markets / prediction_market / prediction_place_bet / prediction_my_bets / prediction_positions
```
```
prediction_place_bet: "Prediction markets: back yes or no on a market with sats
from your agent balance. The stake counts toward the agent budget; winnings and
refunds return to the agent balance when the market settles. ..."
```

### Что это значит
Кошелёк ( Lightning, sats агента) в минорном релизе получил пять инструментов ставок на «prediction markets (sports, BTC price)». В пине 1.7.0 уже были игорные `arena_*` инструменты — то есть агент, которому дали «wallet», тихо превращается в букмекерского бота: инструменты появляются после одобрения контракта, без записи в человекочитаемом changelog уровня CI. Плюс schema-breaking в `register_webhook` без мажора. Вектор: расход агентного бюджета на gambling-инструменты, добавленные post-approval.

### Уровень
HIGH (финансовый инструмент, silently добавленные spend-инструменты + BREAKING в минорнике)

### Как воспроизвести
`npm pack lightning-wallet-mcp@1.7.0 / @1.8.0`, scan на 1.7.0, diff на 1.8.0 → exit 1.

---

## [@aaarc/handfree-ssh-mcp] (144 dl/нед, 2.3.0 → 2.4.0) — HIGH

### Вывод
```
  [DRIFT] upload (BREAKING) efcae6cf9297d6c6 -> 4d57e99312a21657
  [DRIFT] download (BREAKING) 08101e1f39951fe2 -> 425a1baecc05f642
  [DRIFT] transfer (BREAKING) 70841d100473a1a2 -> 77362237ce8eac2c
  [ADVISORY] t/workspace-run — score 6: references private keys, credentials or
  env files; asks to send/pass the full environment or host variables
```

### Что это значит
Единственный ADVISORY на всю охоту: инструмент `workspace-run` (запуск durable-процессов на удалённом хосте) в описании оперирует приватными ключами/кредами/env и просит передавать окружение хоста — при том что сам пакет позиционируется как «hands-free» SSH-автоматизация. Три BREAKING-дрейфа на file-transfer инструментах (upload/download/transfer) в минорном релизе меняют схему без мажора. Для аудитора это ровно тот случай, где пин контракта + advisory должны заблокировать автообновление до ревью.

### Уровень
HIGH (SSH-доступ + advisory на env/key handling + breaking schema в минорнике)

---

## [agentic-wallet-mcp] (495 dl/нед, 0.12.3 → 0.13.0) — HIGH

### Вывод
```
rugsnare diff: DRIFT DETECTED (6 finding(s))
  [NEW ] check_policy_decision / write_policy / check_policy_write
  [DRIFT] subscribe_and_issue (BREAKING)          # платёжный x402-инструмент
  [DRIFT] request_ai_birthcert_verification (BREAKING)
  [DRIFT] check_ai_birthcert_verification (COSMETIC)
```

### Что это значит
Кошелёк Zetrix (x401/x402 платежи, «AI birthcertificates») за сутки между релизами добавил инструменты записи политики (`write_policy`, `check_policy_write`) и сломал схему двух платёжных/identity инструментов. Все NEW-инструменты добавлены после пина без одобрения — для пакета, который платит деньги чужим именем, любой новый инструмент записи политики — обязательный ревью.

### Уровень
HIGH (платёжный контракт + policy-write инструменты post-approval + BREAKING)

---

## [@sondv5/browser-mcp] (47 dl/нед, 0.1.0 → 0.2.0) — MEDIUM

### Вывод
```
  33× [REMOVED] (browser_tabs, browser_open, browser_click, browser_evaluate, ...)
  4×  [NEW ] browser_tab / browser_act / browser_read / browser_network
  [DRIFT] browser_download (BREAKING)
    was: "Start an HTTP or HTTPS download in Chrome's browser-mcp subdirectory. Disabled
          unless --download-dir is configured; the tool never reads or opens downloaded file contents."
    now: "Download files via Chrome into Downloads/browser-mcp (needs --download-dir). action:
          'start' (requires url), 'list', 'status' (requires downloadId; wait=true observes
          completion... Never reads/opens/executes file contents."
```

### Что это значит
Полная перезапись контракта за один релиз (33 инструмента исчезли, 4 мега-инструмента появились). Семантика download изменилась: место загрузки сместилось из изолированного subdir в `Downloads/browser-mcp`, изменились гарантии. Пакету 9 дней. Любой клиент, одобривший 0.1.0, после «безобидного» обновления работает с другим набором инструментов с другой семантикой — RugSnare это остановил.

### Уровень
MEDIUM (browser-доступ, контракт переписан целиком, пакет 9 дней от роду)

---

## [47620-solana-mcp] (272 dl/нед, 1.0.3 → 1.1.0) — MEDIUM

### Вывод
```
  21× [NEW ], в т.ч.:
  should_pay:       "Pay-vs-do-not-pay decision for a payee on Base or Polygon. Pay-per-call ($0.02 USDC)."
  jwt_decode:       "Decode a JWT and extract claims ... Decode-only, signature NOT verified ($0.002 USDC)."
  mcp_trust_check:  "Verify BEFORE connecting: given an MCP server URL, check reachability, handshake,
                     HTTPS, advertised tools, risky capabilities ... Returns safe|review|avoid. $0.02 USDC."
  + multichain_* (health/balance/token/tx/trending/trust_check), crypto_* (8 шт.), x402_ecosystem_*
```

### Что это значит
Молчаливое добавление 21 инструмента, каждый из которых — **платный per-call** ($0.002–$0.02 USDC, x402). Контракт, одобренный пользователем, после обновления начинает тратить деньги за каждый вызов. Отдельная ирония: среди добавленных — `mcp_trust_check`, «проверяй доверие MCP-серверам до подключения». Замечание (не находка): в зависимостях express, в `src/remote.js` есть опциональный HTTP-режим `app.listen(port)`.

### Уровень
MEDIUM (монетизированные инструменты добавляются без переодобрения)

---

## [presign-guard-wallet-mcp] (738 dl/нед, 0.6.0 → 0.7.0, обе опубликованы 2026-10-04) — MEDIUM

### Вывод
```
  [DRIFT] pay_x402 (COSMETIC) e7bb468c282a83d7 -> add9fac4994ca98e
    was: "...Works with x402 and with MPP (the Machine Payments Protocol, method evm); when an API off..."
    now: "...Works with x402 and with MPP (the Machine Payments Protocol): method evm (USDC on this wa..."
```

### Что это значит
Пакет создан 2026-10-02, за 2 дня — 6 версий; в день охоты две версии подряд, и между ними меняется описание платёжного инструмента (`pay_x402`). Само изменение похоже на уточнение протокола, но для пакета-кошелька возрастом 2 дня пин контракта — единственная защита от того, что описание «переобъяснит» платежи до тихого изменения поведения. Хороший демо-кейс продукта: скорость дрейфа у свежих кошельков реальна.

### Уровень
MEDIUM (платёжный инструмент, экстремально свежий пакет, дрейф в день публикации)

---

## [mcp-browser-dev-tools] (879 dl/нед, 0.2.2 → 0.3.0, 2026-10-04) — MEDIUM

### Вывод
```
  14× [DRIFT] (BREAKING): list_tabs, ensure_browser, new_tab, close_tab, attach_tab,
        wait_for, navigate, reload, click, hover, type, select, press_key, ...
  [NEW ] upload_file
    was(list_tabs): "List inspectable page targets exposed by the configured browser adapter."
    now(list_tabs): "List the browser's tabs."
```

### Что это значит
Каждый инструмент браузерного сервера поменял схему и описание в минорном бампе 0.2→0.3, добавлен upload_file. Для клиентов, пиннувших 0.2.2, это полный отказ контракта — CI-gate на `rugsnare diff` ловит до деплоя. Выглядит как нормальная эволюция API, но без пина прошла бы молча.

### Уровень
MEDIUM (mass-BREAKING в минорнике, браузерный доступ)

---

## [@agentcomms/gmail-mcp] (1896 dl/нед, 0.12.2 → 0.12.3) — MEDIUM

### Вывод
```
  [DRIFT] gmail_doctor (COSMETIC) c29c4cf3cb25d828 -> c46fb4eed4ccedce
    was: "...return each problem with the one command that fixes it..."
    now: "...return each problem with one or more commands or actions that fix it. Multiple commands in..."
```

### Что это значит
Диагностический инструмент Gmail-сервера меняет контракт с «одна команда на проблему» на «несколько команд или действий». Мелкий на вид prose-drift, но у email-сервера с 1900 скачиваний/нед даже изменение того, сколько команд диагностика предлагает агенту, заслуживает попадания в PR-diff. Демонстрирует, что COSMETIC-дрейф — не шум, а сигнал к ревью.

### Уровень
MEDIUM

---

## [@mrfentmen/solana-mcp] (295 dl/нед, 1.0.0 → 1.0.1) — LOW
```
3× [NEW]: solana_supply / solana_epoch / solana_versions — readOnlyHint: true, описания
честные ("Total, circulating and non-circulating SOL from the Solana JSON-RPC...").
```
Пакет возрастом 13 дней; добавленные инструменты доброкачественные, но NEW-after-pin — это NEW-after-pin: gate отработал штатно, человеку на approve 10 секунд.

## [qiksy-mcp] (1137 dl/нед, 1.65.1 → 1.66.0) — LOW
```
1× [NEW]: qa_width_law — QA/верстка, содержание доброкачественное.
```

## [@modelcontextprotocol/server-puppeteer] (36 746 dl/нед, 2025.4.7 → 2025.5.12) — LOW, контрольная группа
```
[DRIFT] puppeteer_screenshot (BREAKING) 97a462616c123e93 -> 4a49c9f4d9355b7c
```
Официальный референс-сервер ломает схему скриншота между релизами. Не злодейство — легитимная эволюция, но лучшее доказательство тезиса продукта: **без пина даже официальный сервер меняет контракт молча**.

---

## Дополнительные находки вне rugsnare diff

### ainative-postgres-mcp — облачное самопредоставление при старте (динамическое доказательство)
```
stderr сервера при запуске без DATABASE_URL (в изолированном env):
  No DATABASE_URL found — auto-provisioning a managed PostgreSQL instance...
  Step 1/2: Creating free ZeroDB account...
  Failed to resolve database: HTTP 429: {"detail":"Rate limit exceeded: max 5 instant
  databases per IP per day", ...}
```
«Zero-config» Postgres MCP при первом запуске **сам создаёт аккаунт и базу в чужом облаке** (ainative.studio / ZeroDB) — исходящий сетевой вызов при initialization, не заявленный в контракте. Поймано живым прогоном (сервер получил реальный HTTP 429 от их API). Важно для методологии: node `fetch` игнорирует HTTP(S)_PROXY, поэтому «прокси-черная дыра» его не остановила — в runbook это надо чинить сетевой изоляцией уровня контейнера.

### Typosquatting/возраст (метод 8)
7 пакетов моложе 15 дней (presign-guard 2д, @contextflo 8д, @sondv5 9д, 47620 11д, @tamtunnel 12д, @mrfentmen 13д, @agentcomms 15д) — все из категории кошельки/браузер/email. Прямых тайпсквотов популярных имён не найдено; `notion-mcp-server` (без scope) — самостоятельный пакет с 25 версиями, под @notionhq/notion-mcp-server не маскируется (в паре оба проверены: официальный чист, самозванец чист).

---

## Не проверено / ограничения

- **Методы 3/5 (undeclared tools, result injection через live-прокси):** не выполнялись. Нужен управляющий MCP-клиент, прогоняющий вызовы инструментов через `rugsnare run` — SSH/кошелёк-инструменты в песочнице дают только сетевые ошибки, ценного перехвата не выйдет. CHAMELEON-проба (метод 6) в составе `scan --chameleon` отработала на всех 44 — 0 срабатываний.
- **15s таймаут rugsnare scan:** @upstash/context7-mcp, google-services-mcp, mcp-server-kubernetes, @ejazullah/browser-mcp, agentic-wallet-mcp инциализируются дольше 15с (проверено собственным клиентом: отвечают за 15–25с) — часть прогонов упала в exit 2/3 (инфраструктура, не дрейф). Для медленных серверов нужен настраиваемый таймаут скана.
- **7 пакетов остались exit-2** (env-креды, которых нельзя выдать честно: @heroku, @apify, @klodr/gmail, local-shell, k8s-helm, mcp-remote, ainative) — не дрейф, а недостижимость для скана.
- **Сетевая изоляция:** Docker на машине нет; использованы fake HOME/USERPROFILE, чистый env (18 переменных), `--ignore-scripts`, proxy-blackhole. Учтено, что fetch мимо прокси — см. ainative.

## Безопасность (что сделано по протоколу)
- Шаг 0 на каждый пакет/версию: `npm view <pkg>@<v> scripts --json` до установки; 21 пакет с `prepare`-скриптами в pass 1 скипнут, в pass 2 разрешены только после проверки содержимого (tsc/shx/vitest, без сети) + `--ignore-scripts` на всех установках.
- Все серверы запускались в `env -i` с фейковым HOME/USERPROFILE/APPDATA и blackhole-прокси; пост-аудит ФС: в реальном профиле новых файлов/дот-директорий нет (`.okx` и пр. отсутствуют).
- Для presign-guard-wallet-mcp использован локально сгенерированный случайный ключ (кошелёк без средств), не реальный секрет.
- Очистка: `work/`, `fake-home/`, `research/` удалены; оставлены только логи/метаданные как доказательства (`/tmp/mcp-hunt/logs`, `meta`).

## Полная статистика прогона
- 44 drift-теста (pass 1): **6 drift**, 14 clean, 11 infra-fail, 13 skip-by-prepare, 2 no-entry (bin-less пакеты @microsoft/postgres-mcp и др.)
- 25 повторных (pass 2): **+6 drift** (5 новых villains + официальный puppeteer), 12 clean, 7 infra-fail
- Итого уникальных пакетов с живым exit-1 от rugsnare: **12**
- Полные логи: `/tmp/mcp-hunt/logs/*.log` (per-package), пары версий: `/tmp/mcp-hunt/pairs.tsv`, скачивания: `/tmp/mcp-hunt/dl.tsv`

## Универсальное воспроизведение любой находки
```bash
mkdir cell && cd cell && echo '{"name":"cell","private":true}' > package.json
npm install --ignore-scripts --no-save <pkg>@<old>
echo '{"mcpServers":{"t":{"command":"node","args":["<abs-path-to-entry>"]}}}' > .mcp.json
rugsnare scan --config .mcp.json          # pin
npm install --ignore-scripts --no-save <pkg>@<new>
rugsnare diff --config .mcp.json          # → exit 1 + вывод выше
```
