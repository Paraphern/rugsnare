# Поиск MCP-злодеев с помощью RugSnare

## ⚠️ SAFETY: ОБЯЗАТЕЛЬНО ПРОЧИТАТЬ ПЕРЕД НАЧАЛОМ

**Ты будешь устанавливать потенциально ВРЕДОНОСНЫЕ пакеты.** Это research, но риски реальные:

- `npm install` выполняет postinstall-скрипт НЕМЕДЛЕННО — до любой проверки
- Postinstall может: читать `~/.ssh/`, отправлять env vars на сервер, скачивать исполняемые файлы
- Запуск MCP-сервера исполняет его initialization code

**ОБЯЗАТЕЛЬНЫЕ меры защиты:**

```bash
# ВАРИАНТ A: Docker (НАИЛУЧШИЙ)
docker run -it --rm --network none -v /tmp/research:/research node:22 bash
# --network none = НЕТ сетевого доступа для потенциального malware
# Но npm install требует сеть... поэтому:

# ВАРИАНТ B: Docker с ограниченной сетью
docker run -it --rm -v /tmp/research:/research node:22 bash
# Внутри контейнера: env vars пустые, нет ~/.ssh/, нет реальных кредов

# ВАРИАНТ C: Изолированная директория + чистый env
export HOME=/tmp/fake-home
export PATH=/usr/local/bin:/usr/bin:/bin  # минимальный PATH
mkdir -p /tmp/fake-home
cd /tmp/fake-home
# СЛЕДУЕТ: перед каждым npm install проверяй скрипты:
npm view <package> scripts --json
# Если есть postinstall/preinstall — ВНАЧАЛЕ прочитай их код:
npm pack <package> && tar -xzf <package>-*.tgz && cat package/scripts/*.js
# И ТОЛЬКО ПОТОМ решай: устанавливать или нет
```

**ЗАПРЕЩЕНО:**
- Устанавливать пакеты на основной машине с реальными env vars
- Запускать MCP-серверы с доступом к ~/.ssh, ~/.aws, ~/.config
- Использовать реальные API keys при тестировании
- Позволять postinstall выполняться без предварительной проверки
- Запускать MCP-сервер БЕЗ сетевой изоляции (см. ниже)

**СЕТЕВАЯ ИЗОЛЯЦИЯ ПРИ ЗАПУСКЕ СЕРВЕРА (критично!):**

RugSnare scan/diff запускает MCP-сервер как дочерний процесс. Даже если postinstall был чистым, initialization code сервера может отправлять данные:

```bash
# Используй firewall/iptables для блокировки исходящих от процесса:
# macOS: utiliser Little Snitch или lfwall
# Linux: docker с --network none для rugsnare
docker run -it --rm --network none -v /tmp/research:/research node:22 bash
# Внутри: rugsnare scan/diff работают, network недоступен для сервера

# Альтернатива: proxy для перехвата ВСЕГО трафика сервера
# Запусти rugsnare через HTTP proxy и логируй все запросы:
export HTTP_PROXY=http://127.0.0.1:8888
export HTTPS_PROXY=http://127.0.0.1:8888
# Proxy (mitmproxy, Charles) покажет КУДА сервер пытается ходить
```

**МОНИТОРИНГ ФАЙЛОВОЙ СИСТЕМЫ (дополнительно):**
```bash
# Linux: inotifywait для отслеживания чтения/записи
inotifywait -m -r /tmp/fake-home/ 2>&1 | tee /tmp/fs-audit.log &
# macOS: fs_usage
# Запусти ПЕРЕД rugsnare scan, чтобы видеть все обращения к файлам
```

**ОЧИСТКА ПОСЛЕ ТЕСТИРОВАНИЯ (обязательно!):**
```bash
rm -rf /tmp/fake-home /tmp/research /tmp/hunt /tmp/safe-check
# Если использовал Docker: docker system prune --force
# Проверь: ls ~/.okx ~/.something-new 2>/dev/null (не появились ли новые директории)
# Проверь: crontab -l (не добавились ли cron jobs)
# Проверь: cat ~/.bashrc ~/.zshrc | tail -20 (не модифицированы ли shell config)
```

