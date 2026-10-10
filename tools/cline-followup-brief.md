# Бриф для продукт-чата: follow-up PR в cline/cline с классификацией изменений контракта

Дата: 2026-10-10. Дедлайн: «PR будет открыт в течение дня» после пинга от akushonkamen (автора PR #14946). Пинг ещё не пришёл - время есть, но подготовиться нужно сейчас.

## Что произошло (контекст без доступа к переписке)

Мы ведём аутрич в cline/cline (крупный AI-кодинг-клиент, ~100k GitHub stars). Три точки входа:

1. **Issue #14924**: CLI игнорирует `notifications/tools/list_changed` - инструменты, добавленные посреди сессии, не доходят до модели. Наш комментарий добавил секьюрити-грань: слепота скрывает не только новые инструменты, но и изменённые описания. Другой участник (NeuroSquad) предложил split: новые = тихий лог, same-name-changed = громкое уведомление.

2. **PR #14946** (автор akushonkamen, фикс #14924): добавляет подписку на `list_changed` + refresh + rebuild. Наш ревью-комментарий предложил расширить хук `onToolsChanged(serverName)` до `onToolsChanged(serverName, changes)` с классификацией. akushonkamen ответил:
   - Цитирует наши данные (218 изменений, 48 стёртых подтверждений) как «concrete rather than theoretical»
   - Соглашается: «Your changes classification is a better contract»
   - Хочет это как follow-up PR (текущий PR остаётся сфокусирован)
   - «We'd gladly design the classified payload against your audit data»
   - «If maintainers would rather see it land here, happy to adopt it in this PR»

3. **Наш ответ** (issuecomment-6100211601): пообещали follow-up PR с полной таксономией (added/removed/changed + direction-градировка). Сказали «PR will be open within a day» после пинга.

## Что нужно сделать

Follow-up PR в cline/cline, расширяющий `onToolsChanged` хук до классифицированного payload.

### Архитектура cline (из PR #14946)

Три слоя:
- **Client layer** (`sdk/packages/core/src/extensions/mcp/client.ts`): `McpServerClient.onToolsChanged(handler)` - сигнал от обоих транспортов
- **Manager layer** (`sdk/packages/core/src/extensions/mcp/manager.ts`): per-server invalidation counter + `McpManagerOptions.onToolsChanged(serverName)` - хук для хостов
- **Runtime construction** (`sdk/packages/core/src/runtime/orchestration/runtime-builder.ts`): `loadConfiguredMcpTools` → `createMcpTools` → сессия

В момент когда менеджер re-lists, у него в руках **обе** версии списка (старый кэш + свежий). Сравнение почти бесплатно.

### Наш вклад: классификация

Расширить хук до `onToolsChanged(serverName, changes)` где `changes` - массив per-tool изменений:

```typescript
interface ToolChange {
  toolName: string;
  kind: 'added' | 'removed' | 'changed';
  // Для 'changed':
  direction?: 'tightened' | 'loosened' | 'notation';
  oldDescription?: string;
  newDescription?: string;
  oldSchemaHash?: string;
  newSchemaHash?: string;
}
```

Классификация (наша, полевая, обкатанная в rugsnare):
- **added** - новое имя → тихий лог (NeuroSquad UX: пользователь сам подключил)
- **removed** - одобренный инструмент исчез → стоит подсветить
- **changed** - то же имя, другой контракт → громкое уведомление:
  - tightened (новый required, суженный тип, added constraint) → BREAKING
  - loosened (убранный constraint, расширенный тип) → LOOSENED
  - notation (диалект $schema, порядок ключей, additionalProperties форма) → NOTATION

Все три exit-класса - ненулевые (это дрейфт), но метка говорит рецензенту что он смотрит.

### Hash-методика (из rugsnare, проверена на 218+ находках)

Per-tool: sha-256 от `{name, description, inputSchema}` с канонизацией:
- Ключи объектов отсортированы (порядок ключей неважен)
- Порядок массивов значим (enum порядок = семантика)
- $schema диалект сохраняется как есть (валидаторы считают его контрактом)
- additionalProperties true vs {} - нормализуется к одному виду
- NOTATION-класс отделяется от BREAKING по направлению изменения

### Тест-кейсы (из corpus, публичные)

| Кейс | Файл | Что тестирует |
|---|---|---|
| WhatsApp sleeper | corpus/04-whatsapp-rugpull | description flip: benign → exfiltration |
| Schema drift | corpus/02-schema-drift | inputSchema change (BREAKING) |
| Key reorder only | corpus/05-key-reorder | NOTATION (не BREAKING после канонизации) |
| Agent hints | (из аудита bybit) | description edits с "Agent hint:" |

Плюс синтетика для removed/added.

## Требования от cline (из кодовой базы)

- TypeScript, их SDK структура (`sdk/packages/core/src/`)
- Тесты в их фреймворке (`*.test.ts` рядом с исходниками)
- Эффект-тесты (`internal/assembly/boot/effect_test.go` pattern - но это Go, для core SDK скорее обычные unit-тесты)
- PR description со ссылкой на issue #14924 и PR #14946

## Что я (исследовательский чат) обеспечиваю

- PR description текст (EN, в нашем тоне: вклад first, без AI-маркеров)
- Ссылки на аудит-данные для каждого класса
- Response на ревью-комментарии

## Что нужно от продукт-чата

1. Изучить `sdk/packages/core/src/extensions/mcp/` (client.ts, manager.ts, types.ts)
2. Написать `classifyToolChange(oldTool, newTool): ToolChange` + канонизацию
3. Интегрировать в manager's onToolsChanged path
4. Тесты (наши corpus-кейсы + синтетика)
5. PR: ветка `feat/tools-changed-classification`, base `main`

## Крайне важно

- **Ни одного длинного тире (—)** в коде, комментариях, PR description. Только короткое (-).
- PR description начинается с контекста issue #14924 (не с нашего инструмента)
- RugSnare упоминается один раз в хвосте как prior art, не как dependency
- Код следует их стилю (посмотреть соседние файлы)
