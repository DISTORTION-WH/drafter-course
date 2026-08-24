# Глава 3. Контракт и схема аналитических событий

## Цель

Спроектировать узкие, версионируемые таблицы combat и position events. Вы поймёте, почему одна огромная nullable-таблица мешает аналитике, как задаётся идентичность события и какие типы ClickHouse выбирать осознанно.

## 1. Сначала контракт, потом `CREATE TABLE`

Parser output уже имеет schema version. Loader не должен угадывать смысл JSON-полей. Опишите событие независимо от базы:

```ts
export type CombatEventV1 = {
  schemaVersion: 1;
  parserVersion: string;
  matchId: string;
  matchStartedAt: string;
  eventTimeMs: number;
  tick: number;
  sequence: number;
  eventType: 'damage' | 'heal' | 'death';
  sourceHeroId: number | null;
  targetHeroId: number | null;
  sourcePlayerSlot: number | null;
  targetPlayerSlot: number | null;
  amount: number | null;
  patchId: string;
  tournamentTier: 'qualifier' | 'tier_3' | 'tier_2' | 'tier_1';
};
```

Каждое поле обязано иметь:

- единицу измерения;
- допустимый диапазон;
- смысл `null`;
- момент доступности;
- правило преобразования;
- версию, в которой появилось.

Например, `eventTimeMs` — миллисекунды от начала replay timeline, а не Unix timestamp. В ClickHouse можно сохранить и относительное время, и абсолютный `event_time`, вычисленный после проверки начала матча.

## 2. Детерминированная идентичность

ClickHouse primary key не является уникальным ограничением. Поэтому идентичность события создаётся до вставки:

```text
event_id = hash(
  match_id,
  parser_output_id,
  stream_name,
  tick,
  sequence,
  normalized_event_type
)
```

Требования:

- повторный parse того же immutable output даёт те же IDs;
- новый parser output получает новый `parser_output_id`;
- порядок обхода map/set не должен случайно менять `sequence`;
- hash algorithm и canonical encoding входят в контракт;
- collision рассматривается как data-quality incident.

Можно хранить `event_id` как `UUID`, `FixedString(32)` для hex или числовой hash, но внешний API не должен зависеть от внутреннего формата.

## 3. Не смешивайте разные формы данных

Combat event обычно разреженный по некоторым полям, но position sample имеет другую частоту и запросы:

```text
combat: match/tick/type/source/target/amount
position: match/tick/player/hero/x/y/alive
```

Создайте две таблицы:

- `replay_combat_events_v1`;
- `replay_position_samples_v1`.

Почему не `replay_all_events` с 70 nullable columns:

- читается больше metadata;
- ключ сортировки не подходит всем workload;
- смысл `null` становится неоднозначным;
- position retention обычно короче;
- разные sampling/version policies;
- миграции одной категории затрагивают другую.

## 4. Пример combat-таблицы

Это учебный starting point, а не универсально идеальная схема:

```sql
CREATE TABLE analytics.replay_combat_events_v1
(
    event_id UUID,
    match_id UInt64,
    parser_output_id UUID,
    parser_version LowCardinality(String),
    schema_version UInt16,

    match_started_at DateTime64(3, 'UTC'),
    event_time DateTime64(3, 'UTC'),
    tick UInt32,
    sequence UInt32,

    patch_id LowCardinality(String),
    tournament_tier LowCardinality(String),
    event_type LowCardinality(String),

    source_player_slot Nullable(UInt8),
    target_player_slot Nullable(UInt8),
    source_hero_id Nullable(UInt16),
    target_hero_id Nullable(UInt16),
    amount Nullable(Float32),

    quality_flags Array(LowCardinality(String)),
    ingested_at DateTime64(3, 'UTC') DEFAULT now64(3)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(match_started_at)
ORDER BY
(
    patch_id,
    tournament_tier,
    event_type,
    match_started_at,
    match_id,
    tick,
    sequence
);
```

В следующей главе мы проверим `ORDER BY` против реальных запросов. Не копируйте его слепо.

## 5. Выбор типов

### Числа

Используйте наименьший тип, который **гарантированно** вмещает контракт, но не экономьте ценой переполнения.

- `UInt64` подходит внутреннему числовому Dota match ID;
- во внешнем JavaScript API match ID остаётся строкой, потому что не все 64-битные целые безопасно представлены как `number`;
- `UInt16` допустим для hero ID, пока domain validation подтверждает диапазон;
- `Float32` может быть достаточен для игровых величин, но денежные/точные показатели требуют отдельного решения.

### Время

`DateTime64(3, 'UTC')` хранит миллисекунды и явный UTC. Не используйте локальный timezone сервера как предметное значение.

