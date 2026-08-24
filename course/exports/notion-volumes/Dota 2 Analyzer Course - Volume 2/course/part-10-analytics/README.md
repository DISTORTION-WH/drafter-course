# Часть 10. Аналитика меты Dota 2

[← Часть 9. Ingestion](../part-09-data-ingestion/README.md) · [Карта курса](../01-course-map.md) · [Часть 11. React →](../part-11-react/README.md)

## Что мы строим

Backend выдаёт мету героев по одному patch и временному окну:

```http
GET /v1/meta/heroes?patch=7.XX&from=...&to=...&minPicks=10
```

Каждая строка содержит raw counters, rates, sample size, доверительный интервал, metric version и data freshness. Расчёт основан только на eligible профессиональных матчах с нужной полнотой.

## Главы

1. [Metric contract, grain и population](01-metric-contract-and-grain.md)
2. [Pick, ban, contest и win rate](02-core-hero-metrics.md)
3. [Patch, окно времени и фильтры](03-patch-windows-and-filters.md)
4. [Sample size, Wilson interval и shrinkage](04-sample-size-and-intervals.md)
5. [Корректные SQL-агрегации](05-sql-aggregations.md)
6. [Materialized views и refresh](06-materialized-views.md)
7. [REST endpoint меты](07-meta-api-endpoint.md)
8. [Cache, freshness и metric version](08-cache-freshness-versioning.md)
9. [Тестирование аналитики и data quality](09-analytics-testing.md)
10. [Итоговая лабораторная: `/v1/meta/heroes`](10-final-analytics-lab.md)

## Главный принцип

Формула без определения population и denominator неполна. До SQL для каждой метрики фиксируем:

- смысл одной строки результата;
- eligible dataset;
- event time и окно;
- denominator;
- missing/partial policy;
- version;
- точность/округление;
- минимальный sample;
- freshness.

## Результат части

```text
canonical facts
→ eligible match set
→ raw counters
→ versioned rates/intervals
→ materialized aggregate
→ cached `/v1/meta/heroes`
```

## Официальные справочники

- [PostgreSQL aggregate functions](https://www.postgresql.org/docs/18/functions-aggregate.html)
- [PostgreSQL materialized views](https://www.postgresql.org/docs/18/rules-materializedviews.html)
- [PostgreSQL `REFRESH MATERIALIZED VIEW`](https://www.postgresql.org/docs/18/sql-refreshmaterializedview.html)

Статистическая интерпретация в этой части предназначена для описательной аналитики продукта, а не для финансовых ставок или гарантии будущего результата.
