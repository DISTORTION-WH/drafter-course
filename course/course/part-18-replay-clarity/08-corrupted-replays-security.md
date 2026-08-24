# Глава 8. Повреждённые replays, лимиты и изоляция

## 1. Категории ошибок

```text
DOWNLOAD_NOT_FOUND / EXPIRED_URL
DOWNLOAD_TIMEOUT / STORAGE_TIMEOUT
CONTENT_LENGTH_LIMIT
CHECKSUM_MISMATCH
INVALID_HEADER
TRUNCATED_REPLAY
UNSUPPORTED_ENGINE_OR_BUILD
MATCH_ID_MISMATCH
PARSE_TIMEOUT
MEMORY_LIMIT
OUTPUT_RECORD_LIMIT
OUTPUT_BYTE_LIMIT
CLARITY_EXCEPTION
INTERNAL_INVARIANT
```

Machine code стабилен. Full stack/log доступен операторам, не public API.

## 2. Retry matrix

| Code | Retry | Действие |
|---|---:|---|
| download/storage timeout | да, bounded backoff | повторить |
| expired source URL | после refresh metadata | новый source reference |
| checksum mismatch | ограниченно/redownload | затем quarantine |
| truncated/invalid header | нет | quarantine/source issue |
| unsupported build | нет сейчас | backlog для parser update |
| parse timeout | максимум controlled retry с большим class | затем terminal |
| memory/output limit | нет тем же config | investigate |
| internal invariant | нет автоматического storm | Sentry/bug |

Не retry-ите deterministic corruption пятьдесят раз.

## 3. Download safety

- source URL строится/получается от allowlisted provider;
- HTTPS;
- redirects проверяются и ограничены;
- private/loopback/internal IP запрещены;
- content length до и во время stream;
- connect/read/overall timeout;
- SHA-256 во время stream;
- temp file с server-generated name;
- disk quota;
- atomic publish после complete;
- partial temp удаляется.

Provider `Content-Length` не считается единственной защитой.

## 4. Container sandbox

Parser:

- non-root;
- read-only root filesystem;
- отдельный temp volume с size limit;
- CPU/memory/JVM heap limits;
- process/job deadline;
- no host mounts/socket;
- seccomp/platform sandbox по возможности;
- egress только storage/control endpoints или вообще pre-staged input;
- workload role только read raw/write own attempt prefix;
- без Steam/API/DB admin secrets.

Java `-Xmx` ниже container memory limit оставляет место native/mapped buffers. Значения измеряются на largest golden replay.

## 5. Mapped file caveat

`MappedFileSource` использует memory mapping и требует локальный файл. Большой mapped file не равен Java heap, но влияет на address space/page cache/resource behavior. Наблюдайте RSS, temp disk и cleanup; не полагайтесь только на `-Xmx`.

## 6. Output explosion

Limits:

```text
max records per artifact
max total output bytes
max unknown events
max warnings
max positions per player/minute
max parse duration
```

Writer проверяет до записи следующего record и завершает controlled code. Partial output никогда не становится current.

## 7. PII/content allowlist

Не подписывайте processors на chat/voice/user messages «на всякий случай». Даже если Clarity может их извлечь, наша цель не требует их хранения. Raw replay доступен ограниченному service role и имеет retention.

Debug dump golden replay проходит privacy review и не загружается в public CI artifacts.

## 8. Quarantine

Quarantine record:

- artifact/run/hash;
- code;
- parser/game build;
- safe exception fingerprint;
- first/last attempt;
- owner/status;
- retention/review action.

Сам файл остаётся в private restricted prefix по policy. Operator может воспроизвести в isolated environment без production credentials.

## 9. Observability

```text
replay_parse_jobs_total{outcome,error_code,parser_version}
replay_parse_duration_seconds{outcome,parser_version}
replay_output_bytes
replay_unknown_events_total{category,game_build_bucket}
replay_queue_oldest_job_age_seconds
```

Никаких match/object IDs в labels; они в logs/trace. Alert на резкий failure по новому game build/release, не на один corrupted userless file.

## 10. Fault tests

Создайте безопасные synthetic variants:

- empty/short file;
- truncated copy;
- wrong expected hash;
- oversized generated stream;
- slow storage fake;
- parser injected timeout;
- output sink limit;
- worker killed mid-publish;
- expired lease;
- unsupported build fixture.

Не fuzz-ите production worker без sandbox/capacity plan. Позже добавьте coverage-guided fuzzing parser boundary в изолированном CI.

[Предыдущая глава](07-positions-heatmaps.md) · [Оглавление](README.md) · [Следующая глава](09-golden-replays-testing.md)