**БЕЗОПАСНЫЙ паттерн для КАЖДОГО пакета:**
```bash
# 1. Скачай, но НЕ устанавливай
npm pack <package> --pack-destination /tmp/research/

# 2. Распакуй и ПРОЧИТИ postinstall (если есть)
cd /tmp/research && tar -xzf <package>-*.tgz
cat package/scripts/postinstall.js 2>/dev/null || echo "no postinstall"

# 3. Если postinstall скачивает исполняемые файлы → НЕ УСТАНАВЛИВАЙ,
#    а только анализируй код статически

# 4. Если postinstall чистый (или отсутствует) → можно устанавливать
#    в изолированном окружении

# 5. Для rugsnare scan/diff: используй пустой env, фейковый HOME
env -i HOME=/tmp/fake-home PATH=/usr/local/bin:/usr/bin:/bin node $(which rugsnare) scan --config .mcp.json
```

## Контекст

Ты — security researcher с инструментом RugSnare (`npx rugsnare@1.0.1`). Твоя задача: найти КОНКРЕТНЫЕ MCP-серверы, где RugSnare РЕАЛЬНО ловит зло — drift, poisoning, скрытые инструменты. Не ручной аудит кода, а живой прогон инструмента с воспроизводимым выводом.

## Как работает RugSnare (кратко)

```bash
# Установить RugSnare
npm install -g rugsnare@1.0.1

# Запиннить контракты MCP-сервера (baseline)
rugsnare scan --config <config.json>

# Проверить на дрейф (exit 1 = поймали изменение)
rugsnare diff --config <config.json>

# Просканировать вывод MCP-сервера на секреты
rugsnare audit --input <output.txt>

# Проверить tool descriptions на advisory signals
# (происходит автоматически при scan)
```

## Стратегия поиска (по методу)

### Метод 1: Дрейф между версиями (САМЫЙ СИЛЬНЫЙ)

Найди npm-пакет MCP-сервера с 2+ версиями. Установи обе. Запиннь старую, проверь новую:

```bash
mkdir /tmp/mcp-hunt && cd /tmp/mcp-hunt
npm init -y

# Установи СТАРУЮ версию
npm install <package>@<old-version> --no-save
# Создай конфиг
echo '{"mcpServers":{"target":{"command":"node","args":["./node_modules/<package>/index.js"]}}}' > .mcp.json
# Запиннь
rugsnare scan --config .mcp.json

# Теперь установи НОВУЮ версию
npm install <package>@<new-version> --no-save
# Проверь на дрейф — ЕСЛИ exit 1, МЫ ПОЙМАЛИ
rugsnare diff --config .mcp.json
echo "exit: $?"
```

**Что ищем:**
- `[DRIFT]` — описание инструмента изменилось после «одобрения»
- `[DRIFT] (BREAKING)` — schema изменилась (новый required параметр)
- `[DRIFT] (ANNOTATION)` — behavioral hints сменились (readOnly → destructive)
- `[NEW]` — новый инструмент появился без одобрения
- `[REMOVED]` — инструмент исчез
- `[ADVISORY]` — описание содержит suspicious паттерны

### Метод 2: Advisory signals при первом скане

Некоторые MCP-серверы имеют ЯДОВИТЫЕ tool descriptions прямо сейчас:

```bash
rugsnare scan --config .mcp.json 2>&1 | grep ADVISORY
```

**Что ловим (18 сигналов A01-A18):**
- A01: "do not tell the user" в описании
- A02: упоминание ~/.ssh/id_rsa, .env, credentials
- A09: "always call this instead of" (shadow injection)
- A15: "ignore previous instructions" (prompt hijack)
- A17: международный телефонный номер (exfiltration канал)
- A18: ANSI escape sequences (скрытый текст)

### Метод 3: Undeclared tools через прокси

MCP-сервер может СКРЫВАТЬ инструменты от tools/list:

```bash
# Запусти прокси в observe mode
rugsnare run --name target --mode observe -- node ./node_modules/<package>/index.js
# Подключись клиентом, вызови инструменты
# Прокси покажет UNDECLARED для скрытых инструментов
```

### Метод 4: Audit вывода MCP-сервера

```bash
# Запусти сервер, собери вывод, просканируй
rugsnare audit --input server-output.txt
```

Ловит: API keys, private keys, seed phrases, DB URLs с кредами, PII.

