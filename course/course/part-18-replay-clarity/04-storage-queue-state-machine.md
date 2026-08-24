# Глава 4. Object storage, очередь и state machine

## 1. Разделяем download и parse

```text
Replay discovery/download coordinator (Node)
  -> validates source/size/hash
  -> stores immutable private raw object
  -> creates parse run
  -> enqueues dispatch job

Java parser
  -> leases run
  -> reads exact raw object/hash
  -> writes versioned temp outputs
  -> publishes manifest
  -> completes run
```

Повторный parse не скачивает файл заново без причины.

## 2. Raw artifact table

```sql
CREATE TABLE replay_artifacts (
  id uuid PRIMARY KEY,
  match_id text NOT NULL,
  source_provider text NOT NULL,
  source_reference text NOT NULL,
  object_key text NOT NULL UNIQUE,
  content_sha256 text NOT NULL,
  byte_length bigint NOT NULL,
  fetched_at timestamptz NOT NULL,
  status text NOT NULL,
  UNIQUE (source_provider, source_reference, content_sha256)
);
```

Signed URL не сохраняется. Object key строит server. Raw object immutable; новый content hash — новый artifact/version.

## 3. Parse runs

```sql
CREATE TABLE replay_parse_runs (
  id uuid PRIMARY KEY,
  replay_artifact_id uuid NOT NULL REFERENCES replay_artifacts(id),
  parser_name text NOT NULL,
  parser_version text NOT NULL,
  schema_version integer NOT NULL,
  config_hash text NOT NULL,
  status text NOT NULL,
  attempt integer NOT NULL DEFAULT 0,
  lease_owner text,
  lease_until timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  output_manifest_key text,
  error_code text,
  quality_status text,
  UNIQUE (
    replay_artifact_id,
    parser_name,
    parser_version,
    schema_version,
    config_hash
  )
);
```

Unique key делает reprocessing этой конфигурации идемпотентным. Если нужен принудительный повтор same version, создайте controlled execution attempt table, а logical run остаётся один.

## 4. State machine

```text
pending
-> leased
-> running
-> validating
-> publishing
-> succeeded

failure:
-> failed_retryable -> pending (bounded retry)
-> failed_terminal
-> quarantined
-> unsupported
-> cancelled_obsolete
```

Каждый переход проверяется `WHERE status = expected`/transaction. Два workers не становятся владельцами одного run.

## 5. Lease

Worker получает lease с `lease_until` и heartbeat. Если process умер, другой worker после expiry может продолжить. Но он не предполагает, что предыдущий ничего не записал:

- output идёт во временный prefix с attempt ID;
- final manifest публикуется compare-and-set;
- checksum/record counts проверяются;
- orphan temp cleanup delayed;
- `succeeded` не парсится повторно.

## 6. BullMQ и Java boundary

Не заставляйте Java service знать внутренний Redis/BullMQ wire format. Стартовый контракт:

```text
Node BullMQ dispatch worker
-> internal authenticated POST /internal/v1/replay-parse-runs/{runId}:start
-> Java service atomарно leases run и выполняет/принимает job
-> status/result читается по run ID
```

Для длинного parse endpoint может принять `202 Accepted`, а Java durable executor/lease table продолжит. Node polls/subscribes/reconciles. Альтернатива — platform one-shot container job с тем же CLI/run ID. Выберите один вариант; state table остаётся source of truth.

## 7. Object paths

```text
replays/raw/<year>/<match-id>/<sha256>.dem
replays/outputs/<match-id>/<run-id>/attempt-<n>/...
replays/manifests/<match-id>/<run-id>.json
```

Final manifest immutable и указывает hashes artifacts. Alias «current» хранится в PostgreSQL после quality validation, не mutable object без истории.

## 8. Retry classification

Retryable:

- object storage timeout;
- temporary network/DB error;
- lost worker/lease;
- platform eviction.

Terminal/quarantine:

- checksum mismatch после повторного trusted download;
- invalid/truncated replay;
- unsupported build/protocol;
- deterministic parser exception на golden reproduction;
- output limit exceeded;
- match ID mismatch.

Один poison replay не блокирует queue partition.

## 9. Reconciliation

Периодически ищет:

- expired leases;
- run succeeded без manifest;
- manifest без DB success;
- raw object missing;
- orphan temp outputs;
- pending слишком долго;
- current output на старой parser version;
- output canonical mismatch.

## 10. Практика

Реализуйте state transitions без Clarity. Fake parser ждёт, пишет artifact, падает transient/terminal. Запустите два workers и докажите: один logical run, lease recovery, bounded retry и один final manifest.

[Предыдущая глава](03-clarity-event-model.md) · [Оглавление](README.md) · [Следующая глава](05-parser-schema-output.md)

