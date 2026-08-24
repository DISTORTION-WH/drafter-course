# Глава 10. Итоговая лабораторная: аналитика на большом наборе событий

## Цель

Добавить в проект production-shaped, но ограниченный ClickHouse-контур для replay analytics. Результат — интерактивный hero heatmap и combat ranking на большом наборе событий с backfill, shadow comparison, нагрузочным отчётом и откатом.

## 1. Граница лабораторной

В scope:

- validated combat/position artifacts;
- один ClickHouse environment для staging;
- две raw event tables;
- два предварительных агрегата;
- loader на Node.js;
- bounded read-only API;
- mobile derived screen/block;
- observability, load test и recovery drill.

Не в scope:

- перенос auth/users/watchlist;
- произвольный SQL-конструктор;
- multi-region cluster;
- удаление PostgreSQL path до завершения rollback window;
- ML-прогнозы;
- пользовательская загрузка replay.

## 2. Структура проекта

```text
apps/api/src/analytics/                 domain/query endpoints
apps/worker/src/analytics-export/       ledger, loader, reconciliation
apps/mobile/src/features/heatmap/       filters, grid, states
packages/analytics-contracts/           event/API/runtime schemas
infra/clickhouse/migrations/             versioned DDL
infra/clickhouse/queries/                reviewed SQL
test/fixtures/analytics/                 synthetic/golden fixtures
docs/runbooks/clickhouse-analytics.md    operations/rebuild/rollback
docs/benchmarks/clickhouse-pilot.md      evidence and decision
```

## 3. Подготовка данных

Создайте dataset не меньше выбранного учебного масштаба, например:

```text
combat events: 20–100 million
position samples: 50–200 million
matches: at least several thousand
patches: at least 3
tournament tiers: at least 3
```

Если реальных разрешённых artifacts недостаточно, дополните synthetic generator с фиксированным seed. В manifest отметьте, какие данные synthetic: они годятся для performance, но не доказывают продуктовую статистическую репрезентативность.

Manifest содержит count, checksum, distribution и generator commit.

## 4. Schema migrations

Создайте:

```text
analytics.replay_combat_events_v1
analytics.replay_position_samples_v1
analytics.hero_damage_by_patch_v1
analytics.hero_position_heatmap_v1
incremental materialized views
```

Перед принятием `ORDER BY`:

1. создайте минимум два кандидата;
2. загрузите representative subset;
3. сравните основные queries;
4. сохраните rows/bytes/latency/compression;
5. запишите решение в ADR.

Server image/client версии фиксируются. Миграции повторяемы на пустом staging environment.

## 5. Loader

Полный путь:

```text
validated parser output
-> analytics_exports row
-> leased worker
-> artifact checksum
-> streaming runtime parse
-> deterministic bounded batches
-> ClickHouse insert
-> checkpoint
-> count/checksum reconciliation
-> completed + analyticsAvailableAt
```

Обязательные тесты:

- два enqueue одного output;
- network timeout до insert;
- потерянный response после insert;
- kill после insert до checkpoint;
- invalid schema;
- checksum mismatch;
- частично недоступный ClickHouse;
- resume большого artifact;
- expected versus actual count mismatch.

## 6. Backfill и live boundary

1. запишите output sequence watermark;
2. backfill'ните всё до watermark;
3. включите continuous export после него;
4. подтвердите отсутствие holes/overlap;
5. backfill'ните aggregate targets безопасной процедурой;
6. сравните totals по patch/tier/hero;
7. сохраните report.

Backfill можно остановить и продолжить. Его повтор не меняет логический итог.

## 7. API contracts

### Heatmap

```http
GET /v1/analytics/hero-heatmap
  ?heroId=...
  &patchId=...
  &tournamentTier=...
  &from=...
  &to=...
```

Ответ:

