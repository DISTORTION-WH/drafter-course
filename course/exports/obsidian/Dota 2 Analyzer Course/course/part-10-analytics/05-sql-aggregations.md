# Глава 5. Корректные SQL-агрегации

[← Глава 4](04-sample-size-and-intervals.md) · [Оглавление](README.md) · [Глава 6 →](06-materialized-views.md)

## Сначала eligible set

Предположим, migrations добавили в `matches`:

```text
is_professional
has_complete_draft
has_complete_participants
is_quarantined
```

Запрос начинается с одной строки на eligible match:

```sql
WITH eligible_drafts AS (
  SELECT m.id, m.patch_id, m.start_time
  FROM matches AS m
  WHERE m.is_professional = true
    AND m.has_complete_draft = true
    AND m.is_quarantined = false
    AND m.patch_id = $1
    AND m.start_time >= $2
    AND m.start_time < $3
),
draft_totals AS (
  SELECT COUNT(*)::bigint AS eligible_drafts
  FROM eligible_drafts
),
hero_draft_counts AS (
  SELECT
    da.hero_id,
    COUNT(DISTINCT da.match_id) FILTER (WHERE da.action = 'pick')::bigint AS picks,
    COUNT(DISTINCT da.match_id) FILTER (WHERE da.action = 'ban')::bigint AS bans
  FROM draft_actions AS da
  JOIN eligible_drafts AS ed ON ed.id = da.match_id
  GROUP BY da.hero_id
)
SELECT
  h.id AS hero_id,
  h.display_name,
  dt.eligible_drafts,
  COALESCE(hdc.picks, 0) AS picks,
  COALESCE(hdc.bans, 0) AS bans,
  COALESCE(hdc.picks, 0)::numeric / NULLIF(dt.eligible_drafts, 0) AS pick_rate,
  COALESCE(hdc.bans, 0)::numeric / NULLIF(dt.eligible_drafts, 0) AS ban_rate,
  (COALESCE(hdc.picks, 0) + COALESCE(hdc.bans, 0))::numeric
    / NULLIF(dt.eligible_drafts, 0) AS contest_rate
FROM heroes AS h
CROSS JOIN draft_totals AS dt
LEFT JOIN hero_draft_counts AS hdc ON hdc.hero_id = h.id
WHERE h.is_active = true;
```

`COUNT(DISTINCT match_id)` защищает rate от duplicate action rows, но duplicates всё равно quality error. `CROSS JOIN` добавляет один общий denominator ко всем heroes. `LEFT JOIN` сохраняет heroes с нулём actions.

## Win counters отдельно

```sql
, eligible_results AS (
  SELECT m.id
  FROM matches AS m
  WHERE m.is_professional = true
    AND m.has_complete_participants = true
    AND m.is_quarantined = false
    AND m.patch_id = $1
    AND m.start_time >= $2
    AND m.start_time < $3
),
hero_results AS (
  SELECT
    mp.hero_id,
    COUNT(DISTINCT mp.match_id)::bigint AS games,
    COUNT(DISTINCT mp.match_id) FILTER (WHERE mp.is_winner)::bigint AS wins
  FROM match_players AS mp
  JOIN eligible_results AS er ON er.id = mp.match_id
  GROUP BY mp.hero_id
)
```

Затем `LEFT JOIN hero_results`. Win rate:

```sql
COALESCE(hr.wins, 0)::numeric / NULLIF(COALESCE(hr.games, 0), 0)
```

При games 0 результат `NULL`.

## Не соединяйте actions и participants до агрегации

Если join draft actions и 10 participants по match, каждая action умножится на 10. Сначала агрегируйте каждую таблицу до hero grain, потом соедините.

## Типы в Node

PostgreSQL `COUNT` возвращает `bigint`; driver может представить строкой. Mapper валидирует/преобразует в safe API number только если значение <= `Number.MAX_SAFE_INTEGER`, иначе API count type должен быть string. Для MVP dataset count безопасен, но проверка явная.

`numeric` driver часто возвращает string. Parse ratio через строгую функцию и проверьте `0..1`; не используйте `Number(value)` без validation.

## Invariants query

```sql
SELECT hero_id, picks, bans, eligible_drafts
FROM hero_meta_result
WHERE picks < 0
   OR bans < 0
   OR picks > eligible_drafts
   OR bans > eligible_drafts
   OR picks + bans > eligible_drafts;
```

Последнее условие верно для нашего definition/complete valid Captain’s Mode draft.

## Практика

На golden fixture 4 drafts добейтесь для hero A: picks 3, bans 1, games 3, wins 2. Проверьте exact counters до floating rates.

## Самопроверка

- [ ] Eligible set имеет одну строку на match.
- [ ] Actions/results агрегируются отдельно.
- [ ] Heroes с zero присутствуют, если contract этого требует.
- [ ] Division защищено `NULLIF`.
- [ ] Driver numeric/bigint mapping проверяется.
