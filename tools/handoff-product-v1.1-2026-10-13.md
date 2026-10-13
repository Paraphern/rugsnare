# Хенд-офф продуктовому чату: pin format v1.1 (identity + policy stamp)

**Статус: ПУБЛИЧНО ЗАЯВЛЕНО 2026-10-13.** Мы обязались перед двумя аудиториями:
- [autogen#7353, коммент 6141000039](https://github.com/microsoft/autogen/issues/7353#issuecomment-6141000039) — «The v1.1 direction for PIN-SPEC: an identity block ... with an identityHash bound into the envelope» + «stamp the policy version into every pin, and surface a policy bump as its own class».
- [snyk#482, коммент 6141000342](https://github.com/snyk/agent-scan/issues/482#issuecomment-6141000342) — машиночитаемые пины как opaque record для сторонних верификаторов (требование: детерминированная сериализация пина).

**Приоритет: до следующих анонсов (блог-пост HN держится за этим).** Исследовательский чат пишет тексты секций в docs/PIN-SPEC.md; реализация формата — ваша.

## Что реализовать (4 пункта)

### 1. Identity-блок в pins.json (закрывает R32/R34 + вопрос babyblueviper1)

В `servers.<name>` добавить:

```json
"identity": {
  "package": "@supabase/mcp-server-supabase",
  "resolvedVersion": "0.13.0",
  "entryPath": "dist/cli.js",
  "url": null,
  "identityHash": "sha256:..."
}
```

- `identityHash` = sha256 над stable({package, resolvedVersion, entryPath, url}) — **САМ identityHash НЕ входит в хэшируемый объект** (ревью autogen#7353 от 13-10 поймало самоссылку в первом варианте спека: дайджест не может быть членом объекта, который хэширует). Дайджест хранится рядом с четырьмя полями. Коммит в конверт, участник сравнения при diff.
- ВАЖНО для §7-композиции (исправление того же ревью): сторонняя receipt-система НЕ канонизирует наш pins.json — `record` остаётся нетронутым текстом; в их preimage входит external_evidence_hash (RFC 8785 по всему массиву evidence). Наша единственная обязанность — байт-стабильность файла (см. п.4).
- `resolvedVersion` — ФАКТИЧЕСКИ разрешённая версия (для npx-floating: после установки, `npm ls --json` или equivalent). Прецедент: mongodb 2.1.2 с плавающим zod — контракт менялся без релиза сервера.
- `entryPath` — решает supabase-кейс: перенос stdio-entry при целых тул-хэшах. При смене entryPath между пином и live → отдельная находка (см. п.3 про классы).
- `url` — для remote-серверов (scan --url).
- Расширение R32 (опционально в v1.1, можно v1.2): `resolvedDeps: {zod: "4.4.9"}` — топ-уровневые schema-затрагивающие зависимости.

### 2. Policy/canonicalization version stamp

В каждый pins.json (top-level, рядом с `"version": 1`):

```json
"policyVersion": "rugsnare-1.3.0"
```

- Источник истины: версия политики канонизации/градуирования, не semver npm-пакета целиком (достаточно производная от версии rugsnare, bumped только при изменении поведения stable()/классификатора).
- При diff: если policyVersion пина ≠ policyVersion текущего бинаря → находка класса POLICY (см. п.3), НЕ пересчитывать молча.

### 3. Два новых класса вывода diff

- `IDENTITY` — identityHash/entryPath/package изменились, тул-хэши целы. Текст: «the surface is served by a different build/path than approved». Это packaging-drift (supabase-прецедент, R34).
- `POLICY` — policyVersion пина ≠ текущей. Текст: «re-graded under a newer verifier policy; re-pin to accept». НЕ серверный дрейф — вендор невиновен.
- Прецеденты для тестов: chrome-devtools 1.8.0→1.10.1 на 1.2.0 давал 27 ложных BREAKING (доколе не починили эквивалентность); mongodb 4+16 → 5+15 без релиза сервера.

### 4. Детерминированная сериализация pins.json (для snyk-интеграции)

Сторонний верификатор делает JCS-хэш нашего pins.json как opaque record → файл обязан быть байт-стабильным при повторном скане той же версии: фиксированный порядок ключей (уже sorted через stable()), без timestamps в теле, меняющихся при ре-скане (`pinnedAt` — оставить, он и так один раз ставится; проверить, что ре-скан идентичной версии не меняет ни одного байта).

## Критерии приёмки

1. Пин supabase 0.8.3 vs live 0.13.0: тул-хэши целы → `IDENTITY` (entry move), exit 1.
2. Пин, снятый rugsnare 1.2.x, диффуется бинарём с v1.1: `POLICY`, а не пересчитанные классы молча.
3. Повторный scan той же версии = байт-идентичный pins.json (sha256 совпал).
4. PIN-SPEC «MUST bump version on breaking change»: identity-блок и policyVersion аддитивны → consumers MUST ignore unknown keys уже написано; значит достаточно minor-бампа формата `"version": 1` → оставить 1 (аддитивно) либо 1.1 — решение за вами, зафиксировать в PIN-SPEC.

## Что НЕ входит

- Diff/grading внешних форматов, JCS у нас (наш stable() достаточно), телеметрия любого вида.

## ДОБАВЛЕНО 2026-10-13 (4-й самопрогон спека): КРИТИЧНО — path-утечка в skills-пинах

Найдено сверкой спека с реальными пинами: `skills.<key>.path` пишется МАШИННО-АБСОЛЮТНЫМ
путём (например `C:\tmp\sweep\sp-b\skills\...`), при том что рядом лежит чистый `relative`.
Последствия: (а) §7 byte-stability ломается между машинами/каталогами скана; (б) в
ОПУБЛИКОВАННОМ каталоге audits/drift-watch/pins/ три skills-снимка несут наши локальные
пути (включая C:\GlobalWork\...). Фикс в v1.1-писателе: path = относительный (к корню
скиллов) или удалить поле в пользу relative. После релиза 1.4.0 — перегенерить три
skills-снимка каталога (superpowers x2, vercel-skills) и закоммитить замену.

Прочее из ревизий 5-6 спека, влияющее на реализацию:
- §5: ignore-unknown обязан покрывать server-level поля (identity живёт там).
- Легаси-пины: нет policyVersion -> POLICY один раз (re-pin чтобы проштамповать);
  нет identity -> advisory identity-unpinned, НЕ гейт-фейл. Все 45 снимков каталога легаси.
- pinnedAt меняется ТОЛЬКО при изменении контента; firstSeen стабилен.
- §3 правила 7-8 (RFC 8785 числа; суррогаты -> rejection at capture).
- resources/prompts записи: {hash, description, firstSeen}; approved: scan=true,
  proxy first-sight=false (до явного approve).
