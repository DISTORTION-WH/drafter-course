# Глава 7. Retry, backoff, quota и dead-letter policy

[← Глава 6](06-redis-bullmq-workers.md) · [Оглавление](README.md) · [Глава 8 →](08-discovery-backfill-reconciliation.md)

## Два уровня retry

HTTP client может сделать 2–3 быстрые попытки временного network failure. BullMQ повторяет весь job позже. Если оба уровня имеют по 5 попыток, provider получит до 25 calls. Посчитайте общий retry budget и избегайте multiplicative explosion.

## Категории ошибок

```ts
type FailureCategory =
  | 'transient_network'
  | 'provider_rate_limited'
  | 'provider_unavailable'
  | 'not_found_maybe_pending'
  | 'not_found_terminal'
  | 'invalid_job'
  | 'contract_drift'
  | 'invalid_data'
  | 'storage_unavailable'
  | 'database_transient'
  | 'bug';
```

Retry policy — pure mapping category + context → decision.

## Немедленный fail

- invalid job version/ID;
- authentication/config error до исправления;
- schema/contract drift, требующий нового adapter;
- невозможный canonical invariant;
- terminal 404 по подтверждённой политике.

Такие jobs уходят в quarantine/failed, alert aggregation. Бесконечный retry не чинит код.

## Временный fail

- timeout/DNS/connection reset;
- `429` с `Retry-After`;
- `502/503/504`;
- object storage/DB temporary outage;
- PostgreSQL serialization/deadlock error, если transaction идемпотентна.

Используйте exponential backoff + jitter + cap. Provider `Retry-After` имеет приоритет не раньше указанного времени.

## Global rate limit

BullMQ limiter может ограничить workers queue-wide в поддерживаемой конфигурации:

```ts
new Worker(queueName, processor, {
  connection,
  concurrency: 4,
  limiter: { max: configuredMax, duration: configuredDurationMs },
});
```

Значения приходят из актуального plan provider. Для нескольких endpoints с разной стоимостью нужен token bucket/scheduler, а не один интервал.

## Quota budget

Храните метрики:

- requests started/succeeded by endpoint/status;
- remaining quota, если documented header;
- rate-limited count;
- retries and delay;
- backfill requests vs live requests.

При приближении к daily/monthly budget останавливайте backfill, сохраняя live ingestion.

## Dead-letter/quarantine

В BullMQ failed jobs — не полноценная бизнес-quarantine навсегда: retention чистит их. Сохраните в PostgreSQL:

- resource identity;
- category/code;
- safe message;
- attempts;
- first/last failure time;
- latest raw object ID;
- parser version;
- review status.

После исправления adapter оператор создаёт controlled replay job.

## Circuit breaker

Если provider массово возвращает 503, продолжать все jobs бесполезно. Circuit breaker временно прекращает вызовы, затем делает ограниченный probe. State должен быть shared для replicas. В MVP можно pause queue по alert/runbook; автоматизация требует тщательных тестов.

## Практика

Создайте таблицу policy для всех categories: HTTP retry attempts, job retry, initial/max delay, terminal state, alert. Добавьте тест, что total provider calls не превышает рассчитанного максимума.

## Самопроверка

- [ ] HTTP retry × job retry посчитаны вместе.
- [ ] Permanent error не retry бесконечно.
- [ ] Rate/quota global для replicas.
- [ ] Failed state сохранён не только в Redis.
- [ ] Backfill уступает live data.
