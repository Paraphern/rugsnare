# Хенд-офф продуктовому чату: POLICY stop-rule не реализован (2026-10-14, поздно)

## Контекст: что происходит

B5-камент в autogen#7353 (публичное обещание «PIN-SPEC v1.1 lands in rugsnare 1.4.0»)
держим до решения этой проблемы. bbv (внешний ревьюер спека) гарантированно спросит про
POLICY - это его главная тема («grading is where the real judgment is», «never blame the
vendor for the verifier's change»).

## Суть: спек §3.1 говорит одно, реализация делает другое

| | СПЕК §3.1 | РЕАЛЬНОСТЬ 1.4.2 |
|---|---|---|
| POLICY выдаётся | ✓ | ✓ |
| Стоп для этого пина | «**stops** for that pin» | **НЕ останавливается** |
| Переградуированные классы | «**no** re-graded tool classes are **emitted** against it» | **Выдаются** (LOOSENED, COSMETIC, GONE и т.д. следом за POLICY) |

### Живой репро (наш стенд, 1.4.2):

Легаси-пин (без policyVersion) от 1.3.0-эры кладём в .rugsnare/, запускаем
`rugsnare@1.4.2 diff`. Результат:

```
(policy)
  [DRIFT] (policy) (POLICY)
      re-graded under a newer verifier policy; re-pin to accept (pins from pre-1.4, this binary rugsnare-1.4.2) - not server drift
  [DRIFT] hubspot-search-objects (LOOSENED) fb13fc5502d8aa5b -> 47da3e6b399a1cff
  [DRIFT] hubspot-batch-update-objects (COSMETIC) ae35daa87be15da1 -> bd13870844c012c2
  [GONE] hubspot-batch-create-associations
  [GONE] hubspot-list-workflows
  [GONE] hubspot-get-workflow
rugsnare diff: DRIFT DETECTED (6 finding(s))
```

POLICY есть (не молчит) - но ниже идут 6 классов, каждый из которых выглядит как обычный
дрейф. Потребитель, пролиставший POLICY-строку, возьмёт LOOSENED за чистую монету.

### Почему это критично для B5

bbv создатель всей этой архитектуры разделения слоёв. Он спросит «what happens when a
legacy pin hits your new binary?» - и если ответ «POLICY плюс классы», он укажет на
расхождение с собственным спеком. Публично.

## Что сделать (одна задача)

**Реализовать стоп в diff после POLICY для этого пина.**

Когда `pin.policyVersion !== verifier.policyVersion`:
1. Выдать POLICY-находку с текстом (уже есть)
2. **НЕ выдавать** tool-level классы для этого пина (LOOSENED, BREAKING, COSMETIC, GONE, NEW)
3. НЕ считать их в счётчике findings
4. exit 1 (POLICY сам по себе = дрейф, требующий re-pin)
5. В output подсказка: «re-run after `rugsnare scan` to grade under the current policy»

### Критерии приёмки:

```
Легаси-пин → rugsnare@1.4.3 diff →
  [POLICY] re-pin to accept... not server drift
  rugsnare diff: DRIFT DETECTED (1 finding(s))  <-- 1, не 7
  exit 1
```

### Дополнительно (одна строка в спек, могу я):

PIN-SPEC §2.1 добавить: «Skills entries carry no identity block; their identity is the
file path (relative) and content hash. Server identity applies to MCP server launches only.»

## Параллельно (мелочи для B5, после вашего фикса)

- «45 legacy snapshots» в драфте → исправить на «38» (7 уже имеют policyVersion после
  сегодняшней перегенерации каталога)
- Каталог сегодня почищен: 4 union-загрязнённых снимка заменены (hubspot x2, shopify,
  supabase) - коммит 466d529. Корень - sweep без rm .rugsnare (тот же, что у P0-1).

## Тайминг

B5 можно отправлять сразу после мержа 1.4.3 + моей 15-минутной приёмки (чистая
последовательность на легаси-пине). Драфт B5 готов, обновлю числа под фактическую версию.
