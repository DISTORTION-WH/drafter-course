# Глава 6. Redis, BullMQ, queues и workers

[← Глава 5](05-idempotency-and-merge-policy.md) · [Оглавление](README.md) · [Глава 7 →](07-retry-quota-and-failures.md)

## Redis здесь не основная база

Redis хранит состояние BullMQ, short-lived locks/cache. Потеря Redis не должна уничтожить canonical matches/raw archive. Очередь восстанавливается через PostgreSQL reconciliation.

## Local service

Добавьте в `compose.yaml`:

```yaml
  redis:
    image: redis:8-alpine
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10
```

Перед production сверяйте поддерживаемую BullMQ версию Redis по официальной compatibility документации. Redis нельзя публиковать в internet без auth/network isolation.

## Пакеты Nest worker

```powershell
pnpm add bullmq @nestjs/bullmq
```

Создайте `apps/worker` как отдельный Nest application без HTTP listen (application context). API и worker могут переиспользовать packages/domain/database, но deploy/scale независимо.

## Job data

```ts
export type IngestMatchJobV1 = {
  v: 1;
  provider: 'opendota';
  matchId: string;
  reason: 'live' | 'backfill' | 'reconcile' | 'manual';
};
```

Job маленький и versioned. Не кладите raw payload, secret, user object или database connection.

## Producer

```ts
await queue.add('ingest-match-v1', jobData, {
  jobId: `opendota-match-${jobData.matchId}`,
  attempts: 5,
  backoff: { type: 'exponential', delay: 1_000 },
  removeOnComplete: { age: 86_400, count: 10_000 },
  removeOnFail: { age: 604_800, count: 50_000 },
});
```

Custom BullMQ job IDs не должны использовать `:` как произвольный separator; используйте безопасный формат. После удаления completed job тот же ID может быть добавлен снова — final idempotency всё равно в PostgreSQL.

## Processor

```ts
@Processor('match-ingestion', { concurrency: 4 })
export class MatchIngestionProcessor extends WorkerHost {
  constructor(private readonly useCase: IngestMatchUseCase) {
    super();
  }

  async process(job: Job<IngestMatchJobV1>): Promise<IngestMatchResult> {
    assertJobV1(job.data);
    return this.useCase.execute(job.data, String(job.id));
  }
}
```

Processor — adapter очереди. Основной use case можно unit-test без Redis/BullMQ.

## Connections

BullMQ components используют Redis connections по своим правилам. Не создавайте бесконечное число clients. Следуйте official connection guide, задайте `maxRetriesPerRequest`/blocking connection параметры как требует версия BullMQ.

## Concurrency

Concurrency полезна для I/O, но ограничена:

- provider rate;
- Redis/DB connections;
- memory raw payload;
- object storage throughput.

Начните с малого, измерьте. Несколько worker replicas умножают global concurrency.

## Shutdown

Worker должен перестать брать новые jobs и дождаться active jobs в пределах grace period. Nest lifecycle закрывает Queue/Worker/DB clients. Job, не завершённый до crash, может быть обработан снова.

## Практика

Fake use case + real local Redis integration:

- job valid → completed;
- invalid version → failed non-retryable;
- duplicate job ID не создаёт concurrent duplicate;
- worker restart обрабатывает незавершённое;
- shutdown не теряет acknowledged state.

## Самопроверка

- [ ] Worker — отдельный process/deployable.
- [ ] Job data маленькие и versioned.
- [ ] Processor вызывает testable use case.
- [ ] Concurrency учитывает все replicas.
- [ ] PostgreSQL остаётся final source of truth.
