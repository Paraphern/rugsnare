# Handoff: windfallradar - D1 выел дневной лимит free tier (5M rows read)

**Дата:** 2026-10-27 · Источник: Cloudflare-уведомление + разбор через wrangler/D1 Insights/GraphQL analytics

## Суть проблемы

Аккаунт `Paraphernal@proton.me's Account` (id `714a941ffa1c637f4c76ae2288f82916`) превысил дневной лимит D1 free tier - 5 000 000 строк чтения. Чтения блокировались до 00:00 UTC 27.10, потом сбросились. При текущем темпе лимит снова упрётся ~18-19 UTC того же дня: к 09:00 UTC уже потрачено ~1.7 млн из 5 млн.

Единственная D1-база на аккаунте: `windfallradar` (uuid `8e46d22c-2779-49c4-b68b-059e38f9fd05`, 8.6 МБ, создана 30.09). Воркеры на аккаунте: `paraphernalia`, `whaleapi`, `windfallradar-pipeline` (обновлён 01.10). Всё ниже - про эту базу и пайплайн.

Профиль нагрузки: чтения круглосуточно, ~4-5 млн строк/сутки (среднее ~180 тыс/час), вечерние пики (26.10 18:00 UTC - 1.6 млн/час). Записи при этом маленькие (десятки-пара тысяч строк/час). То есть нагрузка read-heavy и регулярная (крон/поллинг), а не разовый всплеск.

## Виновники: три запроса = ~4.85 млн строк/сутки (98% лимита)

Данные D1 Query Insights (окно 1 сутки, сортировка по reads):

### 1. Статс-запрос с пятью COUNT(*) - 3.31 млн строк/день (66% лимита)

```sql
SELECT
 (SELECT COUNT(*) FROM change_log WHERE change_type IN ('item_new','item_updated')) AS collected,
 (SELECT COUNT(*) FROM extraction_log WHERE status = 'empty') AS noPath,
 (SELECT COUNT(*) FROM extraction_log WHERE status = 'filtered') AS filtered,
 (SELECT COUNT(*) FROM extraction_log WHERE status = 'ok') AS extracted,
 (SELECT COUNT(*) FROM case_events) AS events
```

- 167 запусков/сутки (~раз в 8-9 минут), **19 809 строк чтения на запуск**, 7 мс.
- Причина: `COUNT(*)` в SQLite сканирует таблицу (или её индекс) целиком. Каждый запуск перечитывает ~20 тыс. строк, чтобы вернуть одну строку из пяти чисел.

### 2. Статс-запрос с семью NOT LIKE - 0.77 млн/день

```sql
SELECT
 (SELECT COUNT(*) FROM change_log c WHERE c.change_type IN ('item_new','item_updated','source_changed')
   AND c.summary NOT LIKE '%(no description%'
   AND c.summary NOT LIKE '%Assignment of Claim%'
   AND c.summary NOT LIKE '%Transfer Agreement%'
   AND c.summary NOT LIKE '%Receipt of filing fee%'
   AND c.summary NOT LIKE '%Professional Fees%'
   AND c.summary NOT LIKE '%Notice of Transfer%'
   AND c.summary NOT LIKE '%Fee Application%') AS n,
 (SELECT COUNT(*) FROM change_log c WHERE c.change_type IN ('item_new','item_updated','source_changed')) AS raw
```

- 84 запуска, 9 223 строки/запуск. `LIKE '%...%'` не использует индексы - всегда full scan, вдобавок дважды в одном запросе.

### 3. Лента с JOIN + OFFSET-пагинацией - 0.76 млн/день

```sql
SELECT c.id, c.source_id, c.change_type, c.summary, c.detected_at,
       COALESCE(r.payload, c.payload) AS payload, s.url AS source_url
FROM change_log c
LEFT JOIN raw_items r ON r.source_id = c.source_id AND r.external_id = c.external_id
LEFT JOIN sources s ON s.id = c.source_id
WHERE c.change_type IN (...) AND (семь тех же NOT LIKE ...)
ORDER BY c.id DESC LIMIT ? OFFSET ?
```

- ~9 тыс строк на вызов: OFFSET-пагинация перечитывает все строки до смещения, JOIN раздувает чтение, NOT LIKE блокирует индексы.

## Что чинить (по убыванию эффекта)

1. **Счётчики вместо COUNT(*)** - снимает ~66% лимита. Запись редкая (сотни строк/час), чтение статов постоянное. Завести таблицу-однострочник (или по строке на статус/тип), обновляемую пайплайном в момент вставки. Статс-запрос станет читать ~5 строк вместо 19 809.
   - Минимальный вариант: `CREATE TABLE stats_cache (k TEXT PRIMARY KEY, n INTEGER NOT NULL)` + `INSERT ... ON CONFLICT(k) DO UPDATE SET n = n + 1` в коде записи.
2. **Кэш статов 5-15 минут** (память воркера или KV): 167 реальных запусков/сутки превратятся в пару десятков. Совместимо с п.1 (кэш поверх счётчиков - вообще бесплатно).
3. **Предвычисленный флаг исключений**: семь NOT LIKE паттернов статичны - колонка `excluded INTEGER NOT NULL DEFAULT 0` в change_log, вычисляется при вставке строки. Оба запроса (2) и лента (3) превращаются в индексируемое условие `WHERE excluded = 0`. Разовая миграция: `UPDATE change_log SET excluded = 1 WHERE <семь паттернов>` + бэкфилл.
4. **Keyset-пагинация вместо OFFSET**: `WHERE c.id < :last_seen_id ORDER BY c.id DESC LIMIT n` - читает только страницу, а не всё до смещения. Совместно с `excluded` и индексом `(excluded, id DESC)` лента станет дешёвой на любой глубине.
5. **Fallback деньгами**: Workers Paid $5/мес = 25 млрд строк/мес и 50 млн записей. Закрывает вопрос мгновенно, но пункты 1-3 это примерно полвечера работы, после чего free tier снова дышит.

## Проверка после фикса

- `npx wrangler d1 insights windfallradar --sort-by reads --limit 5 --json` (из каталога с конфигом, где `account_id = 714a941ffa1c637f4c76ae2288f82916`; глобальный wrangler на этой машине дефолтит к другому аккаунту).
- Часовой профиль: GraphQL `d1AnalyticsAdaptiveGroups` по `databaseId = 8e46d22c-...`, поле `sum.rowsRead`; целевой ориентир после фикса - десятки тысяч строк/час максимум.

## Что НЕ связано с проблемой

Аккаунт rugsnare@proton.me (воркер rugsnare-mcp, сайт) - отдельный аккаунт, D1 не использует, к лимиту отношения не имеет.
