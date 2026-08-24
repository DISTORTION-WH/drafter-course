# Глава 4. Primary key, foreign key и ограничения

[← Глава 3](03-types-null-and-create-table.md) · [Оглавление](README.md) · [Глава 5 →](05-crud-and-filtering.md)

## Ограничение защищает данные от любого кода

Validation в TypeScript улучшает сообщение пользователю. Constraint в PostgreSQL сохраняет инвариант даже при ошибке worker, ручном SQL или втором сервисе. Нужны оба слоя.

## Таблица участников

```sql
CREATE TABLE match_players (
  match_id bigint NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  slot smallint NOT NULL,
  player_id bigint REFERENCES players(id) ON DELETE SET NULL,
  hero_id integer NOT NULL REFERENCES heroes(id),
  side text NOT NULL,
  kills smallint NOT NULL,
  deaths smallint NOT NULL,
  assists smallint NOT NULL,
  gold_per_min integer,
  xp_per_min integer,
  is_winner boolean NOT NULL,
  PRIMARY KEY (match_id, slot),
  CONSTRAINT match_players_slot_range CHECK (slot BETWEEN 0 AND 9),
  CONSTRAINT match_players_side_values CHECK (side IN ('radiant', 'dire')),
  CONSTRAINT match_players_counters_non_negative CHECK (
    kills >= 0 AND deaths >= 0 AND assists >= 0
  ),
  CONSTRAINT match_players_gpm_non_negative CHECK (
    gold_per_min IS NULL OR gold_per_min >= 0
  ),
  CONSTRAINT match_players_xpm_non_negative CHECK (
    xp_per_min IS NULL OR xp_per_min >= 0
  )
);
```

Composite primary key означает: slot уникален внутри матча, но slot `0` существует в каждом матче.

## Anonymous player

`player_id` nullable, потому что источник может скрывать account. Но строка участия всё равно существует и идентифицируется `(match_id, slot)`. Не создавайте одного фальшивого игрока «Unknown» для всех: это ложно объединит разных людей.

## Draft actions

```sql
CREATE TABLE draft_actions (
  match_id bigint NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sequence smallint NOT NULL,
  action text NOT NULL,
  side text NOT NULL,
  hero_id integer NOT NULL REFERENCES heroes(id),
  PRIMARY KEY (match_id, sequence),
  CONSTRAINT draft_actions_action_values CHECK (action IN ('pick', 'ban')),
  CONSTRAINT draft_actions_side_values CHECK (side IN ('radiant', 'dire')),
  CONSTRAINT draft_actions_sequence_non_negative CHECK (sequence >= 0)
);
```

Sequence — порядок provider после нормализации. Не полагайтесь на порядок строк без `ORDER BY sequence`.

## Действия при удалении

- `CASCADE` для дочерних фактов матча: удалён матч — удалены его участники/draft.
- `SET NULL` для player: удаление/слияние профиля не должно уничтожать факт участия.
- default `RESTRICT/NO ACTION` для hero: нельзя удалить героя, пока на него ссылаются факты; пометьте `is_active=false`.

Выбор `ON DELETE` — бизнес-решение, не косметика.

## `UNIQUE` и `NULL`

Обычный `UNIQUE` может допустить несколько `NULL`, потому что неизвестные значения не считаются равными. Если нужна иная семантика, используйте `NULLS NOT DISTINCT` в PostgreSQL или partial indexes — осознанно.

## Enum или `CHECK`

Для маленького учебного набора `CHECK (side IN (...))` проще мигрировать. PostgreSQL enum полезен, но удаление/переименование значений требует особого плана. В TypeScript всё равно создайте union `'radiant' | 'dire'`.

## Проверки нескольких строк

Constraint одной строки не гарантирует «в матче ровно 10 участников» во время постепенной вставки. Для этого подходят:

- транзакционная проверка завершения ingestion;
- состояние `ingestion_status`;
- deferred constraint/trigger для специальных случаев;
- data quality query.

Не пытайтесь запихнуть любой бизнес-процесс в простой `CHECK`.

## Практика

Попробуйте:

1. participant с несуществующим match;
2. два participant в одном slot;
3. `side='middle'`;
4. draft для несуществующего hero;
5. удалить match и проверить дочерние строки.

## Самопроверка

- [ ] Каждый foreign key имеет осмысленное delete behavior.
- [ ] Composite key соответствует identity участия/action.
- [ ] Anonymous не становится общим фальшивым player.
- [ ] Порядок всегда задаётся столбцом и `ORDER BY`.
