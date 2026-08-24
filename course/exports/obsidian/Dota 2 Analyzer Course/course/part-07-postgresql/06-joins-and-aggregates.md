# Глава 6. `JOIN`, `GROUP BY` и агрегаты

[← Глава 5](05-crud-and-filtering.md) · [Оглавление](README.md) · [Глава 7 →](07-indexes-and-explain.md)

## `JOIN` восстанавливает связь

Получим участников матча с именами:

```sql
SELECT
  mp.slot,
  mp.side,
  p.display_name AS player_name,
  h.display_name AS hero_name,
  mp.kills,
  mp.deaths,
  mp.assists
FROM match_players AS mp
LEFT JOIN players AS p ON p.id = mp.player_id
JOIN heroes AS h ON h.id = mp.hero_id
WHERE mp.match_id = $1
ORDER BY mp.slot;
```

`JOIN`/`INNER JOIN` оставляет только совпадения. `LEFT JOIN` сохраняет строку слева, даже если player неизвестен. Поэтому player name может быть `NULL`.

## Ошибка Cartesian product

`JOIN` без правильного `ON` умножает строки. Перед запросом сформулируйте связь обычным языком: «hero строки mp — это hero, чей `h.id = mp.hero_id`».

## Агрегаты

```sql
SELECT
  h.id AS hero_id,
  h.display_name,
  COUNT(*) AS games,
  COUNT(*) FILTER (WHERE mp.is_winner) AS wins,
  AVG(mp.kills) AS average_kills
FROM match_players AS mp
JOIN heroes AS h ON h.id = mp.hero_id
JOIN matches AS m ON m.id = mp.match_id
WHERE m.start_time >= $1
  AND m.start_time < $2
GROUP BY h.id, h.display_name
ORDER BY games DESC, h.id;
```

Все неагрегированные selected columns должны входить в `GROUP BY` или функционально зависеть по правилам PostgreSQL. Для ясности перечисляем их.

## `WHERE` и `HAVING`

- `WHERE` фильтрует исходные строки до группировки;
- `HAVING` фильтрует группы после агрегатов.

```sql
GROUP BY h.id, h.display_name
HAVING COUNT(*) >= 20
```

## Деление без integer truncation

```sql
COUNT(*) FILTER (WHERE mp.is_winner)::numeric / NULLIF(COUNT(*), 0)
```

`NULLIF(count, 0)` защищает от division by zero. Cast в `numeric` гарантирует дробный результат. Умножать на 100 лучше на presentation layer, а API может вернуть ratio `0..1`.

## CTE для читаемости

```sql
WITH filtered_matches AS (
  SELECT id
  FROM matches
  WHERE patch_id = $1
    AND start_time >= $2
    AND start_time < $3
)
SELECT mp.hero_id, COUNT(*) AS games
FROM match_players AS mp
JOIN filtered_matches AS fm ON fm.id = mp.match_id
GROUP BY mp.hero_id;
```

CTE именует промежуточное множество. Это не обязательно быстрее; цель сначала — корректность и читаемость, затем `EXPLAIN`.

## Дубли после нескольких JOIN

Если к participant присоединить все draft actions того же match, каждая participant-строка умножится на число actions. Агрегируйте каждую grain отдельно, затем соединяйте результаты.

`grain` отвечает: что означает одна строка? Для `match_players` — один slot одного match. Для hero metrics — один hero в одном наборе фильтров.

## Практика

Напишите запросы:

1. все участники матча;
2. число matches по patch;
3. games/wins героя за период;
4. heroes минимум с 2 games;
5. anonymous participants через `player_id IS NULL`.

Для каждого запишите grain результата.

## Самопроверка

- [ ] Я выбираю `LEFT JOIN`, когда отсутствие справочника допустимо.
- [ ] Я понимаю разницу `WHERE` и `HAVING`.
- [ ] Ratio не использует случайное integer division.
- [ ] Я проверяю умножение строк после JOIN.
