# Глава 6. Materialized views и refresh

[← Глава 5](05-sql-aggregations.md) · [Оглавление](README.md) · [Глава 7 →](07-meta-api-endpoint.md)

## View и materialized view

Обычный view хранит query, но вычисляет при чтении. Materialized view хранит результат на момент refresh. Для часто читаемой меты это уменьшает latency и нагрузку.

Цена: данные не мгновенные, refresh надо планировать/наблюдать.

## Выбираем grain materialization

Не materialize один «текущий экран» с arbitrary from/to. Полезный базовый grain:

```text
patch × UTC day × hero
```

Endpoint суммирует daily counters для окон по целым дням. Для intraday нужен hourly bucket или direct recent delta. Сначала MVP с daily/hourly согласно freshness SLO.

## Counts, не rates

Materialize additive counters:

```text
eligible_drafts, picks, bans, games, wins
```

Rate окна вычисляется после `SUM`: `SUM(wins)/SUM(games)`. Нельзя усреднять daily win rates без weighting.

## Пример

```sql
CREATE MATERIALIZED VIEW hero_meta_daily_v1 AS
WITH eligible AS (
  SELECT
    m.id,
    m.patch_id,
    date_trunc('day', m.start_time AT TIME ZONE 'UTC')::date AS day_utc,
    m.has_complete_draft,
    m.has_complete_participants
  FROM matches m
  WHERE m.is_professional = true
    AND m.is_quarantined = false
    AND m.patch_id IS NOT NULL
)
-- Здесь объедините отдельно рассчитанные denominators/actions/results.
SELECT ...;
```

Не копируйте `SELECT ...`: перенесите проверенный запрос главы 5 и сохраните одну строку на `(patch_id, day_utc, hero_id)`.

## Unique index

```sql
CREATE UNIQUE INDEX hero_meta_daily_v1_identity_idx
  ON hero_meta_daily_v1 (patch_id, day_utc, hero_id);
```

Он также нужен PostgreSQL для `REFRESH MATERIALIZED VIEW CONCURRENTLY` при условиях официальной документации.

## Refresh

```sql
REFRESH MATERIALIZED VIEW hero_meta_daily_v1;
```

После первоначального заполнения и unique index:

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY hero_meta_daily_v1;
```

Concurrent refresh позволяет читать старые данные во время refresh, но требует больше работы и имеет ограничения. Он не может работать, пока view не заполнен, и не заменяет monitoring. Следуйте документации PostgreSQL 18.

## Refresh state

```sql
CREATE TABLE analytics_refreshes (
  metric_id text NOT NULL,
  metric_version text NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  data_cutoff timestamptz,
  status text NOT NULL,
  error_code text,
  PRIMARY KEY (metric_id, metric_version, started_at)
);
```

Endpoint использует последний успешный completed refresh. Failure не удаляет предыдущий результат, но freshness растёт и alert срабатывает.

## Late-arriving data

Full refresh корректно подхватывает историю, но становится дорогим. Следующий шаг — aggregate table с recompute affected buckets (например последние 7 дней + buckets затронутых late matches). Делайте после измерения.

## Deployment

Новая metric version создаёт новую view/table рядом со старой:

```text
hero_meta_daily_v1
hero_meta_daily_v2
```

Backfill v2, verify, переключить service, затем позже удалить v1 migration. Это expand/contract для аналитики.

## Практика

Создайте materialized view, unique index, выполните refresh, добавьте поздний match и докажите: до refresh metric старая, после refresh обновилась; metadata показывает новый cutoff.

## Самопроверка

- [ ] Materialized counts additive, rates рассчитываются после SUM.
- [ ] Grain/identity unique.
- [ ] Endpoint знает время последнего успешного refresh.
- [ ] Late data policy определена.
- [ ] Новая metric version может жить рядом со старой.
