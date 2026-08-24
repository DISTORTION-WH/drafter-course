# Глава 5. Пакетная загрузка, повторная доставка и идемпотентность

## Цель

Построить loader, который не теряет validated parser output, не создаёт тысячи мелких parts и безопасно повторяет работу после падения.

## 1. Гарантия доставки

Реалистичная модель очереди и сети — **at least once**:

```text
worker отправил batch
ClickHouse записал batch
ответ потерялся
worker повторил batch
```

Producer не может отличить «вставка не произошла» от «вставка произошла, но подтверждение потерялось». Поэтому фраза «очередь доставит ровно один раз» опасна.

Наша задача:

- не потерять batch;
- сделать повтор детерминированным;
- обнаружить/подавить дубликат выбранным механизмом;
- проверить итог reconciliation'ом.

## 2. Единица экспорта

Удобная logical unit:

```ts
type AnalyticsExport = {
  exportId: string;
  parserOutputId: string;
  matchId: string;
  artifactKey: string;
  artifactSha256: string;
  stream: 'combat-v1' | 'positions-v1';
  schemaVersion: number;
  expectedRows: number;
};
```

`exportId` вычисляется детерминированно из output/stream/schema. Повторная постановка одной работы не создаёт новый logical export.

Большой artifact делится на transport batches:

```text
export 91
  batch 0: rows 0..49_999
  batch 1: rows 50_000..99_999
  batch 2: ...
```

У каждого batch есть стабильные `batchIndex`, row range, checksum и count.

## 3. Ingestion ledger в PostgreSQL

PostgreSQL хранит управление процессом:

```sql
CREATE TABLE analytics_exports (
  export_id uuid PRIMARY KEY,
  parser_output_id uuid NOT NULL,
  match_id bigint NOT NULL,
  stream text NOT NULL,
  schema_version integer NOT NULL,
  expected_rows bigint NOT NULL,
  artifact_key text NOT NULL,
  artifact_sha256 text NOT NULL,
  status text NOT NULL,
  next_batch_index integer NOT NULL DEFAULT 0,
  lease_until timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  exported_rows bigint NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  last_error_code text,
  UNIQUE (parser_output_id, stream, schema_version)
);
```

Здесь нужны те же принципы state machine из ingestion/replay частей:

- claim в короткой транзакции;
- lease с recovery;
- bounded retry;
- terminal `unsupported_schema`/`checksum_mismatch`;
- checkpoint только после подтверждённого batch;
- reconciliation перед `completed`.

## 4. Batch size

Слишком маленький batch:

- больше HTTP overhead;
- больше parts;
- больше merge pressure;
- ниже throughput.

Слишком большой:

- больше peak memory;
- дорогой retry;
- timeout;
- сложнее локализовать плохую строку.

Начните, например, с 10–100 тысяч строк или ограниченного объёма байтов, затем измерьте. Не делайте число константой без метрики:

```ts
const MAX_BATCH_ROWS = 50_000;
const MAX_BATCH_BYTES = 16 * 1024 * 1024;
```

Batch закрывается при достижении первого лимита.

## 5. Node.js client

В отдельном infrastructure module создаётся один клиент на процесс:

```ts
import { createClient } from '@clickhouse/client';

export function createAnalyticsClient(config: AnalyticsConfig) {
  return createClient({
    url: config.url,
    username: config.username,
    password: config.password,
    database: config.database,
    request_timeout: config.requestTimeoutMs,
  });
}
```

Пароль приходит из secret manager/environment и никогда не логируется.

Вставка:

```ts
await client.insert({
  table: 'replay_combat_events_v1',
  values: rows,
  format: 'JSONEachRow',
});
```

