# Часть 9. Сбор и нормализация данных Dota 2

[← Часть 8. NestJS backend](../part-08-nestjs-backend/README.md) · [Карта курса](../01-course-map.md) · [Часть 10. Аналитика →](../part-10-analytics/README.md)

## Что мы строим

Отдельный worker автоматически обновляет PostgreSQL:

```text
discover match ID
→ enqueue small job
→ fetch provider with quota/timeout/retry
→ save raw payload
→ validate and normalize
→ persist transactionally/idempotently
→ mark completeness/freshness
```

Redis и BullMQ управляют очередью, но PostgreSQL остаётся источником истины для статуса данных. API не ждёт OpenDota.

## Главы

1. [Архитектура ingestion pipeline](01-ingestion-architecture.md)
2. [Provider adapter и canonical model](02-provider-adapter-canonical-model.md)
3. [Raw archive, provenance и versioning](03-raw-archive-and-provenance.md)
4. [State machine ресурса](04-ingestion-state-machine.md)
5. [Idempotency, merge policy и транзакция](05-idempotency-and-merge-policy.md)
6. [Redis, BullMQ, queues и workers](06-redis-bullmq-workers.md)
7. [Retry, backoff, quota и dead-letter policy](07-retry-quota-and-failures.md)
8. [Discovery, schedules, backfill и reconciliation](08-discovery-backfill-reconciliation.md)
9. [Качество данных и наблюдаемость](09-data-quality-observability.md)
10. [Итоговая лабораторная: worker матча](10-final-ingestion-lab.md)

## Неподвижные правила

- Не обещаем exactly-once delivery; обработчик выдерживает повтор.
- Job содержит provider/resource ID, но не огромный raw payload.
- Raw сохраняется до необратимой нормализации.
- Provider field names заканчиваются внутри adapter.
- Complete данные не затираются менее полным ответом.
- Retry классифицирован и ограничен.
- Любую цифру можно связать с provider, raw hash, parser version и временем получения.

## Официальные справочники

- [BullMQ](https://docs.bullmq.io/)
- [BullMQ idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs)
- [Redis documentation](https://redis.io/docs/latest/)
- [NestJS queues](https://docs.nestjs.com/techniques/queues)

Наихудший сценарий очереди — повторная доставка, поэтому уникальность job ID является оптимизацией, а constraints/upsert — финальной защитой.
