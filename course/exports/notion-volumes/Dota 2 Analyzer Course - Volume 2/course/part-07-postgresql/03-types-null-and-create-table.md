# Глава 3. Типы, UTC, `NULL` и создание таблиц

[← Глава 2](02-local-postgres-and-psql.md) · [Оглавление](README.md) · [Глава 4 →](04-keys-constraints-relations.md)

## Тип столбца — ограничение данных

Основные типы схемы:

- `smallint` — маленькие целые, например slot/sequence;
- `integer` — hero IDs, duration, kills;
- `bigint` — 64-bit integer;
- `text` — строки переменной длины;
- `boolean` — true/false;
- `timestamptz` — момент времени;
- `date` — календарная дата без времени;
- `jsonb` — JSON, когда структура действительно переменная;
- `numeric` — точная десятичная величина, не нужен для большинства игровых counters.

## `NULL` — неизвестно/отсутствует

`NULL` не равен `0`, `''` и даже другому `NULL`.

```sql
SELECT NULL = NULL;        -- NULL, не true
SELECT NULL IS NULL;       -- true
```

Фильтровать нужно `IS NULL` / `IS NOT NULL`.

Если поле обязательно по смыслу, задайте `NOT NULL`. Не разрешайте `NULL` «на всякий случай».

## Создаём справочники

```sql
CREATE TABLE heroes (
  id integer PRIMARY KEY,
  machine_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE players (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  display_name text,
  country_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT players_country_code_format
    CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$')
);

CREATE TABLE teams (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  tag text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

`GENERATED ALWAYS AS IDENTITY` просит PostgreSQL назначить внутренний ID. Это современнее неявного `serial`.

## Матчи

```sql
CREATE TABLE matches (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider text NOT NULL,
  provider_match_id text NOT NULL,
  start_time timestamptz NOT NULL,
  duration_seconds integer NOT NULL,
  radiant_win boolean NOT NULL,
  patch_id text,
  league_id text,
  radiant_team_id bigint REFERENCES teams(id),
  dire_team_id bigint REFERENCES teams(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matches_duration_non_negative CHECK (duration_seconds >= 0),
  CONSTRAINT matches_provider_identity UNIQUE (provider, provider_match_id),
  CONSTRAINT matches_distinct_teams CHECK (
    radiant_team_id IS NULL
    OR dire_team_id IS NULL
    OR radiant_team_id <> dire_team_id
  )
);
```

`provider_match_id` — `text`: это identity, а не число для вычислений. `provider + ID` уникальны вместе.

## Время

Вставляйте ISO 8601 с offset:

```sql
INSERT INTO matches (
  provider, provider_match_id, start_time, duration_seconds, radiant_win
) VALUES (
  'opendota', '8000000000', '2026-07-16T12:00:00Z', 2345, true
);
```

Не вставляйте локальное `2026-07-16 12:00:00` без offset: смысл зависит от session timezone.

## Когда использовать `jsonb`

`jsonb` полезен для raw envelope metadata или редких provider-specific extras. Не прячьте в нём hero ID, start time и winner, если по ним будут JOIN/filter/constraints.

## Практика

Создайте таблицы в временной database, затем выполните `\d matches`. Попробуйте вставить duration `-1`, одинаковый provider identity и одну team на обе стороны. Запишите текст каждой ошибки и ограничение, которое сработало.

## Самопроверка

- [ ] `timestamptz` используется для момента времени.
- [ ] Duration имеет единицу в имени и `CHECK`.
- [ ] External ID не превращён без причины в primary key.
- [ ] Часто запрашиваемые поля не спрятаны в `jsonb`.
