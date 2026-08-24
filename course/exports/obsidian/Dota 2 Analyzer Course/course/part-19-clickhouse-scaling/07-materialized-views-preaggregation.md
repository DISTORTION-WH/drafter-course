# Глава 7. Materialized Views и предварительные агрегаты

## Цель

Убрать повторное сканирование raw events с пользовательского пути и понять две разные модели: incremental materialized view и периодически обновляемый полный расчёт.

## 1. Зачем предварительный агрегат

Heatmap по одному матчу может быть дешёвым. Heatmap «все tier-1 матчи героя за патч» читает сотни миллионов samples при каждом запросе.

Вместо этого ingestion path заранее обновляет таблицу:

```text
patch + tier + hero + grid_x + grid_y
-> samples
-> matches state
```

Request читает 1024 строки, а не raw history.

Цена:

- дополнительное место;
- задержка обновления;
- сложнее corrections;
- versioned methodology;
- отдельный backfill.

## 2. Incremental Materialized View

В ClickHouse incremental materialized view выполняет запрос **для вставляемого блока** source table и пишет результат в target. Она не перечитывает всю историю после каждого insert.

Target для aggregate states:

```sql
CREATE TABLE analytics.hero_damage_by_patch_v1
(
    patch_id LowCardinality(String),
    tournament_tier LowCardinality(String),
    source_hero_id UInt16,
    damage_state AggregateFunction(sum, Float64),
    matches_state AggregateFunction(uniq, UInt64),
    events_state AggregateFunction(count)
)
ENGINE = AggregatingMergeTree
ORDER BY (patch_id, tournament_tier, source_hero_id);
```

View:

```sql
CREATE MATERIALIZED VIEW analytics.hero_damage_by_patch_mv_v1
TO analytics.hero_damage_by_patch_v1
AS
SELECT
    patch_id,
    tournament_tier,
    assumeNotNull(source_hero_id) AS source_hero_id,
    sumState(toFloat64(ifNull(amount, 0))) AS damage_state,
    uniqState(match_id) AS matches_state,
    countState() AS events_state
FROM analytics.replay_combat_events_v1
WHERE event_type = 'damage'
  AND source_hero_id IS NOT NULL
GROUP BY
    patch_id,
    tournament_tier,
    source_hero_id;
```

Чтение:

```sql
SELECT
    source_hero_id,
    sumMerge(damage_state) AS total_damage,
    uniqMerge(matches_state) AS matches,
    countMerge(events_state) AS events
FROM analytics.hero_damage_by_patch_v1
WHERE patch_id = {patch_id:String}
  AND tournament_tier = {tier:String}
GROUP BY source_hero_id
ORDER BY total_damage DESC
LIMIT 30;
```

Aggregate state/merge functions должны соответствовать друг другу. Это обязательно покрывается integration test на выбранной версии.

## 3. Почему view не backfill'ит старые строки

Если raw table уже содержит январь–июнь, а view создана в июле, она увидит только новые inserts после создания. Историю надо заполнить отдельно.

Опасный путь:

```text
создать MV на live table
одновременно backfill all history
продолжать inserts
```

Можно дважды учесть строки на границе.

Безопасная учебная процедура:

1. остановить/поставить на checkpoint конкретный loader;
2. зафиксировать source boundary;
3. создать пустой versioned target;
4. выполнить исторический `INSERT INTO target SELECT ...State ... GROUP BY` до boundary;
5. создать MV;
6. возобновить loader после boundary;
7. reconcile raw versus aggregate;
8. shadow read;
9. переключить API.

Для системы без паузы нужна более сложная dual-stream процедура с непересекающимися диапазонами. Она проектируется отдельно, а не импровизируется во время deployment.

Не используйте `POPULATE` вслепую на live ingestion: проверьте актуальные гарантии и окно гонки.

## 4. Heatmap aggregate

Если grid transform стабилен и versioned, target может быть:

```sql
CREATE TABLE analytics.hero_position_heatmap_v1
(
    patch_id LowCardinality(String),
    tournament_tier LowCardinality(String),
    hero_id UInt16,
    map_config_version UInt16,
    grid_size UInt8,
    grid_x UInt8,
    grid_y UInt8,
    samples_state AggregateFunction(count),
    matches_state AggregateFunction(uniq, UInt64)
)
ENGINE = AggregatingMergeTree
PARTITION BY patch_id
ORDER BY
(
    patch_id,
    tournament_tier,
    hero_id,
    map_config_version,
    grid_size,
    grid_y,
    grid_x
);
```

