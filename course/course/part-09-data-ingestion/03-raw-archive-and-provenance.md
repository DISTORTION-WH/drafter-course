# Глава 3. Raw archive, provenance и versioning

[← Глава 2](02-provider-adapter-canonical-model.md) · [Оглавление](README.md) · [Глава 4 →](04-ingestion-state-machine.md)

## Зачем raw, если есть canonical tables

- Исправить parser и переиграть историю без новой квоты.
- Доказать происхождение спорной цифры.
- Сравнить provider response во времени.
- Найти contract drift.
- Восстановить поле, которое раньше не сохраняли.

Raw archive не отменяет retention/privacy policy.

## Object key

```text
raw/opendota/match/8000000000/
  2026/07/16/2026-07-16T12-00-00.000Z-<sha256>.json.gz
```

Key строится только из validated components. Hash относится к canonical serialization raw body (или исходным bytes — выберите и зафиксируйте). Compression не должна менять identity содержимого.

## Envelope

```ts
type RawEnvelopeV1 = {
  envelopeVersion: 1;
  provider: string;
  resourceType: string;
  resourceId: string;
  requestedAt: string;
  receivedAt: string;
  httpStatus: number;
  contentType: string | null;
  selectedHeaders: Record<string, string>;
  bodySha256: string;
  payload: unknown;
};
```

Selected headers — allowlist (`etag`, `last-modified`, safe quota metadata). Не архивируйте authorization/cookies/API key.

## Database manifest

Не кладите payload целиком в OLTP, если он большой. В PostgreSQL хранится manifest:

```sql
CREATE TABLE raw_objects (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  object_key text NOT NULL UNIQUE,
  body_sha256 text NOT NULL,
  received_at timestamptz NOT NULL,
  envelope_version integer NOT NULL,
  byte_size bigint NOT NULL,
  parser_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT raw_objects_size_non_negative CHECK (byte_size >= 0)
);

CREATE INDEX raw_objects_resource_received_idx
  ON raw_objects (provider, resource_type, resource_id, received_at DESC);
```

## Immutability

Существующий raw object не перезаписывается. Новый fetch — новый object/manifest. Если identical hash, policy может ссылаться на existing bytes, но retrieval event всё равно может быть полезен.

## Parser version

Canonical rows должны иметь lineage:

- raw object ID/hash;
- adapter/parser version;
- schema/mapping version;
- normalized at;
- provider retrieved at.

Git commit hash может быть дополнительным metadata, но semantic parser version проще использовать для controlled replay.

## Replay

```text
select raw manifests where parser_version < target
→ enqueue normalize-existing-raw jobs
→ read object (не provider)
→ run new adapter
→ compare/merge canonical transactionally
→ mark new parser version
```

Не перезаписывайте raw.

## Retention и access

Bucket private, encryption at rest, least-privilege service identity, audit logs, lifecycle policy. Отдельно классифицируйте персональные данные и право хранения/redistribution. Backup raw archive и backup PostgreSQL manifest должны быть согласованы.

## Практика

1. Сохраните два fetch одного ID.
2. Проверьте hash и object keys.
3. Убедитесь, что key/API headers отсутствуют.
4. Напишите reader, проверяющий SHA-256 до normalize.
5. При несовпадении hash отправьте object в quarantine.

## Самопроверка

- [ ] Raw immutable и checksum проверяется.
- [ ] Manifest связывает object с ресурсом/временем.
- [ ] Secrets не архивируются.
- [ ] Parser version позволяет replay.
- [ ] Есть retention/privacy решение до production.