### Метод 5: Result inspection — prompt injection в RESPONSES

Tool descriptions — не единственный вектор. RESPONSES тоже могут нести injection:

```bash
# Запусти прокси, вызови каждый инструмент, проверь stderr на:
# RESULT-INJECTION-SUSPECTED
rugsnare run --name t --mode observe -- node ./node_modules/<pkg>/index.js
# Когда сервер ответит на tools/call, прокси сканирует response:
# R01: "ignore previous instructions" в ответе
# R02: императивные команды ("you must now do...")
# R04: "send data to https://..." в ответе
# R05: "do not tell the user" в ответе
# R08: невидимые Unicode символы
```

### Метод 6: Chameleon — разный контракт для разных клиентов

Сервер может показывать чистый контракт аудитору и ядовитый — реальному клиенту:

```bash
# RugSnare перепрашивает tools/list под разными client names
rugsnare scan --chameleon --config .mcp.json
# Если [CHAMELEON] — сервер показывает разное разным клиентам
```

### Метод 7: Сетевой анализ — куда РЕАЛЬНО ходит сервер

Статический анализ кода может пропустить obfuscated URLs. Динамический — нет:

```bash
# mitmproxy или tcpdump для захвата ВСЕГО трафика сервера
# Вариант A: mitmproxy (показывает все HTTP/HTTPS запросы)
mitmproxy --mode reverse:localhost:0 --set block_global=false &
export HTTPS_PROXY=http://127.0.0.1:8080
rugsnare scan --config .mcp.json
# Смотри: куда сервер ходит при initialization

# Вариант B: strace (Linux) — все системные вызовы
strace -f -e trace=network -o /tmp/network.log rugsnare scan --config .mcp.json
grep connect /tmp/network.log
# Показывает ВСЕ connect() вызовы, включая скрытые

# Вариант C: tcpdump
tcpdump -i any -w /tmp/traffic.pcap &
rugsnare scan --config .mcp.json
killall tcpdump
tcpdump -r /tmp/traffic.pcap -A | grep -v "localhost\|127\.0\.0\.1"
```

### Метод 8: Свежие пакеты (typosquatting)

Новые пакеты (< 30 дней) с именами, похожими на популярные:

```bash
# Сравни имена: "notion-mcp" vs "notion-mcp-server" vs "notionmcp"
# Проверь: npm view <package> time.created
# Если создан < 30 дней назад + имя похоже на популярное = КРАСНЫЙ ФЛАГ
npm search "mcp" --json | node -e "
  const pkgs = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  pkgs.filter(p => {
    const age = Date.now() - new Date(p.date).getTime();
    return age < 30 * 24 * 3600 * 1000; // создан < 30 дней
  }).forEach(p => console.log('NEW:', p.name, p.date));
"
```

### Метод 9: Кросс-референс с security databases

```bash
# Socket.dev — проверка на malicious dependencies
curl -s "https://api.socket.dev/v0/scan?package=<name>" | head -20

# Snyk — известные уязвимости
curl -s "https://snyk.io/api/v1/test/npm/<package>" | head -20

# npm audit — зависимости
cd /tmp/hunt && npm audit --json 2>/dev/null | head -30
```

### Метод 10: Dependency chain — ядовитые зависимости

MCP-пакет может быть чистым, но иметь вредоносную зависимость:

```bash
# Проверь все зависимости пакета
npm view <package> dependencies --json
# Для каждой зависимости:
#   npm view <dep> maintainers  ← кто мейнтейнер?
#   npm view <dep> scripts      ← есть ли postinstall?
#   npm audit                   ← известные уязвимости?

# Проверь: нет ли недавно скомпрометированных пакетов в цепочке
# (chalk, node-ipc, ua-parser-js — все были скомпрометированы)
```

## Где искать кандидатов

### Топ-200 MCP-пакетов с npm (по популярности):
```bash
npm search "mcp server" --json | node -e "
  const pkgs = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  pkgs.filter(p => p.name && /mcp/i.test(p.name))
      .forEach(p => console.log(p.name, p.version, p.date));
" | head -200
```

### Полный список с punkpeye/awesome-mcp-servers (95k★):
```bash
curl -s https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md | grep -oE '\[[^]]+\]\(https://github.com/[^)]+\)' | head -500
```

