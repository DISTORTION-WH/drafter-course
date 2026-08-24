# Глава 7. Индексы и `EXPLAIN`

[← Глава 6](06-joins-and-aggregates.md) · [Оглавление](README.md) · [Глава 8 →](08-transactions-and-upsert.md)

## Что делает индекс

Индекс — дополнительная структура поиска. Он может сократить чтение, но занимает место и замедляет insert/update. Индекс создаётся под реальный query pattern, а не «на каждый столбец».

Primary key и `UNIQUE` уже создают уникальные B-tree indexes. Foreign key сам по себе не всегда создаёт индекс на referencing columns — это нужно оценить.

## Индексы MVP

```sql
CREATE INDEX matches_start_time_id_idx
  ON matches (start_time DESC, id DESC);

CREATE INDEX matches_patch_start_time_idx
  ON matches (patch_id, start_time DESC)
  WHERE patch_id IS NOT NULL;

CREATE INDEX match_players_hero_match_idx
  ON match_players (hero_id, match_id);

CREATE INDEX match_players_player_match_idx
  ON match_players (player_id, match_id)
  WHERE player_id IS NOT NULL;

CREATE INDEX draft_actions_hero_action_match_idx
  ON draft_actions (hero_id, action, match_id);
```

Порядок столбцов важен. Индекс `(patch_id, start_time)` подходит фильтру по patch и range времени. Он не всегда оптимален для запроса только по `start_time`.

## `EXPLAIN`

```sql
EXPLAIN
SELECT id, provider_match_id, start_time
FROM matches
WHERE patch_id = '7.XX'
ORDER BY start_time DESC
LIMIT 20;
```

План показывает `Seq Scan`, `Index Scan`, estimate rows и cost. На маленькой таблице sequential scan может быть правильнее; это не признак поломки.

`EXPLAIN ANALYZE` действительно выполняет запрос:

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT ...;
```

Не запускайте его бездумно на mutating/тяжёлом production запросе. Для `DELETE` он удалит строки, если не обернуть в rollback-транзакцию.

## Estimates и statistics

Planner опирается на statistics:

```sql
ANALYZE matches;
```

Autovacuum обычно делает это автоматически. После массовой лабораторной загрузки manual `ANALYZE` помогает получить реалистичный plan.

## Почему query может быть медленным

- читается слишком много строк;
- index не соответствует filter/order;
- типы параметров приводятся неудачно;
- join умножает строки;
- statistics устарели;
- `OFFSET` слишком глубок;
- возвращается слишком большой payload;
- блокировка ждёт другую транзакцию.

Индекс решает не все причины.

## JSONB indexes

GIN index полезен для определённых операторов `jsonb`, но тяжёл. Raw payload не должен становиться основой всех запросов. Сначала вынесите стабильные поля в columns.

## Практика

Сгенерируйте достаточно тестовых matches, сравните plan до/после `matches_patch_start_time_idx`. Запишите:

- фактическое число строк;
- chosen scan;
- execution time;
- buffers;
- почему на вашем объёме разница может быть маленькой.

## Самопроверка

- [ ] Индекс связан с конкретным запросом.
- [ ] Я не считаю `Seq Scan` автоматически плохим.
- [ ] Знаю, что `EXPLAIN ANALYZE` выполняет выражение.
- [ ] Pagination и размер ответа тоже влияют на скорость.
