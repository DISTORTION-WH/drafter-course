# Глава 9. Качество данных и наблюдаемость

[← Глава 8](08-discovery-backfill-reconciliation.md) · [Оглавление](README.md) · [Глава 10 →](10-final-ingestion-lab.md)

## Успешный job не гарантирует правильные данные

Нужно измерять transport, pipeline и dataset.

## Метрики pipeline

- queue waiting/active/delayed/failed;
- oldest waiting job age;
- job duration by stage;
- success/retry/quarantine rate;
- provider requests/status/latency;
- DB transaction latency/conflicts;
- raw storage errors/bytes;
- live ingestion lag.

High-cardinality match ID нельзя делать label метрики. Он остаётся в structured log/trace.

## Метрики качества

- matches discovered vs complete;
- participant count distribution;
- fraction missing draft/patch/team/player;
- duplicate identity attempts;
- unknown hero/patch mappings;
- provider-to-canonical validation failures by code;
- freshness by league/tournament;
- number of rows on old parser version.

## Structured job log

```json
{
  "event": "ingestion_stage_completed",
  "jobId": "opendota-match-8000000000",
  "provider": "opendota",
  "resourceType": "match",
  "resourceId": "8000000000",
  "stage": "normalize",
  "durationMs": 12,
  "rawHashPrefix": "a13f...",
  "parserVersion": "opendota-match@1.2.0",
  "warningCount": 1
}
```

Raw hash можно сокращать в log, полный хранить в manifest. Не logируйте payload.

## Trace/context

HTTP request ID не всегда есть у scheduled job. Создайте job ID/run ID, передавайте в stages и outbox events. Для provider call запишите safe endpoint template, attempt и status.

## Data quality checks

Checks имеют severity:

- fatal: invalid identity, duplicate slot, невозможный type;
- quarantine: contract drift, checksum mismatch;
- warning: unknown optional mapping, missing team;
- informational: rare duration/outlier.

Не отбрасывайте редкий долгий match только потому, что он статистический outlier. Сначала provenance/review.

## Freshness definition

Несколько времён:

- event time — match started/ended;
- provider time — если доступно;
- retrieved time;
- normalized time;
- published/materialized time.

`dataFreshnessSeconds = now - latest expected event represented` зависит от stream. Не подменяйте её временем последнего успешного health check.

## Alerts

Хороший alert связан с действием:

- live lag > threshold N minutes → проверить provider/queue/worker;
- quarantine rate резко вырос → вероятен contract drift;
- queue oldest age растёт → снизить discovery/увеличить capacity в budget;
- no matches for active tournament → проверить stream;
- raw save failures → остановить normalization, не терять provenance.

Thresholds определяются baseline и SLO, а не случайными числами из курса.

## Dashboard

Покажите flow:

```text
discovered → fetched → raw_saved → normalized → persisted → complete
```

Для каждого — rate, errors, latency, backlog. Тогда видно, где сужение.

## Практика

Создайте 5 controlled failures и убедитесь, что по metrics/logs можно определить stage/category/resource, не открывая raw body. Напишите runbook из 5 шагов для contract drift.

## Самопроверка

- [ ] Измеряется не только job success, но dataset completeness.
- [ ] IDs не являются metric labels.
- [ ] Все стадии связаны job/run ID.
- [ ] Freshness имеет точное определение.
- [ ] Alert ведёт к runbook.
