# Глава 5. Idempotency, merge policy и транзакция

[← Глава 4](04-ingestion-state-machine.md) · [Оглавление](README.md) · [Глава 6 →](06-redis-bullmq-workers.md)

## Идемпотентность — наблюдаемый итог повторов

Обработка одного resource дважды должна оставить один логический match, одни participant slots и одни draft sequence. Технические `updated_at`/attempt counters могут измениться, но facts не дублируются.

## Слои защиты

1. Deterministic BullMQ job ID уменьшает duplicate queued jobs.
2. Atomic claim не даёт двум workers одновременно владеть state.
3. Unique constraints запрещают duplicate facts.
4. Upsert обновляет existing resource.
5. Transaction не оставляет половину canonical graph.
6. Merge policy запрещает regression полноты.

Ни один слой отдельно не достаточен.

## Политика замены дочерних коллекций

Для одного небольшого матча надёжный MVP:

```text
upsert match
delete existing draft_actions for match
insert validated complete draft collection
upsert participants by (match_id, slot)
verify counts
update lineage/status
commit
```

Delete+insert находится в одной transaction, поэтому reader не увидит пустую промежуточную коллекцию при обычном isolation. Но не удаляйте полный draft, если новый payload partial.

## Completeness rank

Не сводите всё к одному числу, если компоненты независимы. Пример decision:

```ts
function shouldReplaceDraft(current: Completeness, incoming: Completeness): boolean {
  return incoming.hasDraft && (!current.hasDraft || incoming.isParsed);
}
```

Для каждого component зафиксируйте:

- required flag;
- provider priority;
- source freshness;
- parser version;
- разрешено ли удалять старое значение.

## Lineage на компонент

Если core пришёл из OpenDota, а replay events из Clarity, один `source` на match недостаточен. В MVP можно хранить `core_raw_object_id`, `draft_raw_object_id`, `details_raw_object_id`; позже — общая provenance table.

## Outbox для событий

Если после DB commit нужно enqueue analytics refresh/event, между commit и queue add возможен crash. Transactional outbox:

```sql
CREATE TABLE outbox_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
```

Canonical update и outbox insert — одна transaction. Publisher позже доставляет event идемпотентно.

## Hash-based no-op

Если incoming raw hash и parser version уже применены, normalization/persist можно пропустить. Но identical provider payload с новой retrieval timestamp всё ещё обновляет freshness по отдельному правилу.

## Проверка результата

До `complete` проверьте инварианты: match row есть, component counts/flags согласованы, lineage ссылается на raw object, status обновляется в той же transaction.

## Практика

Тесты:

- один job дважды → одна match;
- crash/retry после match upsert → корректный итог;
- partial без draft не удаляет existing draft;
- новый полный draft заменяет старый;
- одинаковый hash+parser → no-op canonical write;
- transaction failure не ставит complete.

## Самопроверка

- [ ] Идемпотентность обеспечивается данными, не надеждой на очередь.
- [ ] Merge policy компонентная и тестируемая.
- [ ] Status complete обновляется в canonical transaction.
- [ ] Side effect после commit использует outbox или reconciliation.
