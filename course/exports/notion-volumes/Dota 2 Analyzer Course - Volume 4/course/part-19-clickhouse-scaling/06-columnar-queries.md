# Глава 6. Колоночные запросы для Dota 2

## Цель

Научиться писать ограниченные аналитические запросы, измерять прочитанные строки и байты и превращать результат в безопасный HTTP-контракт.

## 1. Почему колонки помогают

Для отчёта об уроне нужны, например:

```text
patch_id, tournament_tier, event_type, source_hero_id, amount
```

Таблица содержит также match ID, parser version, target, tick и quality flags. Колоночный движок читает только выбранные колонки и хорошо сжимает повторяющиеся значения.

Это не означает, что любой SQL станет быстрым. Неограниченный диапазон, плохой sort key, огромная кардинальность `GROUP BY` и тяжёлый join всё равно исчерпают ресурсы.

## 2. Запрос 1: урон героев по патчу

```sql
SELECT
    source_hero_id AS hero_id,
    sum(toFloat64(ifNull(amount, 0))) AS total_damage,
    count() AS damage_events,
    uniqExact(match_id) AS matches
FROM analytics.replay_combat_events_v1
PREWHERE
    patch_id = {patch_id:String}
    AND tournament_tier = {tier:String}
    AND event_type = 'damage'
WHERE
    match_started_at >= {from:DateTime64(3)}
    AND match_started_at < {to:DateTime64(3)}
    AND source_hero_id IS NOT NULL
GROUP BY hero_id
HAVING matches >= {min_matches:UInt32}
ORDER BY total_damage DESC
LIMIT {limit:UInt16};
```

Обратите внимание:

- параметры типизированы, строки не склеиваются вручную;
- `PREWHERE` помогает сначала прочитать filter columns, но optimizer тоже может переносить условия — всегда измеряйте;
- интервал полуоткрытый `[from, to)`;
- `NULL` обрабатывается явно;
- denominator `matches` возвращается вместе с числом;
- `LIMIT` обязателен.

`uniqExact` точен, но может быть дороже approximate функций. Сначала определите контракт точности, затем benchmark.

## 3. Запрос 2: heatmap

Лучше нормализовать координаты в grid cell при утверждённом map transform. Учебный запрос для уже проверенных bounds:

```sql
SELECT
    greatest(0, least(31, intDiv(toInt32(x) + 8192, 512))) AS grid_x,
    greatest(0, least(31, intDiv(toInt32(y) + 8192, 512))) AS grid_y,
    count() AS samples,
    uniqExact(match_id) AS matches
FROM analytics.replay_position_samples_v1
PREWHERE
    patch_id = {patch_id:String}
    AND tournament_tier = {tier:String}
    AND hero_id = {hero_id:UInt16}
WHERE
    match_started_at >= {from:DateTime64(3)}
    AND match_started_at < {to:DateTime64(3)}
    AND is_alive
GROUP BY grid_x, grid_y
ORDER BY grid_y, grid_x;
```

Числа `-8192..8192` здесь лишь пример. Реальные bounds/transform берутся из versioned map config части 18. Если clamp скрывает invalid coordinates, до запроса data-quality pipeline должен отдельно считать out-of-range samples.

API возвращает не 100 миллионов samples, а максимум 1024 cells:

```ts
type HeatmapCell = {
  x: number;
  y: number;
  samples: string;
};

type HeatmapResponse = {
  gridSize: 32;
  matches: string;
  sampleIntervalMs: number;
  cells: HeatmapCell[];
  methodologyVersion: string;
  asOf: string;
};
```

Счётчики представлены строками, если они могут превысить безопасный JavaScript integer.

## 4. Запрос 3: teamfight summary

Если teamfight boundaries рассчитаны parser/aggregation job, храните небольшую fact table. Не пытайтесь на каждый mobile request заново sessionize весь combat log.

```sql
SELECT
    patch_id,
    quantileTDigest(0.5)(duration_seconds) AS p50_duration,
    quantileTDigest(0.9)(duration_seconds) AS p90_duration,
    avg(kills) AS avg_kills,
    count() AS teamfights
FROM analytics.teamfight_facts_v1
WHERE match_started_at >= {from:DateTime}
  AND match_started_at < {to:DateTime}
  AND tournament_tier = {tier:String}
GROUP BY patch_id
ORDER BY patch_id;
```

