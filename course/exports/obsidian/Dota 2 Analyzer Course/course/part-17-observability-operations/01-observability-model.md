# Глава 1. Модель наблюдаемости и сигналы

## 1. Monitoring и observability

Monitoring отвечает на заранее известные вопросы: «API error rate выше порога?». Observability помогает исследовать неизвестную проблему через связанные сигналы: какой route/release/provider/queue участвует и где изменилось поведение.

Нужны оба подхода:

```text
alert: freshness meta нарушена
-> dashboard: ingestion lag вырос после release
-> trace: provider fetch быстрый, DB transaction медленная
-> logs: lock timeout на конкретной операции
-> mitigation: снизить concurrency/rollback release
```

## 2. Четыре сигнала

### Logs

Дискретные события с контекстом:

```json
{
  "level": "error",
  "message": "match ingestion failed",
  "matchId": "8173564281",
  "jobId": "ingest:8173564281:v3",
  "errorCode": "PROVIDER_TIMEOUT"
}
```

### Metrics

Числовые ряды во времени:

```text
http_server_request_duration_seconds
ingestion_jobs_total
meta_snapshot_age_seconds
queue_oldest_job_age_seconds
```

### Traces

Связанный путь операции через services/spans:

```text
mobile request
  -> API GET /v1/matches
    -> PostgreSQL query
    -> Redis cache
```

### Error/crash reporting

Сгруппированные exceptions, stack traces, release, устройство/ОС, breadcrumbs — например в Sentry.

## 3. Наблюдаемость начинается с вопроса

Перед добавлением telemetry запишите:

```text
Вопрос: почему match detail пуст?
Нужно: API status, canonical completeness, provider freshness, ingestion state.
Сигналы: request trace + data state metric + safe error log.
Действие: retry/reconciliation или исправление parser.
```

Если metric не ведёт к вопросу/решению, он, вероятно, создаёт только стоимость.

## 4. Слои здоровья продукта

```text
Infrastructure: process, CPU, memory, disk, connections
Service: HTTP success/latency, queue throughput, provider errors
Data: freshness, completeness, reconciliation mismatch
Product: match pages usable, notifications on time
Recovery: backup age, restore drill success
```

Зелёный CPU не означает, что пользователи видят свежую мету.

## 5. Release identity

Единый resource context:

```ts
type ReleaseContext = {
  serviceName: 'api' | 'worker' | 'scheduler' | 'replay-parser';
  serviceVersion: string;
  environment: 'staging' | 'production';
  region: string;
  commitSha: string;
  imageDigest?: string;
};
```

`serviceVersion` имеет ограниченное число значений и подходит как telemetry attribute. `imageDigest` полезен в logs/deployment record, но полный digest может быть неудобен как metric label.

## 6. Correlation

Путь связывают:

- `traceId` и `spanId` — distributed trace;
- `requestId` — обращение пользователя/HTTP;
- `jobId` — очередь;
- `eventId` — domain/outbox notification;
- `release` — версия кода.

Не пытайтесь заменить всё одним ID. Один HTTP request способен создать несколько jobs, а один job — продолжить отдельный trace.

## 7. Telemetry pipeline

```text
application SDKs
-> local/sidecar/gateway OpenTelemetry Collector
-> metrics backend
-> trace backend

application stdout
-> platform log collector
-> log storage/search

mobile/backend SDK
-> Sentry/error backend
```

Collector отделяет приложение от vendor endpoint, поддерживает batching, retry, sampling/redaction и смену backend. Но он сам должен наблюдаться: dropped telemetry не должна оставаться невидимой.

## 8. Стоимость и retention

Стоимость растёт из-за:

- debug logs;
- high-cardinality labels/attributes;
- 100% traces;
- long retention;
- mobile breadcrumbs/attachments;
- дублирования telemetry в нескольких systems.

Политика задаёт уровни, sampling, quotas, retention и access. Security/audit logs могут иметь отдельный защищённый lifecycle.

## 9. Telemetry не должна ломать приложение

- exporter timeout короткий;
- batch/queue bounded;
- при недоступном backend события могут отбрасываться по policy;
- request не ждёт synchronous remote log;
- instrumentation overhead измеряется;
- exceptions в telemetry adapter не падают в domain path.

При этом security audit event может требовать более надёжного outbox, чем debug trace.

## 10. Упражнение

Для пяти сбоев — provider outage, slow DB, stuck queue, stale meta, mobile crash — укажите первый alert, dashboard, trace/log context, mitigation и владельца.

[Назад к оглавлению](README.md) · [Следующая глава](02-structured-logs-correlation.md)

