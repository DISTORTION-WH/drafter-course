# Глава 8. Cache, freshness и metric version

[← Глава 7](07-meta-api-endpoint.md) · [Оглавление](README.md) · [Глава 9 →](09-analytics-testing.md)

## Cache key — часть корректности

```text
analytics:hero-meta-core:1.0.0:
patch=7.XX:from=2026-07-01T00:00:00.000Z:
to=2026-07-16T00:00:00.000Z:league=all:team=all:
side=all:minPicks=10:sort=contestRateDesc:limit=50:
refresh=2026-07-16T00:05:00.000Z
```

Практически normalized filter JSON сортируется по keys и hash-ируется. Metric version и refresh generation обязательны. Тогда новый refresh естественно получает новый namespace, без массового delete.

## Что cache-ировать

- repository aggregate до presentation sort/limit;
- или готовый response для популярного filter.

MVP может cache готовый response на короткий TTL. Не cache exception как успешные данные.

## TTL и generation

TTL ограничивает память, но freshness определяется `computedAt/dataCutoff`, не возрастом Redis key. Если refresh раз в 5 минут, cache TTL 1 час допустим только при generation key: после refresh запрос использует новый key.

## Stampede

После refresh популярный key одновременно miss. Решения:

- single-flight lock на key;
- stale-while-revalidate;
- prewarm самых популярных filters;
- short distributed lock с timeout;
- request coalescing.

Если lock owner умер, TTL освобождает lock. Никогда не делайте вечный lock.

## Freshness states

```ts
type FreshnessStatus = 'fresh' | 'stale' | 'expired';
```

Thresholds идут из SLO/config:

- fresh → обычный response;
- stale → serve last good + metadata/warning, alert;
- expired → `503` или serve с сильным предупреждением по product policy.

Не называйте data live, если refresh batch.

## Metric versioning

Изменение, требующее version bump:

- новый eligibility/missing policy;
- исправление denominator bug;
- изменение patch mapping, влияющее на history;
- новая interval/ranking formula;
- изменение grain.

Добавление нового display label без изменения counters — обычно нет.

## Reproducibility

Чтобы воспроизвести response, нужны:

- normalized filters;
- metric version;
- data cutoff/refresh ID;
- canonical/raw lineage versions;
- code/schema version;
- effective mapping versions.

Public API не обязано отдавать всё, но internal audit хранит.

## Cache invalidation по late data

Generation после успешного refresh решает. Не публикуйте generation до завершения всех new aggregate rows. DB refresh metadata transaction/atomic switch определяет момент видимости.

## Практика

Тесты:

- одинаковые normalized filters → один key;
- иной order query params → тот же key;
- другой patch/minPicks/version/refresh → другой key;
- expired cache не маскирует expired analytics;
- cache value parser воспринимает Redis JSON как `unknown`.

## Самопроверка

- [ ] Cache key включает все влияющие входы.
- [ ] Refresh generation меняет namespace.
- [ ] Freshness берётся из analytics, не Redis TTL.
- [ ] Stampede имеет bounded lock/strategy.
- [ ] Metric definition change versioned.