Approximate percentile algorithm должен быть указан в methodology. Не называйте его точной медианой без соответствующей гарантии.

## 5. Не используйте `SELECT *`

В колоночной базе стоимость чтения связана с выбранными columns. Запрос:

```sql
SELECT * FROM replay_combat_events_v1 ...
```

читает поля, которые API не использует, расширяет network payload и случайно раскрывает внутренний контракт.

Перечисляйте columns явно и преобразуйте row в domain result через runtime validation.

## 6. Query budget

Каждому endpoint задайте:

- максимальный диапазон дат;
- разрешённые tiers/patches;
- максимальный `LIMIT`;
- timeout;
- memory/rows/bytes budget;
- concurrency limit;
- cache policy;
- максимальную freshness;
- отказ для дорогой комбинации.

Например:

```text
heatmap:
  maxRangeDays = 180
  gridSize = 32 only
  timeout = 2 s
  maxConcurrent = 8
  resultCache = 15 min
```

Не позволяйте мобильному клиенту передать произвольный `GROUP BY`, SQL fragment или имя таблицы.

## 7. Query service

```ts
export class ClickHouseHeatmapAnalytics implements HeatmapAnalytics {
  constructor(private readonly client: ClickHouseClient) {}

  async getHeatmap(query: HeatmapQuery): Promise<HeatmapResult> {
    assertAllowedRange(query.from, query.to, 180);

    const result = await this.client.query({
      query: HEATMAP_SQL,
      query_params: toHeatmapParams(query),
      format: 'JSONEachRow',
    });

    const rows = await result.json<unknown[]>();
    return parseHeatmapRows(rows, query);
  }
}
```

Точные методы зависят от зафиксированной версии клиента. Важные границы:

- SQL — server-owned constant;
- user input только в typed parameters;
- response приходит как `unknown` и проверяется;
- timeout/error переводится в domain error;
- query ID/correlation ID добавляется для наблюдаемости.

## 8. Измерение запроса

Для каждого запроса сохраняйте:

- elapsed time;
- rows read;
- bytes read;
- result rows/bytes;
- peak memory;
- cache hit/miss;
- query fingerprint;
- scanned partitions/parts;
- error/timeout.

Используйте staging dataset и системные query logs. Не запускайте экспериментальный полный scan production в часы пик.

Сравнивайте cold/warm runs и concurrency: один быстрый запрос на пустом сервере не доказывает SLA.

## 9. Cardinality traps

Опасные запросы:

- `GROUP BY event_id` — почти одна группа на строку;
- `GROUP BY raw_ability_name` без нормализации;
- сортировка миллионов групп без `LIMIT`;
- `uniqExact` на огромном произвольном диапазоне;
- join двух гигантских event tables на request;
- функции над sort-key column, мешающие pruning, без проверки плана;
- весь исторический диапазон по умолчанию.

Если продукту нужен такой анализ, делайте offline job или pre-aggregation.

## 10. Проверка корректности

Скорость без истины бесполезна. Для небольшого golden dataset:

1. рассчитайте эталон в TypeScript/Python простым алгоритмом;
2. выполните ClickHouse query;
3. сравните exact counts;
4. для floating/approximate metrics задайте tolerance;
5. проверьте empty, one-match, null, invalid coordinate и correction cases;
6. сохраните methodology version.

## Практика

Реализуйте три bounded endpoints/queries:

1. hero damage leaders;
2. 32×32 position heatmap;
3. teamfight distribution из заранее построенной fact table.

Для каждого приложите query budget, benchmark и golden correctness test.

## Критерии готовности

- SQL параметризован;
- нет `SELECT *`;
- диапазон и result size ограничены;
- denominator/methodology/freshness возвращаются;
- approximate metric явно названа;
- rows/bytes/memory измеряются;
- response проходит runtime validation;
- arbitrary SQL недоступен клиенту;
- golden result совпадает с эталоном.

[Предыдущая глава](05-ingestion-idempotency.md) · [Оглавление части](README.md) · [Следующая глава](07-materialized-views-preaggregation.md)

