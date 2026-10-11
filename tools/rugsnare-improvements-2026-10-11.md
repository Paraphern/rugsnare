# rugsnare: наблюдения и рекомендации из полевых прогонов (2026-10-10/11)

Источник: сканы playwright, netlify, mongodb, sentry, azure, supabase, figma, expo, launchdarkly, context7 + верификационные прогоны. Статус: передано продукт-чату 2026-10-11.

## Уже в работе у продукт-чата

1. launch-args для history (`--server-args`) - реализовано, ждёт UX-подсказку при exit 2. Команды для доков переданы (Azure `server start`, mongo `--readOnly` + conn string, supabase токен + caveat "стартует только 0.13.0").
2. Градировка параметрических description-правок (playwright 7 x NOTATION) - фикс в main, ждёт публикации.
3. Тире - закрыто (575 замен).

## Новые рекомендации (по убыванию ценности)

### R1. Версия пакета внутри pins.json + сверка при diff (защита от человеческой ошибки)

Мой прокол с context7: после `npm i 4.3.0` я не пересканировал и сравнивал старый pins-файл. Неделя диагностики "ложного" дрейфта, который оказался настоящим.

Предложение: при scan записывать в pins.json разрешённую версию пакета (из node_modules/<pkg>/package.json, когда entry ссылается в node_modules) и его integrity-хэш. При diff печатать строку вида "pins taken against @upstash/context7-mcp@4.0.4 (integrity sha256:...); current install: 4.3.0" и предупреждать, если pins совпадают с текущей установкой по версии - вероятнее всего забыли re-scan после апгрейда (diff "сам с собой" почти всегда ошибка оператора).

### R2. Нативный router-union diff (ветки операций вместо сырого BREAKING)

Кейс Netlify: 9 инструментов - роутеры, inputSchema содержит selectSchema = anyOf-union с const-дискриминаторами операций (operation.const = "get-teams" и т.д.), описание перечисляет операции. Самые важные изменения экосистемы сейчас выглядят именно так: ветка добавлена (get-team-env-vars = новый канал), ветка переехала между инструментами (initialize-database из updater в reader).

Предложение: детектор const-дискриминированных union'ов + класс OPERATIONS-CHANGED: "branch added: get-team-env-vars", "branch moved: initialize-database (updater -> reader)". Это говорит на языке вендора и превращает наш флагманский кейс в одну строку вывода инструмента.

### R3. Градировка constraint-ключей (проверить покрытие)

MongoDB 3.0.0 дал реальные сужения: minItems:1 на pipeline, number->integer + minimum/maximum на limit/numCandidates, pattern на deploymentName. Убедиться, что schemaNotationDiff градирует добавление minItems/minimum/maximum/minLength/maxLength/pattern и number->integer как tighten/BREAKING, а не NOTATION. Если покрывается - добавить в corpus как фикстуры (не нашлось живых тестов).

### R4. anyOf <-> oneOf с теми же ветками = NOTATION

MongoDB-волна: items.anyOf -> items.oneOf при идентичных ветках (2 инструмента). Сейчас я это абстрагировал вручную. Если grader сейчас считает смену ключа структурной - поправить; фикстура в corpus.

### R5. required-изменения ВНУТРИ веток union

Netlify 1.15.1: required:["operation","params"] -> ["operation"] внутри каждой ветки (не на верхнем уровне схемы). Если schemaDiff смотрит только top-level required - он скажет "schema changed", пропустив семантику "params стал опциональным" (LOOSENED). Проверить вложенные required в любом уровне схемы.

### R6. Chameleon: расширить ротацию user-agent'ов

