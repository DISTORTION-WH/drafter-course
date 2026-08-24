# Глава 5. `INSERT`, `SELECT`, `UPDATE`, `DELETE`

[← Глава 4](04-keys-constraints-relations.md) · [Оглавление](README.md) · [Глава 6 →](06-joins-and-aggregates.md)

## CRUD

- Create → `INSERT`;
- Read → `SELECT`;
- Update → `UPDATE`;
- Delete → `DELETE`.

SQL декларативен: вы описываете желаемый набор, а planner выбирает способ.

## `INSERT ... RETURNING`

```sql
INSERT INTO heroes (id, machine_name, display_name)
VALUES (1, 'npc_dota_hero_antimage', 'Anti-Mage')
RETURNING id, display_name;
```

`RETURNING` избавляет от второго запроса.

Несколько строк:

```sql
INSERT INTO heroes (id, machine_name, display_name)
VALUES
  (2, 'npc_dota_hero_axe', 'Axe'),
  (3, 'npc_dota_hero_bane', 'Bane');
```

## `SELECT`

```sql
SELECT id, display_name
FROM heroes
WHERE is_active = true
ORDER BY display_name ASC;
```

Порядок clauses:

```text
SELECT → FROM → JOIN → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT/OFFSET
```

Не используйте `SELECT *` в API repository: добавление столбца неожиданно изменит объём/форму данных.

## Параметры, не склейка

В SQL console литерал допустим. В Node driver всегда параметры:

```ts
const result = await client.query(
  `SELECT id, provider_match_id, start_time
   FROM matches
   WHERE provider_match_id = $1`,
  [providerMatchId],
);
```

`$1` — placeholder. Driver передаёт значение отдельно и не позволяет превратить его в SQL syntax. Нельзя писать ``WHERE id = ${userInput}``.

## Фильтры и `NULL`

```sql
SELECT id, provider_match_id
FROM matches
WHERE patch_id = '7.XX'
  AND start_time >= '2026-07-01T00:00:00Z'
  AND league_id IS NOT NULL
ORDER BY start_time DESC, id DESC
LIMIT 20;
```

Второй sort key `id` делает порядок устойчивее при одинаковом времени.

## `UPDATE`

```sql
UPDATE heroes
SET display_name = 'Anti-Mage', updated_at = now()
WHERE id = 1
RETURNING id, display_name, updated_at;
```

Сначала выполните эквивалентный `SELECT` с тем же `WHERE`. `UPDATE` без `WHERE` изменит все строки.

## `DELETE`

```sql
DELETE FROM matches
WHERE id = 42
RETURNING id, provider_match_id;
```

Для production events часто лучше хранить audit/status, чем физически удалять. Но retention/privacy могут требовать настоящего удаления.

## Pagination

Offset:

```sql
ORDER BY start_time DESC, id DESC
LIMIT 20 OFFSET 40;
```

Удобен, но глубокий offset дорог и коллекция сдвигается. Cursor/keyset:

```sql
WHERE (start_time, id) < ($1::timestamptz, $2::bigint)
ORDER BY start_time DESC, id DESC
LIMIT $3;
```

Cursor кодирует последнюю пару, а backend проверяет его.

## Практика

Создайте 5 heroes и 3 matches. Выполните фильтр по диапазону времени, update имени и delete тестового матча. Перед update/delete всегда покажите matching `SELECT`.

## Самопроверка

- [ ] Запрос выбирает явные столбцы.
- [ ] В Node значения идут параметрами.
- [ ] `NULL` проверяется через `IS`.
- [ ] Сортировка содержит tie-breaker.
- [ ] Для больших коллекций я понимаю keyset pagination.