```json
{
  "heroId": 1,
  "gridSize": 32,
  "cells": [{ "x": 10, "y": 15, "samples": "2841" }],
  "denominator": {
    "matches": "93",
    "samples": "812044"
  },
  "methodology": {
    "version": "hero-heatmap-v1",
    "aliveOnly": true,
    "sampleIntervalMs": 1000
  },
  "freshness": {
    "asOf": "2026-07-16T10:00:00Z",
    "lagSeconds": 75,
    "status": "fresh"
  }
}
```

### Combat ranking

```http
GET /v1/analytics/hero-damage
  ?patchId=...
  &tournamentTier=...
  &from=...
  &to=...
  &limit=30
```

OpenAPI ограничивает enum/ranges. Клиент генерируется заново. Query keys включают все filters.

## 8. Mobile UI

Экран содержит:

- patch selector;
- tournament tier selector;
- hero selector/search;
- явный date range preset;
- heatmap legend;
- denominator и methodology;
- last updated/freshness;
- empty/stale/unavailable states;
- accessible текстовый список top cells/zones;
- retry без бесконечного spinner.

Клиент не получает raw coordinates/events и не задаёт grid больше 32.

## 9. Shadow и canary

До переключения:

- 1 000+ запросов сравниваются со старым/эталонным path;
- row order нормализован;
- integer totals совпадают;
- допустимые float differences документированы;
- divergence/error/timeout dashboard готов.

Canary проходит ступени `internal -> 1% -> 10% -> 50% -> 100%`. На каждой ступени есть observation window. Один server-side flag возвращает старый адаптер.

## 10. Нагрузочный отчёт

В `docs/benchmarks/clickhouse-pilot.md` сохраните:

- environment/server/client/schema versions;
- dataset manifest;
- query mix;
- ingestion rate/batch size;
- p50/p95/p99;
- rows/bytes/peak memory;
- parts/merges;
- compression/storage;
- freshness under steady/burst/recovery;
- PostgreSQL baseline;
- monthly cost projection;
- go/no-go conclusion.

Положительный вывод допускается только если correctness и operations прошли вместе со скоростью.

## 11. Failure game day

В staging проведите:

1. ClickHouse недоступен 15 минут;
2. response потерян после успешного batch;
3. worker убит до checkpoint;
4. invalid artifact/schema;
5. burst мелких inserts;
6. disk/capacity threshold simulation;
7. ошибочная materialized view v2;
8. divergence alert;
9. API feature-flag rollback;
10. rebuild одной partition/versioned target.

Подтвердите: основные матчи, auth и watchlist работают во всех сценариях.

## 12. Definition of Done части 19

- причина внедрения выражена baseline-метриками;
- PostgreSQL остаётся источником canonical/transactional state;
- object artifacts позволяют полный rebuild;
- ClickHouse version/client/schema закреплены;
- roles/TLS/secrets/query limits настроены;
- combat и positions имеют отдельные узкие таблицы;
- `ORDER BY` выбран benchmark'ом;
- partitions не высококардинальны;
- event/export/batch IDs детерминированы;
- at-least-once и duplicate scenario протестированы;
- loader потоковый, bounded и checkpointed;
- historical/live boundary не имеет дыр;
- materialized views backfilled без двойного учёта;
- raw/aggregate reconciliation автоматизирован;
- API bounded, параметризован и возвращает denominator/freshness/methodology;
- mobile обрабатывает empty/stale/unavailable;
- shadow/canary/rollback проверены;
- mixed load и soak уложились в SLO;
- dashboards, alerts, backup/rebuild и runbook готовы;
- failure ClickHouse не ломает OLTP.

## Что вы теперь умеете

Вы не просто «подключили ещё одну базу». Вы построили производную аналитическую систему с явной консистентностью, измеряемой свежестью, повторяемой загрузкой и безопасной миграцией. Эта дисциплина пригодится в следующей части: ML-модель тоже будет производным, версионируемым результатом, который нельзя выдавать за источник истины.

[Предыдущая глава](09-load-testing-operations.md) · [Оглавление части](README.md) · [Дальше: часть 20 — прогнозирование и ML](../part-20-ml-predictions/README.md)