### `LowCardinality(String)`

Полезен для повторяющихся строк с умеренным числом значений: `event_type`, `patch_id`, `parser_version`. Не назначайте его неизвестному высококардинальному тексту без измерения.

### `Nullable`

`null` должен означать «неприменимо/неизвестно», а не «разработчик забыл заполнить». Если отсутствие можно представить отдельным event type или sentinel без потери смысла, сравните обе модели benchmark'ом.

### Enum

ClickHouse `Enum` компактен, но изменение набора значений связывает producer и schema migration. Для развивающегося parser contract строка с runtime validation часто безопаснее.

## 6. Position samples

```sql
CREATE TABLE analytics.replay_position_samples_v1
(
    sample_id UUID,
    match_id UInt64,
    parser_output_id UUID,
    parser_version LowCardinality(String),
    schema_version UInt16,
    match_started_at DateTime64(3, 'UTC'),
    sample_time DateTime64(3, 'UTC'),
    tick UInt32,
    player_slot UInt8,
    hero_id UInt16,
    x Int16,
    y Int16,
    is_alive Bool,
    patch_id LowCardinality(String),
    tournament_tier LowCardinality(String),
    sample_interval_ms UInt32,
    ingested_at DateTime64(3, 'UTC') DEFAULT now64(3)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(match_started_at)
ORDER BY
(
    patch_id,
    tournament_tier,
    hero_id,
    match_started_at,
    match_id,
    player_slot,
    tick
);
```

Raw world coordinates сохраняются только если они разрешены и нужны. Для публичного API лучше отдавать нормализованные bins/aggregates.

## 7. Денормализация dimensions

В событие удобно скопировать `patch_id` и `tournament_tier`, потому что они часто фильтруют запросы. Это производные snapshots.

Запишите:

- из какого canonical record взято значение;
- на какой момент;
- что делать при correction;
- входит ли dimension version в export batch;
- надо ли перестроить затронутую партицию.

Не копируйте в event каждое название игрока/команды. Имена меняются, имеют высокую кардинальность и не нужны большинству сканирований. Возвращаемые IDs можно обогатить небольшим PostgreSQL-запросом на уровне API.

## 8. Retention и приватность

Таблицы аналитики не должны содержать:

- session tokens;
- email/Steam private profile data;
- push tokens;
- IP-адреса пользователей;
- signed object URLs;
- replay chat/voice без отдельного правового основания.

У raw events и aggregates может быть разный retention:

```text
position samples: 180 days
combat events: 2 years
heatmap aggregates: long-lived
```

TTL — только механизм исполнения согласованной политики. Перед удалением raw проверьте, что aggregates воспроизводимы или потеря точной пересборки принята явно.

## 9. Эволюция схемы

Для несовместимого изменения безопаснее новая таблица:

```text
replay_combat_events_v1
replay_combat_events_v2
```

Путь:

1. schema/contract v2 опубликован;
2. loader понимает v1 и v2 либо отклоняет неизвестное;
3. v2 таблица заполняется shadow;
4. агрегаты сравниваются;
5. API переключается;
6. v1 удаляется после retention/rollback window.

`ALTER TABLE ADD COLUMN` подходит совместимому добавлению, но не заменяет version policy.

## 10. Data-quality constraints вне unique key

Loader проверяет до вставки:

- schema version поддерживается;
- `match_id` совпадает с manifest;
- tick и sequence не отрицательны;
- координаты внутри ожидаемого диапазона;
- timestamp не выходит далеко за match bounds;
- hero/player slots известны или явно marked unknown;
- сумма строк совпадает с manifest counts;
- checksum artifact подтверждён.

После вставки reconciliation проверяет counts, min/max time, уникальные event IDs на sample и долю quality flags.

## Практика

1. Напишите JSON Schema или Zod contract combat event v1.
2. Добавьте словарь полей с единицами и `null` semantics.
3. Спроектируйте отдельную position table.
4. Определите deterministic event ID.
5. Составьте correction и retention policy.
6. Сгенерируйте 1 000 событий и подтвердите, что повторная генерация даёт те же IDs.

## Критерии готовности

- combat и positions разделены;
- у всех полей определены смысл и единицы;
- ID детерминирован и не зависит от порядка коллекций;
- match ID не теряет точность в JavaScript;
- timestamps сохраняются в UTC;
- parser/schema/output versions присутствуют;
- copied dimensions имеют correction policy;
- PII и секреты отсутствуют;
- неизвестная версия отклоняется контролируемо.

[Предыдущая глава](02-oltp-olap-boundary.md) · [Оглавление части](README.md) · [Следующая глава](04-mergetree-order-partition.md)