### Категории максимального риска (проверь ВСЕ):
1. **Browser automation** — доступ к cookies, sessions, passwords
2. **File system** — чтение произвольных файлов
3. **Email/messaging** — перехват переписки
4. **Database** — доступ к данным
5. **Crypto/wallet** — доступ к средствам
6. **Cloud/DevOps** — доступ к инфраструктуре
7. **Code execution** — запуск команд

## Процесс проверки каждого кандидата

```bash
# ⚠️ ШАГ 0: ПРОВЕРЬ БЕЗОПАСНОСТЬ ПЕРЕД УСТАНОВКОЙ
npm view <package> scripts --json
# Если есть postinstall/preinstall → прочитай КОД сначала:
npm pack <package> --pack-destination /tmp/safe-check/
cd /tmp/safe-check && tar -xzf <package>-*.tgz
cat package/scripts/postinstall.js 2>/dev/null || echo "no postinstall"
# Если postinstall скачивает бинарники/ходит на сторонние URL → СКИПНИ установку,
# только статический анализ

# 1. Проверь: есть ли 2+ версии на npm?
npm view <package> versions --json

# 2. Скачай обе последние версии (БЕЗ установки — npm pack)
mkdir -p /tmp/hunt && cd /tmp/hunt
npm pack <package>@<v1> --pack-destination .
npm pack <package>@<v2> --pack-destination .

# 3. Установи старую, запиннь (в изолированном env!)
mkdir v1 && cd v1 && tar -xzf ../<package>-<v1>.tgz
export HOME=/tmp/fake-home  # изоляция
echo '{"mcpServers":{"t":{"command":"node","args":["./package/index.js"]}}}' > .mcp.json
rugsnare scan --config .mcp.json

# 4. Обнови до новой, проверь на дрейф
mkdir ../v2 && cd ../v2 && tar -xzf ../<package>-<v2>.tgz
cp ../v1/.mcp.json .
# Измени путь к новой версии в .mcp.json
rugsnare diff --config .mcp.json

# 5. Если exit 1 → ЗАФИКСИРУЙ ВЫВОД — это доказательство

# 6. Дополнительно: проверь advisory
rugsnare scan --config .mcp.json 2>&1 | grep -i "ADVISORY\|FLOATING\|SHADOW"

# 7. Дополнительно: статический анализ кода (безопаснее чем запуск)
grep -rn "https\?://" package/ --include="*.js" | grep -v "localhost\|github\|npmjs"
grep -rn "process\.env\." package/ --include="*.js" | sort -u
```

## Формат результата для каждой находки

```
## [ИМЯ ПАКЕТА] (N скачиваний/нед, vN → vN+1)

### Команда RugSnare
rugsnare diff --config .mcp.json

### Вывод (ТОЧНАЯ ЦИТАТА)
[DRIFT] tool_name (BREAKING) old_hash -> new_hash
  was: "Original description..."
  now: "Changed description with suspicious content..."

### Что это значит
(одним абзацем: какой вектор атаки, чем опасно)

### Уровень
CRITICAL / HIGH / MEDIUM

### Как воспроизвести
npm pack <package>@<v1>
npm pack <package>@<v2>
rugsnare scan --config .mcp.json  # на v1
rugsnare diff --config .mcp.json  # на v2 → exit 1
```

## Критерии для включения в отчёт

1. RugSnare ВЫВЕЛ конкретный [DRIFT]/[ADVISORY]/[UNDECLARED] — не ручная находка
2. Вывод воспроизводим: любой может повторить команды и получить тот же результат
3. Изменение содержит suspicious контент (не просто "typo fix")
4. Пакет живой: обновлён после июня 2026 ИЛИ >50 скачиваний/нед

## Если RugSnare ничего не поймал

Если после проверки 30+ пакетов RugSnare не поймал ни одного злодея — ТАК И СКАЖИ. Это тоже важный результат (для product development). Не выдумывай находки.

## Подсказка: где ДРЕЙФ наиболее вероятен

Проверь пакеты, которые:
- Недавно обновились (последние 2-4 недели) — свежие изменения
- Имеют 5+ версий — длинная история, больше шансов на тихие изменения
- Связаны с data access (file, browser, email) — больше incentive для злоупотребления
- Имеют мало звёзд, но много скачиваний — нет community oversight
