# Глава 8. Миграция, shadow read и безопасное переключение

## Цель

Перенести один тяжёлый аналитический workload без «дня X», в который старая система выключается навсегда. Новый слой сначала доказывает полноту и правильность в тени, затем получает малую долю чтений и только после этого становится основным.

## 1. Что именно мигрируется

Не говорите «мы переносим аналитику». Выберите точную capability:

```text
GET /v1/meta/heatmap
source: validated replay position outputs
filters: patch, tournament tier, hero, date range
result: 32x32 cells + denominator + freshness
```

Старая реализация может читать PostgreSQL materialized table или artifacts. Новая — ClickHouse aggregate. HTTP contract остаётся одинаковым.

## 2. Фазы миграции

```text
0. baseline
1. provision/schema
2. historical backfill
3. continuous export
4. reconciliation
5. shadow read
6. canary read
7. primary read
8. retirement after rollback window
```

Каждая фаза имеет entry criteria, exit criteria и rollback.

## 3. Фаза 0: baseline

До изменения сохраните:

- исходные p50/p95/p99;
- correctness fixtures;
- объём данных;
- error rate;
- PostgreSQL CPU/IO/cache impact;
- текущую стоимость;
- типичный и пиковый workload;
- снимок OpenAPI response.

Иначе после миграции останется только субъективное «кажется быстрее».

## 4. Provision и права

Создайте отдельные роли:

```text
analytics_loader -> INSERT raw, limited SELECT for reconciliation
analytics_api    -> SELECT approved tables/views only
analytics_admin  -> migrations/operations, not used by app
```

Требования:

- TLS;
- secrets из secret manager;
- network allowlist/private network;
- query timeout и quotas;
- точная server version;
- migrations в repository;
- staging раньше production;
- backup/restore runbook.

API не получает право `DROP`, loader не получает пользовательские таблицы PostgreSQL сверх нужного ledger/outbox.

## 5. Исторический backfill

Источник backfill — immutable parser artifacts или воспроизводимый canonical export, а не случайная копия уже изменённой промежуточной таблицы.

Создайте manifest запуска:

```json
{
  "backfillId": "...",
  "stream": "positions-v1",
  "schemaVersion": 1,
  "from": "2025-01-01T00:00:00Z",
  "toExclusive": "2026-07-01T00:00:00Z",
  "artifactCount": 12840,
  "expectedRows": "742193881",
  "codeCommit": "...",
  "startedAt": "..."
}
```

Backfill:

- идёт диапазонами/checkpoints;
- ограничивает bandwidth и insert concurrency;
- умеет продолжить после падения;
- не перегружает production object storage;
- пишет counts/errors;
- не помечает набор current до validation.

## 6. Граница history/live

Выберите `cutover_watermark`, например parser output completion sequence/time. Нельзя делить только по `now()` двух серверов без общей semantics.

```text
historical backfill: output_sequence <= 5_000_000
continuous exporter: output_sequence > 5_000_000
```

Outbox sequence или другой монотонный canonical cursor проще проверить. Поздно завершившийся старый матч всё равно получает новую output sequence и попадает в live export.

## 7. Reconciliation

Проверки идут слоями.

### Полнота

- число expected outputs;
- outputs без export;
- row count по stream/output;
- min/max time;
- доля invalid/quarantine.

### Смысл

- exact total samples/events;
- death/damage counts;
- случайные heatmap cells;
- denominators;
- known golden matches;
- parser/schema/methodology versions.

### Свежесть

- oldest pending age;
- watermark difference;
- p95 source-to-analytics lag.

Расхождение не «усредняется». Для integer totals ожидайте точное совпадение либо документированную correction/version причину.

## 8. Shadow read

Shadow adapter отдаёт пользователю старый результат, а новый выполняет асинхронно с жёстким бюджетом:

```ts
const primary = await postgresAnalytics.getHeatmap(query);

void shadowComparator.compare({
  query,
  expected: primary,
  candidate: () => clickHouseAnalytics.getHeatmap(query),
});

return primary;
```

Правила:

- shadow не увеличивает пользовательскую latency;
- sampling, например 1–10%, ограничивает нагрузку;
- sensitive query params не попадают в логи;
- сравнение нормализует порядок rows;
- floating metrics сравниваются с tolerance;
- timeout candidate считается отдельной метрикой;
- fire-and-forget всё равно контролируется queue/concurrency и обрабатывает rejection.

Можно отправлять shadow через очередь, чтобы не держать незавершённую promise в web process.

## 9. Canary read

После стабильного shadow:

```text
internal users -> 100% ClickHouse
1% production -> ClickHouse
10% -> ClickHouse
50% -> ClickHouse
100% -> ClickHouse
```

Переход разрешён, если в течение выбранного окна:

- correctness divergence ниже порога;
- p95/p99 в бюджете;
- error rate не хуже;
- freshness в SLO;
- parts/merges/memory стабильны;
- cost projection приемлем.

Флаг должен переключаться server-side без выпуска новой mobile версии.

## 10. Rollback

Rollback чтения:

1. feature flag возвращает old adapter;
2. ClickHouse loader можно продолжить для диагностики или поставить на pause;
3. канонические записи не меняются;
4. stale/ошибочный aggregate не удаляется до forensic capture;
5. incident фиксирует affected period/version;
6. repair/rebuild выполняется shadow.

Не удаляйте старую реализацию сразу после 100% switch. Rollback window должен покрыть как минимум несколько production циклов, patch change и один recovery drill.

## 11. Retire старого пути

Удаление разрешено, когда:

- rollback window прошёл;
- correctness audit стабилен;
- restore проверен;
- команда умеет диагностировать ClickHouse;
- runbooks дежурства обновлены;
- все потребители найдены;
- data retention/cost нового пути приняты.

Даже после retirement source artifacts/PostgreSQL остаются достаточными для rebuild.

## Практика

1. Создайте feature flags `heatmap_read_source` и `heatmap_shadow_percent`.
2. Реализуйте оба адаптера одного интерфейса.
3. Запишите historical/live watermark.
4. Backfill'ните staging.
5. Сравните 1 000 одинаковых запросов.
6. Внесите намеренную ошибку одной cell и проверьте divergence alert.
7. Проведите canary 1% на synthetic load.
8. Откатите флаг без deployment.

## Критерии готовности

- capability и контракт ограничены;
- baseline сохранён;
- backfill повторяем и checkpointed;
- historical/live ranges не пересекаются и не имеют дыр;
- полнота, смысл и freshness сверяются;
- shadow не влияет на ответ;
- canary повышается ступенчато;
- rollback не требует миграции канонических данных;
- старый путь сохраняется на оговорённое окно;
- artifacts позволяют rebuild с нуля.

[Предыдущая глава](07-materialized-views-preaggregation.md) · [Оглавление части](README.md) · [Следующая глава](09-load-testing-operations.md)