Netlify (PR #60) официально отдаёт разный контракт по UA: openai-mcp -> 21 гранулярный инструмент, остальные -> 9 роутеров. Это документированный паттерн после гайдлайнов OpenAI - значит будет множиться.

Предложение: в --chameleon добавить openai-mcp (и опционально copilot, vscode-copilot), либо флаг --chameleon-ua со списком. Пин, снятый одним клиентом, не покрывает поверхность другого - это ровно наш месседж.

### R7. Версия rugsnare в футере вывода diff/history/scan

Час разбирательств "у кого фикс, у кого нет" (playwright BREAKING vs NOTATION). Одна строка в футере решает.

### R8. history: таймаут и прогресс на фазе УСТАНОВКИ

mongodb history висел 2+ часа (убил) - вероятно, версия с тяжёлым install. Предложения: таймаут на npm install (не только на старт сервера), построчный flush прогресса с номером версии (мой tail-пайп съел видимость), флаги --skip-versions/--only-versions.

### R9. Экспорт "diff сам с собой" как CI-guard

Частный случай R1: в weekly/add-user-ci если pins-версия == установленной, diff должен не молчать (0 находок), а печатать предупреждение "baseline == current; если вы только что обновили пакет - выполните re-scan" (exit 0, но с warning-строкой). Дешёвая страховка от главного класса операторских ошибок.

### Наблюдения без действий

- Все просканированные серверы детерминированы при повторных листингах (context7 3x подряд один хэш) - динамических контрактов пока не встретили, но API-backed серверы (context7) кандидаты на динамические описания; если встретится - кандидат на advisory-сигнал.
- У Netlify в репо существуют только 3 релиза (1.16.0+); всё до этого шло в npm без GitHub-релизов. Не баг инструмента, но уточнение для weekly-репортов: отсутствие релиза != отсутствие изменений.
- mcp-pin.gautamkhosla.com (Gautam) и AAtomless ведут аналогичные публичные трекеры - рынок прогревается, скорость публикаций важнее идеальности.

## Дополнение из предыдущих и отвергнутых кейсов (2026-10-11, всё сверено с кодом)

### R10. history: сортировка версий по дате публикации, не по semver (кейс: playwright, отвергнутый)

history.js:64 сортирует `compareVersions`, при этом npm `time` уже загружен (строка 56) и не используется. У @playwright/mcp две эпохи нумерации: линия 1.52.0-alpha (март 2025) СТАРШЕ по semver, чем 0.0.x (2026), поэтому semver-сорт склеил хвост 0.0.83 с головой 1.52.0-alpha и родил фантомную пару "0.0.83 -> 1.52.0-alpha-2025-03-21" на 29 находок (я исключал вручную). Фикс: сортировать по publish time (данные уже есть) или сегментировать историю там, где номер версии идёт назад по времени.

### R11. Rename-инференс для пар GONE+NEW (кейс: azure-devops, флагман)

110 находок выглядят как 75 GONE + 29 NEW; по факту большинство GONE - переименования. Пары с идентичными (schemaHash, proseHash) или близкими именами (Levenshtein / общий префикс+суффикс-паттерн) схлопывать в "likely renamed a -> b". Флагманский аудит из 110 строк становится читаемым: "renamed: N, really-gone: M, new: K". Это первое, что спросил бы мейнтейнер Microsoft.

### R12. Детектор килл-свитча в history (кейс: bybit, наш issue #38)

bybit-сервер в версиях старше latest подтягивает манифест с api.bybit.com и отказывается стартовать. Сейчас history пишет generic "unreachable: exited early (code 1)". Паттерн-матч stderr ("update required", fetch манифест-URL, version-check) + класс GATED/KILLSWITCH в отчёте - превратит разрозненные падения версий в систематический детектор remote-килл-свитчей по всей экосистеме. Это секьюрити-фича, у нас уже есть один живой экземпляр.

### R13. Пин СОДЕРЖИМОГО ресурсов и промптов (кейс: hostinger, 264k устан/нед)

cli.js:322-333: ресурсы и промпты пинуются конвертом (name/uri/description из list-вызова). Содержимое (resources/read: сами SKILL.md-тексты; prompts/get: шаблоны) не пинуется. Значит: хостингер может молча заменить ТЕКСТ инструкции в audit-hosting/SKILL.md при неизменном uri - пин не шевельнётся. Инструкции, доставляемые ресурсами - ровно наша модель угроз. Фикс: sha-256 содержимого text/* ресурсов (с капом размера) и шаблонов промптов, опционально.

### R14. outputSchema-пиннинг, opt-in (кейс: github-mcp-server #3466)

Наш бэктест: 123 из 131 инструментов изменились, ВСЕ 123 - добавление outputSchema (артефакт апгрейда Go SDK), inputSchema нетронуты. Текущие пины outputSchema не видят. Это статическая половина P4 (response-shape): без неё самый громкий реальный кейс GitHub невидим инструменту. Предложение: пиновать outputSchema с отдельным хэшем и NOTATION-градировкой добавлений (SDK-волны) vs реальных сужений вывода.

### R15. Таксономия ошибок history (кейс: expo, отвергнутый)

expo-mcp: 9/10 версий "unreachable", но причины трёх сортов: npm EUNSUPPORTEDPROTOCOL (git-зависимости в package.json), ранний exit, таймаут. В отчёте сейчас один класс. Разнести по строкам - и картина покрытия становится честной ("2 версии принципиально неставятся из-за git-deps, 5 не стартуют, 3 отсканированы").

### R16. Библиотека SDK-артефактов как авто-правила (кейс: chrome-devtools, отвергнутый после корректива)

Хром-корректива 2026-10-08 (28 "BREAKING" -> 0 параметрических: остаток - границы integer ±MAX_SAFE_INTEGER от TS-SDK, порядок ключей, диалект) была ручной перепригонкой. Гradировка P3-P6 закрывает часть; предлагаю кодифицировать паттерн-библиотеку: bounds ±2^53-1 = NOTATION (SDK artifact), anyOf<->oneOf (R4), диалект, порядок ключей - каждая с фикстурой в corpus. Тогда "перепроверь руками" исчезает как класс работ.

### R17. Наблюдение: условная реклама инструментов (кейс: azure-mcp, отвергнутый)

Azure документировано рекламирует extension_azqr только при установленном azqr CLI >= 3.0 - tool list зависит от окружения машины. Не баг, паттерн. Вместе с per-UA поверхностями (R6, Netlify) это второй задокументированный способ раздать разным клиентам разный контракт. Достаточно заметки в доках chameleon + advisory, если описание инструмента содержит "only available if/when installed".

### R18. Ops: weekly для remote-endpoint'ов (кейс: azure-devops, слова DavidS-msft)

Hosted-сервер и npm-пакет версионируются раздельно, remote получает апдейты РАНЬШЕ. scan --url уже умеет пинить remote ad-hoc; weekly-трекер гоняет только npm-каналы. Добавить в watch-list тип "remote" (url + заголовок из secrets) - и единственный реально живой канал вендоров попадёт под наблюдение.

## Чеклист перепрогона после публикации новой версии

1. rugsnare --version + наличие футера.
2. playwright 0.0.80 -> 0.0.81: ожидание 7 x NOTATION (валидация фикса градировки).
3. Netlify 1.15.0 -> 1.15.1: ожидание LOOSENED (params стал опциональным, веточный уровень).
4. Netlify 1.15.1 -> 1.16.0: ожидание EXPANDED (ветка get-team-env-vars) + NOTATION прочих.
5. MongoDB 2.1.2 -> 3.0.0: ожидание смеси NOTATION (13) + BREAKING-сужений (7 инструментов: minItems, integer, кэпы).
6. Sentry 0.39.0 -> 0.40.0: ожидание EXPANDED (assignedTo widening) + COSMETIC (search_events проза).
7. Прогнать history playwright + netlify начисто для чистых счётчиков в issue-текстах.
8. Встроить градуированные выводы инструмента в драфты issue (заменить ручную декомпозицию там, где вывод совпадает).

---

# Реран на rugsnare 1.2.0 (выполнен 2026-10-12)

## Результаты по чеклисту

| Кейс | Ожидание | Факт 1.2.0 | Вердикт |
|---|---|---|---|
| playwright 0.0.80 -> 0.0.81 | 7 NOTATION | 7 NOTATION + 2 NEW (browser_webmcp_list/call) | ГРАДАЦИЯ ВАЛИДИРОВАНА (1.1.0 давал 7 BREAKING) |
| Netlify 1.15.0 -> 1.15.1 | LOOSENED | 8 NOTATION, schemaChanges пустой | ГРЕЙД ПОНИЖЕН ОШИБОЧНО: реальный required-drop на depth-2 (см. R21) |
| Netlify 1.15.1 -> 1.16.0 | EXPANDED | 9 LOOSENED (additionalProperties false -> undeclared на всех 9) + prose-канал get-team-env-vars | ТОЧНО; история сильнее ожидания (сервер перестал отвергать неизвестные ключи) |
| MongoDB 2.1.2 -> 3.0.0 | 13 NOTATION + 7 BREAKING | 4 BREAKING + 16 NOTATION | 4 корректны с листами (pipeline minItems; limit integer+1..1024; pattern ASCII; limit 1..100); aggregate $vectorSearch number->integer на depth-5 ушёл в NOTATION (R21); 13 из 16 NOTATION = свап $schema dialect draft-07 -> 2020-12, разложен верно |
| Sentry 0.39.0 -> 0.40.0 | EXPANDED + COSMETIC | update_issue LOOSENED (assignedTo string -> untyped + unassign в prose) + search_events COSMETIC | ТОЧНО |
| LaunchDarkly 0.6.1 -> 0.6.2 | граница 19 -> 20 инструментов | 1 NEW get-audit-log-entries, 19/19 ok | ТОЧНО, хирургический релиз |

Дополнительно: ворнинг версии ("pins taken against X, current install is Y") сработал во всех 6 кейсах - защита от context7-класса ошибок работает вживую.

## Новые рекомендации (по прогонам 1.2.0)

- R21 (ГЛАВНАЯ): рекурсивная декомпозиция схем. Декомпозер классифицирует только constraint-ключи верхнего уровня (properties.X). Доказательства: (а) Netlify 1.15.1: properties.selectSchema.required потерял "params" (depth 2) - грейд NOTATION вместо LOOSENED, schemaChanges пустой при schemaChanged:true; (б) MongoDB 3.0.0: properties.pipeline.items.anyOf[0].properties.$vectorSearch.anyOf[*].properties.{numCandidates,limit} получили number -> integer + max (depth 5) - грейд NOTATION вместо BREAKING. Фикс: рекурсивный обход properties/items/anyOf/oneOf/allOf на любую глубину, сообщения с полным путём ("pipeline.$vectorSearch.numCandidates: number -> integer [tighten]"). Единственная находка, меняющая грейд реальных кейсов.
  -> ЗАКРЫТО продукт-чатом (батч в дереве, 323/323, в CHANGELOG). ВЕРИФИЦИРОВАНО независимо 2026-10-12 из дерева:
  Netlify 1.15.0->1.15.1 = 8 LOOSENED c путями ('selectSchema.params became optional', даже
  'selectSchema[get-deploy].params' - с именем операции); MongoDB 2.1.2->3.0.0 = aggregate теперь BREAKING
  с листом 'pipeline[][0].$vectorSearch[0].numCandidates number->integer + max + exclusiveMin';
  итог Mongo 5 BREAKING + 15 NOTATION (было 4+16). Превзошло запрос: пути с именами операций.
- R25: skills scan не видел канонический skills/ в корне репо (раскладка superpowers 297k звёзд).
  -> ЗАКРЫТО (одна строка в SKILL_LOCATIONS, 323/323, в CHANGELOG). ВЕРИФИЦИРОВАНО 2026-10-12 на живом
  superpowers v6.4.2->v7.0.0 БЕЗ обходного копирования: scan пинит прямо из skills/ (skills-dir/project/*),
  diff = 6 находок (1 dangerous) одной командой, включая opencode/INSTALL.md бонусом.
- R22: Windows-spawn конфигов. "command":"npx" -> spawn ENOENT; "command":"npx.cmd" -> spawn EINVAL (Node >= 18.20 требует shell для .cmd-файлов). Клиенты (Claude Desktop, Cursor) на Windows спавнят с shell - rugsnare нет. Фикс: на win32 spawn с shell:true или резолв npx через node + путь к npm cli. До фикса: llms-install.md должен советовать юзерам Windows писать command: node + прямой путь к cli.
- R23: строгий парсинг флагов. (а) неизвестный флаг молча игнорируется (diff --pins <path> не ошибка, а "No pinned servers"); (б) scan --help НЕ печатает помощь, а запускает скан; (в) scan без --config молча свипает ВСЕ найденные конфиги машины (18 серверов, включая требующие auth). Фикс: unknown flag = ошибка; help = всегда печать; авто-discovery только по явному флагу.
- R24: таймаут по умолчанию. 15с мало для холодного старта (Netlify dist не успел). --timeout 45000 решил. Предложение: дефолт 30-45с на scan.
- Мелочь: diff --json отдаёт объект с числовым ключом "0" вместо массива - неудобно парсить.

- R27 (из волны 4, Zed-фронт): добавить '.agents/skills' (user + project scope) в SKILL_LOCATIONS.
  Прямо сейчас папка не покрывается - а это: расположение Zed (91.6k звёзд, пять открытых скилл-багов
  именно про ~/.agents/skills), содержимое superpowers (.agents в корне - наш прогон его промолчал),
  формирующийся кросс-платформенный стандарт. Одна строка = крупнейший непокрытый контингент.
  Заодно проверить skills.js SKILL_DIRS (advisory-слой) на оба добавления R25+R27 (см. R26).

- R28 (из волны 5, Cloudflare): пин УДАЛЁННЫХ источников скиллов. Cloudflare Agents/Think: skills.r2()
  подтягивает скиллы из R2 в рантайме (design/skills.md: SkillSource обязан "report a deterministic
  fingerprint"; в follow-ups Git-backed sources). Дрейф в R2 не оставляет git-истории - ловить только
  снапшот-пином. Реализация симметрична существующему scan --url для удалённых MCP: skills scan --url
  <endpoint>, snapshot-hash в пин-стор, scheduled diff, ворнинг "источник изменился с апрува".
- R29-кандидат (там же): skills-chameleon - один удалённый источник, разные клиенты/ключи -> разные
  скиллы? (аналог --chameleon для MCP-поверхностей). Проверить на skills.r2/Git-backed, когда взлетит.
- Тренд-вывод: скиллы повторяют траекторию MCP (локально -> реестры -> удалённо -> per-client), все
  гиганты строят распределение (MSFT sync, Vercel registry, CF R2), integrity-слой не строит никто.
