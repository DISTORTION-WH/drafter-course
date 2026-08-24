# Глава 9. Нагрузочные испытания и эксплуатация

## Цель

Проверить не один красивый запрос, а систему под одновременной загрузкой, merges и пользовательским чтением. Подготовить dashboard, alerts, backup/restore и capacity plan.

## 1. Нагрузочный тест начинается с модели

Опишите production-like workload:

| Сценарий | Доля | Параметры | SLO |
|---|---:|---|---:|
| heatmap одного hero/patch | 45% | 32×32, tier filter | p95 < 750 ms |
| hero damage ranking | 30% | top 30 | p95 < 500 ms |
| match timeline | 15% | один match | p95 < 300 ms |
| wide internal report | 10% | 12 месяцев | async/offline |

Параллельно:

```text
loader: 200k rows/s burst
steady: 20k rows/s
materialized views: enabled
background merges: natural
```

Тест без inserts не показывает конкуренцию ingestion и queries.

## 2. Dataset должен быть похож

Важно не только число строк:

- распределение patches/tournament tiers;
- hot recent period и cold history;
- число heroes/matches;
- event type proportions;
- реальные null/quality flags;
- batch sizes;
- compression/cardinality;
- skew: популярный patch получает больше запросов.

Не используйте production PII. Генератор должен создавать synthetic IDs и фиксированный seed, а разрешённые replay-derived fixtures — быть обезличенными и проверенными по лицензии.

## 3. Фазы теста

1. **Smoke** — малый rate, проверка correctness.
2. **Baseline** — один query type без ingestion.
3. **Steady load** — ожидаемый peak 30–60 минут.
4. **Burst** — краткий 2–5× всплеск.
5. **Mixed** — query + ingestion + merges.
6. **Soak** — много часов для parts/memory/lag.
7. **Failure** — restart/network/storage pressure.
8. **Recovery** — backlog catch-up без уничтожения query SLO.

Не начинайте с максимального stress на общей production среде.

## 4. Что измерять

### Пользовательский слой

- request rate;
- p50/p95/p99;
- errors/timeouts;
- stale/unavailable responses;
- cache hit rate;
- response bytes.

### ClickHouse query

- query duration;
- rows/bytes read;
- result rows/bytes;
- peak memory;
- selected parts/marks;
- exception code;
- concurrent queries;
- queue/wait time, если применимо.

### Ingestion

- rows/bytes per second;
- batch latency/size;
- retry rate;
- pending/oldest age;
- source-to-analytics freshness;
- rejected/quarantined rows;
- completed reconciliation.

### Storage/background

- active parts per partition;
- part creation rate;
- merges running/backlog;
- disk bytes/free space;
- compressed ratio;
- CPU/memory/network IO;
- replica lag/readonly state для выбранной топологии.

## 5. Percentiles, а не среднее

Среднее 100 ms может скрывать редкие запросы по 8 секунд. Смотрите p50, p95, p99 и maximum с контекстом.

```text
p50 = обычный опыт
p95 = хвост, который регулярно видит часть пользователей
p99 = редкие, но важные всплески
```

Percentile требует достаточного числа samples и стабильного окна. Не сравнивайте p99 из десяти запросов.

## 6. Cold и warm

Warm run использует нагретые filesystem caches. После restart или запроса старого патча cache может быть cold.

Отдельно маркируйте:

- first/cold query;
- repeated/warm query;
- hot recent range;
- cold historical range;
- после deploy/restart;
- во время large merge.

Не очищайте OS cache на общем сервере без разрешения и runbook.

## 7. Инструмент теста

Можно использовать k6 для HTTP API, собственный TypeScript workload runner или специализированный инструмент. Важнее воспроизводимый scenario и сохранённые параметры.

