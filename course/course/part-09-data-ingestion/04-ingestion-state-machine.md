# Глава 4. State machine ресурса

[← Глава 3](03-raw-archive-and-provenance.md) · [Оглавление](README.md) · [Глава 5 →](05-idempotency-and-merge-policy.md)

## Почему одного `processed=true` мало

Процесс может упасть после raw save, но до database commit. Нам нужно знать последнюю подтверждённую стадию и следующее действие.

## Таблица ресурса

```sql
CREATE TABLE ingestion_resources (
  provider text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  status text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz,
  last_error_code text,
  last_error_message text,
  latest_raw_object_id bigint REFERENCES raw_objects(id),
  normalized_parser_version text,
  discovered_at timestamptz NOT NULL,
  last_attempt_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, resource_type, resource_id),
  CONSTRAINT ingestion_attempt_non_negative CHECK (attempt_count >= 0),
  CONSTRAINT ingestion_status_values CHECK (status IN (
    'discovered', 'fetching', 'raw_saved', 'normalizing',
    'persisting', 'complete', 'retry_wait', 'quarantined'
  ))
);
```

`last_error_message` должен быть redacted/ограниченной длины; полный stack — в logs, не business table.

## Переходы

```text
discovered → fetching → raw_saved → normalizing → persisting → complete
                 │                         │            │
                 └────────→ retry_wait ←───┴────────────┘
                                │
                                ├─→ fetching/normalizing
                                └─→ quarantined
```

Если raw уже сохранён, retry normalization не должен снова расходовать API quota.

## Сравнение и установка

Не делайте безусловный `UPDATE status='fetching'`. Claim:

```sql
UPDATE ingestion_resources
SET status = 'fetching', last_attempt_at = now(), updated_at = now()
WHERE provider = $1
  AND resource_type = $2
  AND resource_id = $3
  AND status IN ('discovered', 'retry_wait')
  AND (next_attempt_at IS NULL OR next_attempt_at <= now())
RETURNING *;
```

Ноль rows означает: job устарел, другой worker уже claim-ил или retry ещё рано. Это не всегда error.

## Lease

Worker может умереть в `fetching`. Добавьте `lease_expires_at` и `lease_owner`, либо полагайтесь на BullMQ stalled-job recovery плюс reconciliation. PostgreSQL lease даёт явную проверяемость. Reconciler возвращает просроченный state в retry, но только если нет active owner.

## Terminal не значит навсегда

- `complete` может быть переоткрыт для более полного parse/new parser.
- `quarantined` требует ручного review или новой версии adapter.

Храните reason/code и action history, если audit важен.

## State transition function

Application слой должен централизовать allowed transitions:

```ts
function canTransition(from: Status, to: Status): boolean {
  return allowedTransitions[from].includes(to);
}
```

Для критической гарантии используйте SQL `WHERE current status`/constraint, потому что два processes могут читать старое состояние.

## Практика

Смоделируйте process crash после каждой стадии. Для каждой точки укажите, какой row/object существует и откуда продолжать без duplicate provider call.

## Самопроверка

- [ ] Status соответствует подтверждённой стадии.
- [ ] Claim — atomic compare-and-set.
- [ ] Saved raw позволяет retry без provider.
- [ ] Stuck states находят reconciliation/lease.
- [ ] Quarantine имеет reason и путь восстановления.