Перед использованием зафиксируйте совместимую версию `@clickhouse/client` и проверьте точные options по [официальной документации JavaScript client](https://clickhouse.com/docs/integrations/javascript).

Не создавайте client на каждую строку и не отправляйте `INSERT` из controller.

## 6. Streaming и backpressure

Artifact может не помещаться в память. Путь должен быть потоковым:

```text
object stream
-> checksum verification
-> line/record decoder
-> runtime validator
-> bounded batch buffer
-> ClickHouse insert
-> checkpoint
```

Loader не читает следующую бесконечную порцию, пока текущая не обработана. Это backpressure.

Псевдокод:

```ts
for await (const rawRecord of artifactRecords) {
  const event = parseCombatEventV1(rawRecord);
  batch.push(toClickHouseRow(event));

  if (batch.isFull()) {
    await insertAndConfirm(batch);
    await saveCheckpoint(batch.index);
    batch.clear();
  }
}

if (!batch.isEmpty()) {
  await insertAndConfirm(batch);
  await saveCheckpoint(batch.index);
}
```

`parseCombatEventV1` принимает `unknown` и либо возвращает validated model, либо структурированную ошибку с безопасным sample location.

## 7. Deduplication: уровни защиты

Используйте несколько уровней:

1. unique logical export в PostgreSQL;
2. deterministic batch boundaries и IDs;
3. стабильные event IDs;
4. поддерживаемая ClickHouse deduplication/insert token policy, проверенная на **зафиксированной версии**;
5. reconciliation counts/hashes;
6. repair workflow для затронутого output/partition.

Не полагайтесь только на автоматическую дедупликацию: её область действия, окно, replicated/non-replicated engine и настройки меняют гарантию. Напишите integration test «ответ потерян после успешной вставки».

## 8. Async inserts

ClickHouse умеет буферизовать небольшие inserts на стороне сервера. Defaults и поведение зависят от версии. В проекте:

- фиксируйте server/client version;
- задавайте нужные settings явно для workload;
- проверяйте подтверждение и dedup semantics;
- наблюдайте очередь и flush failures;
- не заменяйте этим producer batching без benchmark.

Хорошо сформированный крупный batch обычно проще рассуждать и воспроизводить.

## 9. Ошибки

Классифицируйте:

| Ошибка | Действие |
|---|---|
| timeout/network reset | retry с backoff, тот же batch ID |
| ClickHouse overloaded | delayed retry, circuit breaker |
| unsupported schema | terminal, quarantine |
| artifact checksum mismatch | terminal security/data incident |
| одна invalid row | terminal artifact validation, не пропускать молча |
| auth denied | alert/config incident, не бесконечный retry |
| disk quota | pause ingestion, alert/runbook |

Логи содержат `exportId`, `batchIndex`, `matchId`, schema/parser version, attempt и error category, но не credentials и не весь artifact.

## 10. Завершение и reconciliation

После последнего batch нельзя сразу ставить `completed`. Проверьте:

```sql
SELECT
    count() AS rows,
    min(tick) AS min_tick,
    max(tick) AS max_tick
FROM analytics.replay_combat_events_v1
WHERE parser_output_id = toUUID({parser_output_id:String});
```

Сравните `rows` с manifest. Для критичных агрегатов сравните дополнительные checksums/counts. Только затем:

```text
status = completed
exported_rows = expected_rows
analytics_available_at = now
```

Периодический reconciler находит:

- lease expired;
- completed с неверным count;
- artifact без export;
- export неизвестной версии;
- excessive lag;
- duplicate event IDs в sample/full affected output.

## Практика

1. Создайте migration ledger.
2. Реализуйте deterministic `exportId`/batch IDs.
3. Прочитайте NDJSON artifact потоково.
4. Добавьте runtime validation.
5. Проведите insert batches в staging.
6. После успешной вставки оборвите connection до получения ответа.
7. Запустите retry и докажите ожидаемый итог.
8. Убейте worker между insert и checkpoint, затем восстановите lease.

## Критерии готовности

- источник только validated immutable artifact;
- batch ограничен и детерминирован;
- нет insert per event;
- loader не держит весь artifact в памяти;
- at-least-once не выдается за exactly-once;
- dedup поведение проверено integration test;
- checkpoint и lease восстанавливаются;
- completion требует reconciliation;
- неизвестные схемы quarantined;
- lag, throughput, retries и parts наблюдаются.

[Предыдущая глава](04-mergetree-order-partition.md) · [Оглавление части](README.md) · [Следующая глава](06-columnar-queries.md)

