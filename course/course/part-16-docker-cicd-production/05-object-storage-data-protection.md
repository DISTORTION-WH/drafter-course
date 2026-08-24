# Глава 5. Object storage и защита данных

## 1. Что хранится в object storage

- raw provider responses по утверждённой retention/license policy;
- replay files, если разрешено и нужно;
- parser artifacts;
- analytics exports;
- backup artifacts/checksums;
- public static assets отдельно от private raw data.

PostgreSQL хранит metadata/provenance и object key, а не большой replay blob.

```sql
CREATE TABLE raw_objects (
  id uuid PRIMARY KEY,
  provider text NOT NULL,
  object_key text NOT NULL UNIQUE,
  content_sha256 text NOT NULL,
  content_length bigint NOT NULL,
  content_type text,
  captured_at timestamptz NOT NULL,
  retention_until timestamptz,
  processing_status text NOT NULL
);
```

`content_length` может быть bigint в БД, но API преобразует большие значения безопасно согласно контракту.

## 2. Object key

```text
raw/opendota/matches/2026/07/16/8173564281/<sha256>.json.zst
replays/2026/07/<match-id>/<sha256>.dem
```

Key строится сервером из validated segments. Не используйте пользовательское filename напрямую и не позволяйте `../`. Hash помогает dedup/integrity, но не доказывает доверенный источник.

## 3. Bucket separation

Разделите как минимум:

```text
environment: staging / production
access class: private raw / public assets / backups
```

Public access block включён для raw/backups. CDN/public bucket содержит только явно опубликованные assets. Backup account/role может быть отделён от runtime, чтобы компрометация приложения не удалила все копии.

## 4. Upload pipeline

```text
HTTP stream from allowlisted provider
-> size/time limit while streaming
-> hash incrementally
-> temporary object/quarantine
-> content validation/decompression limits
-> commit metadata + final key
-> processing job
```

Не загружайте весь replay в RAM. Защищайтесь от decompression bomb, huge archive, parser timeout и неожиданного формата.

## 5. Credentials

Worker получает минимальную роль:

- `PutObject` только нужного prefix;
- `GetObject` для parser prefix;
- без bucket policy/admin;
- delete только retention job, если нужен;
- backup bucket недоступен обычному API.

Используйте workload identity/short-lived credentials, если platform позволяет.

## 6. Signed URLs

Если клиенту когда-нибудь нужен private download, backend создаёт короткоживущий signed URL после authorization. Для текущего mobile анализатора raw/replay обычно не отдаётся напрямую.

Signed URL:

- короткий TTL;
- ограниченный method/object;
- не логируется целиком;
- не помещается в analytics;
- revocation limitations учтены;
- response headers/content disposition безопасны.

## 7. Encryption и integrity

- TLS при передаче;
- provider-managed или customer-managed encryption at rest согласно threat model;
- key rotation/access audit;
- SHA-256 checksum;
- versioning/object lock для backup по требованиям;
- lifecycle rules только после restore/retention review.

Шифрование не заменяет authorization.

## 8. Lifecycle

Пример policy:

```text
raw responses: hot 30 дней -> archive 180 дней -> delete
replays:       хранить только нужный subset/срок
temp uploads:  delete через 1 день
backups:       отдельная retention/immutability policy
```

Фактические сроки зависят от лицензий providers, privacy, стоимости и возможности пересчёта. В PostgreSQL metadata state обновляется согласованно; dangling objects/rows выявляет reconciliation job.

## 9. Failure cases

- object записан, DB transaction упала → orphan cleanup;
- DB row создан, upload не завершён → status `pending/failed`, retry;
- duplicate content → dedup policy;
- checksum mismatch → quarantine;
- object удалён раньше metadata → data quality alert;
- region outage → documented recovery;
- credentials leaked → rotate/revoke/audit.

Не пытайтесь создать распределённую transaction между PostgreSQL и object storage. Используйте state machine и reconciliation.

## 10. Практика

Локально используйте S3-compatible test service только как adapter target. Integration tests проверяют stream/hash/key/state/retry, а production provider-specific permissions и lifecycle — staging security checklist.

[Предыдущая глава](04-environments-managed-services.md) · [Оглавление](README.md) · [Следующая глава](06-migrations-deployment.md)
