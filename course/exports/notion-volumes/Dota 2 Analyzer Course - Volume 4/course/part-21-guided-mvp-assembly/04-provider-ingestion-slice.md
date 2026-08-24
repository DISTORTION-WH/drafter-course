# Глава 4. Вертикаль №2: разрешённый provider и ingestion

## Цель

Заменить fixture реальным разрешённым provider response, не связывая его нестабильный JSON с domain/API/mobile.

## 1. Preflight

До network call заполните:

```text
provider name and endpoint
terms URL/review date
commercial status
authentication
rate/call limit
required attribution
allowed caching/retention
personal data fields
failure/contact procedure
```

Если commercial status `pending`, вертикаль остаётся development/staging и не входит в платный release.

## 2. Provider boundary

```text
HTTP unknown JSON
-> ProviderMatchV1 parser
-> normalizeProviderMatch
-> CanonicalMatchCommand
-> transaction/upsert
```

Не экспортируйте `ProviderMatchV1` из worker в API/mobile.

## 3. Safe HTTP client

Client имеет:

- fixed base URL allowlist;
- secret только на backend;
- timeout/abort;
- retry только безопасных temporary failures;
- exponential backoff + jitter;
- rate-limit/quota accounting;
- pagination cursor limits;
- response size limit;
- content-type/status validation;
- correlation/provider request ID;
- no full payload/secret in logs.

Не повторяйте `400`, auth failure и invalid schema бесконечно.

## 4. Raw archive

Перед normalization сохраните разрешённый raw response:

```text
provider/date/request-id/body.json.gz
metadata.json
```

Metadata:

```text
provider
endpoint/version
requested/received at
HTTP status
content hash
schema parser version
license/retention class
```

Raw bucket private. API/mobile не получают object key/signed raw URL.

## 5. Job state

```text
discovered -> queued -> fetching -> archived
-> normalized -> committed -> completed
```

Terminal:

```text
unsupported_schema
rights_denied
invalid_identity
quarantined
```

Retryable:

```text
timeout
429 with retry policy
temporary 5xx
temporary storage unavailable
```

Job имеет deterministic logical key, lease, attempts и last safe error category.

## 6. Idempotent merge

Повтор одного raw hash:

- не создаёт duplicate match;
- не уменьшает data quality;
- обновляет только поля по documented ownership policy;
- сохраняет provenance;
- не отправляет duplicate notification;
- оставляет audit correction.

Для каждого поля определите owner/provider priority. `COALESCE` не является merge policy.

## 7. Fixture-first contract tests

Сохраните sanitized fixtures:

```text
valid scheduled
valid completed
missing optional roster
unknown status
numeric/string ID variants
provider adds new field
provider removes required field
rate limit response
malformed/truncated JSON
```

Fixture license/provenance документируется. Real secret/cookie/header отсутствуют.

## 8. Reconciliation

Периодическая команда проверяет:

- discovered without job;
- archived without canonical row;
- canonical completed without required fields;
- job lease expired;
- duplicate provider identity;
- latest source lag;
- invalid schema rate;
- rights/retention expiry.

Reconciler создаёт bounded repairs, а не бесконечную лавину jobs.

## 9. Mobile transition

В API contract fixture и provider match имеют одну canonical форму. Mobile не меняется. Добавляется только честный `source/freshness/quality` metadata.

Это главный тест архитектуры: смена источника не должна переписывать screen.

## 10. Failure drill

В staging:

1. timeout;
2. 429;
3. bad JSON;
4. неизвестный status;
5. duplicate delivery;
6. raw storage недоступен;
7. worker kill после archive до DB commit;
8. provider unavailable 30 минут.

Основной API возвращает последний validated result со `stale` либо controlled unavailable state.

## Definition of Done

- provider legal/limits preflight записан;
- unknown JSON runtime validated;
- raw allowed artifact hashed/private;
- canonical model не зависит от provider DTO;
- job state/lease/retry bounded;
- merge идемпотентен;
- fixtures/contract tests существуют;
- reconciliation восстанавливает gap;
- API/mobile contract не изменился из-за provider;
- outage/failure drill пройден.

[Предыдущая глава](03-first-vertical-slice.md) · [Оглавление](README.md) · [Следующая глава](05-core-domain-screens.md)

