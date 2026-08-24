# Глава 8. Discovery, schedules, backfill и reconciliation

[← Глава 7](07-retry-quota-and-failures.md) · [Оглавление](README.md) · [Глава 9 →](09-data-quality-observability.md)

## Три режима

- Live discovery ищет новые pro matches с минимальным lag.
- Backfill идёт назад по истории в ограниченном диапазоне.
- Reconciliation ищет пропуски/stuck/incomplete и восстанавливает.

У них разные priority и budget, но один idempotent ingestion use case.

## Watermark

```sql
CREATE TABLE ingestion_cursors (
  provider text NOT NULL,
  stream text NOT NULL,
  cursor_value text,
  watermark_time timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, stream)
);
```

Cursor provider opaque. Watermark — последний подтверждённый progress. Не продвигайте его до сохранения discovered identities, иначе crash создаст gap.

## Discovery transaction

```text
fetch page outside DB transaction
→ begin
→ upsert every resource identity as discovered
→ update cursor to page next cursor
→ commit
→ enqueue resources/outbox publisher
```

Outbox закрывает crash между DB commit и Queue add. Либо reconciler регулярно enqueue discovered due rows.

## Scheduled jobs

Используйте BullMQ Job Schedulers по текущей official documentation, а не устаревший API из случайного tutorial. Scheduler job только запускает discovery command; длительный crawl разбивается на страницы/jobs.

Не запускайте один и тот же scheduler во всех replicas без deterministic scheduler identity/leader semantics.

## Backfill plan

До старта зафиксируйте:

- date/tournament/league range;
- expected resources;
- provider calls and cost;
- raw storage estimate;
- maximum runtime;
- pause/resume cursor;
- priority ниже live;
- acceptance/completeness target.

Backfill — управляемая операция, не бесконечный `while`.

## Reconciliation queries

```sql
-- due retries
SELECT provider, resource_type, resource_id
FROM ingestion_resources
WHERE status = 'retry_wait'
  AND next_attempt_at <= now()
ORDER BY next_attempt_at
LIMIT 100;

-- stuck leases
SELECT ...
WHERE status IN ('fetching', 'normalizing', 'persisting')
  AND lease_expires_at < now();

-- canonical match without expected participants
SELECT m.id, COUNT(mp.*)
FROM matches m
LEFT JOIN match_players mp ON mp.match_id = m.id
GROUP BY m.id
HAVING COUNT(mp.*) <> 10;
```

Последний query применяется только к matches, для которых ожидаются complete participants; partial records фильтруйте по completeness.

## Gap detection

Match IDs не обязательно непрерывны для вашего pro dataset. Нельзя считать каждый отсутствующий integer пропуском. Gap определяется provider stream contract, tournament schedule, expected league matches или сравнимыми snapshots.

## Manual operations

Административный endpoint/CLI для reingest требует authorization, audit, rate limit и reason. Он создаёт job, но не вызывает provider синхронно.

## Практика

Остановите worker после discovery commit, до enqueue. Запустите reconciler и докажите, что resource в итоге попал в очередь. Затем смоделируйте потерю Redis и восстановите due rows из PostgreSQL.

## Самопроверка

- [ ] Cursor продвигается после durable discovery.
- [ ] Backfill ограничен и resumable.
- [ ] Reconciliation восстанавливает DB→queue gap.
- [ ] Gap определяется contract, не последовательностью ID.
- [ ] Manual replay audited.
