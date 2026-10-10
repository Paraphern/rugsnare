# ТЗ для продукт-чата: два улучшения guard-warning от Якуба (обсуждение #1, 2026-10-10)

Контекст: Якуб (KyttoMCP) предложил два уточнения к guard-style parameter warning после просмотра нашей реализации. Оба верные, оба закрывают реальные дыры.

## Улучшение 1: Условный guard-warning по additionalProperties

**Проблема:** Сейчас warning "server will silently ignore it (unknown keys not rejected)" срабатывает на КАЖДОЕ удаление guard-параметра. Но если у схемы `additionalProperties: false`, сервер ГРОМКО отвергнет вызов с неизвестным ключом — это не тихий игнор, а явная ошибка. Warning в этом случае ложный и приучает игнорировать сигнал.

**Что нужно:**
- При удалении параметра с guard-паттерном проверить `additionalProperties` в схеме НОВОЙ версии
- Если `additionalProperties: false` или отсутствует (зависит от контекста schema):
  - Warning текст: "guard-style parameter removed; server schema rejects unknown keys — calls passing it will fail loudly"
  - Или: не показывать warning вовсе (уже громкая ошибка, не тихая)
- Если `additionalProperties: true` или отсутствует в схеме:
  - Текущий warning: "guard-style parameter removed - agents may still pass it; server will silently ignore it (unknown keys not rejected)"

**Где:** в compareTools / schemaNotationDiff рядом с GUARD_PARAM_PATTERNS проверкой

**Тест-кейс:**
- Сервер A: schema с `additionalProperties: false`, guard-параметр удалён → warning изменён или отсутствует
- Сервер B: schema с `additionalProperties: true`, guard-параметр удалён → текущий warning

## Улучшение 2: Guard-warning для default-flip и became-optional

**Проблема:** Сейчас warning срабатывает ТОЛЬКО на удаление guard-параметра. Но есть два других способа тихо обезвредить guard, которые опаснее удаления (параметр виден, агент думает что защита есть):

| Сценарий | Было | Стало | Исход для агента |
|---|---|---|---|
| **default-flip** | `dry_run: {type: boolean, default: true}` | `dry_run: {type: boolean, default: false}` | Агент не передаёт dry_run (полагается на default) → действие исполняется |
| **became-optional** | `confirm: {type: boolean}` (required) | `confirm: {type: boolean}` (не required) | Агент не передаёт confirm (думает: не обязательно) → действие без подтверждения |

**Что нужно:**
- При изменении параметра с guard-паттерном (НЕ удалении):
  - Проверить: default-значение изменилось? (особенно boolean guard: true→false)
  - Проверить: параметр перестал быть required?
- Если да — добавить warning (аналогичный текущему guard-removal warning)

**Warning-тексты:**
```
# default-flip:
⚠ guard-style parameter defanged: dry_run default changed true -> false
  Agent relying on the old default will execute the real action

# became-optional:
⚠ guard-style parameter defanged: confirm is no longer required
  Agent may omit the confirmation, action executes without it
```

**Где:** в compareTools, в блоке где сейчас проверяется removal по GUARD_PARAM_PATTERNS. Добавить два других чека.

**Тест-кейсы:**
- dry_run: default true → default false → warning
- confirm: required → optional → warning
- dry_run: default false → default true → БЕЗ warning (усиление, не ослабление)
- context: default "abc" → default "xyz" → БЕЗ warning (не guard-паттерн)

## Приоритет

Оба улучшения некритичные (ложные срабатывания и missed detections), но точечные. Реализация ~30 минут на оба. Классификация не меняется (LOOSENED с warning, не новый класс).

## Ответ Якубу (завтра, после реализации)

Формат: «оба улучшения внедрены» + конкретика + возможно новый тест-кейс в corpus для default-flip сценария.
