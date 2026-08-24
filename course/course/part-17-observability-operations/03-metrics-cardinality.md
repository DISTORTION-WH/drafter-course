# Глава 3. Метрики, типы и cardinality

## 1. Metric = имя + labels + samples

```text
http_server_requests_total{
  method="GET",
  route="/v1/matches/:matchId",
  status_class="2xx",
  service="api"
} 125430
```

Каждая уникальная комбинация labels — отдельный time series. Если добавить `matchId`, появятся миллионы рядов и monitoring станет дорогим/медленным.

## 2. Типы

### Counter

Только растёт до restart:

```text
http_server_requests_total
ingestion_jobs_completed_total
provider_requests_total
notification_deliveries_total
```

Анализируется `rate()`/increase за окно, а не абсолютное значение.

### Gauge

Растёт и уменьшается:

```text
queue_waiting_jobs
queue_oldest_job_age_seconds
db_pool_in_use
meta_snapshot_age_seconds
```

### Histogram

Распределение длительности/размера:

```text
http_server_request_duration_seconds
provider_request_duration_seconds
replay_parse_duration_seconds
```

Buckets выбираются по SLO и реальному диапазону. Average скрывает длинный хвост; нужны percentiles/histogram.

## 3. Имена и единицы

- base units: seconds, bytes;
- suffix `_total` для counters;
- snake_case;
- один смысл на metric;
- document labels/unit/owner;
- не включать единицу в label value;
- duration записывать seconds, даже если code измеряет milliseconds.

## 4. Хорошие labels

Ограниченное множество:

```text
service, environment, region,
route_template, method, status_class,
provider, queue, job_name, outcome,
parser_version, game_build_bucket
```

Опасные:

```text
userId, SteamID, matchId, requestId, jobId,
raw URL, error message, stack, SQL text,
push token, replay object key
```

Конкретный ID ищется в logs/traces, не metric labels.

## 5. HTTP RED

Для request-driven service:

- Rate — requests/sec;
- Errors — failure ratio;
- Duration — latency distribution.

```text
sum(rate(http_server_requests_total{status_class=~"5.."}[5m]))
/
sum(rate(http_server_requests_total[5m]))
```

Eligible traffic определяется SLI: health checks, ожидаемые 4xx и internal probes могут учитываться отдельно.

## 6. Infrastructure USE

- Utilization;
- Saturation;
- Errors.

Примеры: CPU, memory/heap, event-loop lag, DB pool wait, connection count, disk/object errors. Высокий CPU без user impact — диагностический сигнал, не обязательно page.

## 7. Domain/data metrics

```text
canonical_matches_total{completeness}
ingestion_last_success_timestamp_seconds{provider}
reconciliation_mismatches_total{field_group}
meta_snapshot_age_seconds{scope}
replay_parse_jobs_total{outcome,parser_version}
notification_delay_seconds{event_type}
```

Не label-ируйте `tournamentId` без ограниченной curated категории. Для конкретных турниров используйте аналитические данные/dashboard query, а не production metric series.

## 8. Metric code

API instrumentation wrapper concept:

```ts
const startedAt = performance.now();

try {
  return await next();
} finally {
  const durationSeconds = (performance.now() - startedAt) / 1_000;
  requestDuration.record(durationSeconds, {
    method,
    route: routeTemplate,
    status_class: toStatusClass(statusCode),
  });
}
```

Status должен быть финальным даже при exception. Автоматическая HTTP instrumentation часто уже создаёт стандартную metric/trace; не дублируйте её без причины.

## 9. Histograms и percentiles

Buckets должны окружать SLO, например 0.1, 0.25, 0.5, 1, 2, 5 seconds. Слишком грубые buckets дают неточный percentile, слишком много увеличивают series.

Нельзя усреднять percentiles между instances. Агрегируйте histogram buckets и затем вычисляйте quantile, либо используйте backend-native подход.

## 10. Metrics tests

- success/error counter increment;
- duration seconds, не milliseconds;
- labels allowlisted;
- thrown exception тоже записана;
- route template, не raw path;
- registry reset/isolated в tests;
- `/metrics` защищён network policy/auth и не публичен без необходимости.

Официальные практики: [Prometheus instrumentation](https://prometheus.io/docs/practices/instrumentation/).

[Предыдущая глава](02-structured-logs-correlation.md) · [Оглавление](README.md) · [Следующая глава](04-traces-opentelemetry.md)

