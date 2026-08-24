# Глава 8. Транзакции, concurrency и upsert

[← Глава 7](07-indexes-and-explain.md) · [Оглавление](README.md) · [Глава 9 →](09-migrations-and-drizzle.md)

## Транзакция — единое изменение

Матч без половины participants не должен выглядеть готовым. Объединяем записи:

```sql
BEGIN;

-- insert/update match
-- delete/replace or upsert participants
-- insert draft actions

COMMIT;
```

При ошибке:

```sql
ROLLBACK;
```

Atomicity означает «всё или ничего». Но транзакция не проверяет бизнес-полноту автоматически — код и constraints всё равно нужны.

## Transaction boundary в Node

Важно использовать одно connection:

```ts
const client = await pool.connect();

try {
  await client.query('BEGIN');
  await saveMatch(client, match);
  await saveParticipants(client, match.participants);
  await client.query('COMMIT');
} catch (error: unknown) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

Если вызвать `pool.query` для каждого шага, запросы могут попасть на разные connections и не образуют одну транзакцию.

## Upsert

```sql
INSERT INTO heroes (id, machine_name, display_name, updated_at)
VALUES ($1, $2, $3, now())
ON CONFLICT (id) DO UPDATE
SET
  machine_name = EXCLUDED.machine_name,
  display_name = EXCLUDED.display_name,
  updated_at = now();
```

`EXCLUDED` — строка, которую пытались вставить. Conflict target должен соответствовать unique constraint/index.

Матч:

```sql
INSERT INTO matches (
  provider, provider_match_id, start_time, duration_seconds, radiant_win, patch_id
) VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (provider, provider_match_id) DO UPDATE
SET
  start_time = EXCLUDED.start_time,
  duration_seconds = EXCLUDED.duration_seconds,
  radiant_win = EXCLUDED.radiant_win,
  patch_id = EXCLUDED.patch_id,
  updated_at = now()
RETURNING id;
```

Повторная ingestion получает тот же internal ID.

## Не обновляйте всё безусловно

Плохой payload не должен затереть полные данные `NULL`. Нужна merge policy:

- provider priority;
- completeness rank;
- field-level rule;
- `source_updated_at`/retrieved_at;
- запрет regression из complete в partial.

Это разовьём в части 9.

## Isolation и гонки

Две транзакции могут обрабатывать один match одновременно. Unique constraint + upsert убирает duplicate row, но дочерние записи и статусы требуют locking/claim.

Варианты:

- BullMQ job ID дедуплицирует постановку;
- unique constraints защищают финальные данные;
- `SELECT ... FOR UPDATE` блокирует конкретную row;
- advisory locks — для keyed critical section;
- serializable transaction — для сложных инвариантов с retry serialization failures.

Не обещайте exactly-once. Делайте обработчик идемпотентным при at-least-once delivery.

## Deadlock

Если worker A блокирует match 1, затем 2, а B — 2, затем 1, возможен deadlock. PostgreSQL отменит одну транзакцию. Снижайте риск: одинаковый порядок locking, короткие транзакции, retry только корректной категории ошибки.

## Практика

1. Upsert одного hero дважды.
2. Убедитесь, что строка одна.
3. В транзакции вставьте match и invalid participant; проверьте, что match не остался.
4. В двух `psql` sessions исследуйте row lock.

## Самопроверка

- [ ] Одна transaction использует одну connection.
- [ ] Upsert опирается на unique identity.
- [ ] Повтор не создаёт duplicate facts.
- [ ] Ошибка вызывает rollback и connection release.
- [ ] Полнота данных не ухудшается слепым update.