Здесь `PARTITION BY patch_id` может быть оправдан, только если число живых patch IDs невелико, correction/drop делается по патчу и benchmark подтверждает размер partitions. Это не общее правило для raw events.

View записывает `countState()` в `samples_state`, а запрос читает `countMerge(samples_state)`. Если нужны только простые аддитивные счётчики, можно отдельно проверить схему на `SummingMergeTree`. Не смешивайте engine и columns без понимания merge semantics.

## 5. SummingMergeTree против AggregatingMergeTree

**SummingMergeTree** удобен для простых аддитивных чисел:

```text
damage += damage
samples += samples
events += events
```

**AggregatingMergeTree** нужен для aggregate states:

- distinct counts;
- quantiles;
- averages как state;
- более сложные функции.

Даже если фоновые merges ещё не объединили строки, запрос обязан делать `sum(...)` или `...Merge(...)` по ключу. Нельзя считать, что target физически содержит ровно одну строку на группу.

## 6. Refreshable Materialized View

Другой вид — refreshable view: по расписанию выполняется полный запрос и заменяет/добавляет результат согласно конфигурации. Она подходит, когда:

- dataset умеренный;
- расчёт использует сложные joins;
- dimension corrections должны регулярно полностью учитываться;
- допустима периодическая freshness;
- incremental transform неудобен.

Пример применения: nightly tournament/team snapshot, а не каждое combat event.

Incremental и refreshable модели решают разные задачи. Перед выбором укажите:

```text
update trigger
source range
freshness
correction behavior
compute cost
atomic publish behavior
```

Актуальную механику сверяйте с официальным разделом [Materialized Views](https://clickhouse.com/docs/materialized-view).

## 7. Corrections

Допустим, parser v1 ошибочно удвоил damage одного матча. Простая incremental MV уже прибавила ошибку. Append новой исправленной строки добавит ещё одно значение, а не вычтет старое.

Варианты:

- rebuild целой небольшой target table;
- rebuild затронутой partition;
- хранить signed correction deltas;
- versioned facts с query-time latest logic;
- публиковать новый aggregate version и переключать pointer.

Для первой реализации наиболее понятен versioned rebuild:

```text
hero_damage_by_patch_v1_bad
hero_damage_by_patch_v2_shadow
-> validate
-> API flag -> v2
-> keep v1 during rollback window
```

## 8. Dimensions меняются

Materialized view с join к dimension table обычно видит состояние dimension на момент вставки source block. Последующее переименование/переклассификация не обязательно автоматически пересчитает старый aggregate.

Поэтому:

- предпочитайте стабильные IDs;
- копируйте time-valid dimension snapshot в source event;
- версионируйте классификацию tournament tier;
- для исправлений запускайте targeted rebuild;
- документируйте `as-of` semantics.

## 9. Проверка агрегата

Для каждого target:

1. raw exact query на малом диапазоне;
2. aggregate query;
3. сравнение group keys;
4. exact integer totals;
5. tolerance для approximate functions;
6. empty groups;
7. duplicate-delivery test;
8. correction/rebuild test;
9. new dimension value;
10. freshness lag.

Периодический audit выбирает случайные patch/tier/hero группы и пересчитывает их из raw.

## 10. Называйте методологию

Название таблицы включает версию, но пользователю нужна смысловая версия:

```json
{
  "methodology": {
    "version": "hero-heatmap-v2",
    "gridSize": 32,
    "aliveOnly": true,
    "samplingIntervalMs": 1000,
    "matchEligibility": "completed-pro-v3"
  }
}
```

Изменение sampling, eligibility или grid transform создаёт новую методологию, даже если SQL table schema не изменилась.

## Практика

1. Создайте incremental aggregate для hero damage.
2. Backfill'ните фиксированный historical cutoff.
3. Вставьте новые rows через source и подтвердите обновление view.
4. Сравните raw и aggregate totals.
5. Повторите transport batch и проверьте dedup policy.
6. Смоделируйте correction одного матча.
7. Запишите runbook versioned rebuild.

## Критерии готовности

- выбрана incremental или refreshable модель осознанно;
- target engine соответствует aggregate columns;
- старые данные backfill'ятся отдельной процедурой;
- live boundary не создаёт двойной учёт;
- запрос использует merge functions;
- correction/rebuild проверен;
- dimension snapshots имеют semantics;
- raw-versus-aggregate audit автоматизирован;
- API возвращает methodology и freshness.

[Предыдущая глава](06-columnar-queries.md) · [Оглавление части](README.md) · [Следующая глава](08-migration-dual-read.md)