ClickHouse публикует [benchmark hub](https://clickhouse.com/benchmarks) и описывает собственный инструмент [ClickCannon](https://clickhouse.com/blog/building-clickcannon-a-tool-for-benchmark-clickhouse). Это ориентиры, а не обязанность внедрить конкретный инструмент.

Для вашего runner зафиксируйте:

```text
git commit
dataset manifest
server/client versions
schema hash
query set hash
duration/rate/concurrency
environment size
date/time
```

## 8. Query protection

Production API использует:

- readonly user;
- per-query timeout;
- max result rows/bytes;
- memory limit;
- endpoint concurrency limiter;
- bounded date range;
- circuit breaker;
- cancellation при закрытии request, если поддерживается;
- query fingerprint, а не raw user data в metric labels.

Internal reports уходят в async job и object artifact, если не укладываются в interactive budget.

## 9. Dashboards и alerts

Минимальный dashboard:

```text
Analytics API
  traffic / errors / latency
  freshness / stale / unavailable

Queries
  top fingerprints by time/bytes/memory
  timeouts / failures

Ingestion
  rate / batch size / retries
  pending / oldest / reconciliation

Storage
  disk / parts / merges
  compression / growth forecast
```

Alerts должны означать действие:

- oldest pending > freshness SLO → проверить loader/ClickHouse;
- disk forecast < 14 days → capacity/retention;
- parts растут без merges → проверить batch/merge pressure;
- error rate > threshold → feature flag/incident;
- query memory kills → найти fingerprint/limit;
- reconciliation divergence → остановить promotion, rebuild.

Не создавайте alert на каждую одиночную retryable ошибку.

## 10. Backup и восстановление

Поскольку ClickHouse — производный слой, главный recovery path — rebuild из:

- canonical PostgreSQL;
- immutable parser artifacts;
- export manifests;
- versioned schemas/code.

Но rebuild может занять дни, поэтому backups всё равно полезны. Зафиксируйте:

- что backup'ится;
- encryption и доступ;
- retention;
- совместимость версии;
- RPO/RTO;
- restore destination;
- проверку counts/checksums после restore.

Проведите restore в отдельное окружение. Фраза «backup job зелёный» не доказывает восстановление.

## 11. Managed или self-hosted

Managed сервис уменьшает объём cluster operations, но не отменяет:

- схему и query design;
- cost controls;
- access/TLS/secrets;
- version/change management;
- observability;
- экспорт и reconciliation;
- vendor outage/fallback.

Self-hosted требует дополнительно topology, replicas, coordination, disks, upgrades, failover и on-call expertise. Для небольшой команды managed вариант часто рациональнее, но решение зависит от бюджета, региона, требований данных и уже имеющейся платформы.

## 12. Capacity plan

Ежемесячно оцените:

```text
events_per_match
matches_per_day
compressed_bytes_per_event
replication_factor
retention_days
aggregate overhead
free-space reserve
```

Пример формулы:

```text
monthly_raw_bytes =
  events_per_day * compressed_bytes_per_event * 30
```

Добавьте replicas, temporary merge space и рост. Не планируйте диск ровно под текущий compressed size.

## Практика

1. Создайте фиксированный dataset manifest.
2. Напишите mixed HTTP/ingestion workload.
3. Проведите steady, burst и soak.
4. Снимите p50/p95/p99 и rows/bytes/memory.
5. Увеличьте inserts до появления мелких parts, затем исправьте batching.
6. Остановите loader, создайте backlog и измерьте recovery.
7. Переключите API на старый adapter при error threshold.
8. Восстановите backup или rebuild subset в чистую базу.

## Критерии готовности

- workload отражает реальные доли запросов;
- ingestion тестируется одновременно с reads;
- dataset воспроизводим и безопасен;
- cold/warm и p95/p99 разделены;
- parts/merges/freshness входят в отчёт;
- query budgets реально применяются;
- dashboard и actionable alerts работают;
- backlog recovery не нарушает критичный API SLO;
- rollback flag проверен;
- restore/rebuild завершён и сверён.

[Предыдущая глава](08-migration-dual-read.md) · [Оглавление части](README.md) · [Следующая глава](10-final-clickhouse-lab.md)

