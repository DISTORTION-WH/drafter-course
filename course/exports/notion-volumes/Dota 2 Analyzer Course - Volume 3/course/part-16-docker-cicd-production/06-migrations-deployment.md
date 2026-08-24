# Глава 6. Миграции при deployment

## 1. Почему миграция опаснее обычного кода

Старый API ещё обслуживает запросы, пока новый разворачивается. Поэтому schema должна некоторое время поддерживать обе версии.

Плохой rollout:

```text
1. rename/drop column
2. старые replicas продолжают SELECT old_column
3. production errors
```

Безопасный принцип — expand, migrate, contract.

## 2. Expand-contract

Допустим, `matches.league_name` заменяется ссылкой `tournament_id`.

### Release A: expand

- добавить nullable `tournament_id`;
- добавить foreign key/index безопасным способом;
- старый код продолжает читать `league_name`;
- новый код умеет dual-write или fallback.

### Backfill

- отдельный resumable job небольшими batch;
- progress/checkpoint;
- rate/lock monitoring;
- invalid rows в отчёт, не молча;
- повтор безопасен.

### Release B: switch

- чтение из `tournament_id`;
- временный fallback/metrics;
- verify completeness.

### Release C/D: contract

- перестать писать старое поле;
- после окна совместимости добавить `NOT NULL`, если данные готовы;
- удалить старое поле отдельным поздним release.

## 3. Migration job

Pipeline:

```text
build exact image
-> acquire environment deployment lock
-> preflight DB version/backup/readiness
-> run exact image with migrate command and migration role
-> verify migration table/schema
-> deploy application instances
```

Migration job:

- один экземпляр;
- timeout;
- structured log без secrets;
- advisory lock/tool lock против конкурента;
- ненулевой exit code при ошибке;
- не запускает seed production;
- использует отдельный short-lived credential.

## 4. Transactional и non-transactional operations

Многие DDL можно выполнить в transaction, но отдельные PostgreSQL операции, например некоторые concurrent index operations, имеют особые требования. Migration tool должен явно поддерживать такой файл/режим.

Нельзя слепо оборачивать всё в одну transaction или, наоборот, отключать transactions глобально. Для каждой migration фиксируйте:

- lock level;
- ожидаемое время;
- transaction mode;
- disk impact;
- compatibility;
- retry/resume;
- rollback/forward fix.

## 5. Locks и таблицы большого размера

Перед production:

- измерить row count/size на staging-like dataset;
- установить осознанные `lock_timeout`/`statement_timeout` для job;
- создать index подходящим online/concurrent способом;
- backfill batchами по stable key;
- не переписывать гигантскую таблицу в peak без плана;
- наблюдать replication lag/storage;
- иметь cancel criteria.

Staging с 100 строками не предсказывает lock на миллионах events.

## 6. Rollback schema

Rollback application image проще, чем rollback данных. Down migration может уничтожить новые rows/columns. Поэтому production recovery чаще:

```text
остановить rollout
-> вернуть старый совместимый image
-> оставить expanded schema
-> исправить forward новой migration
```

Destructive rollback выполняется только по отдельному проверенному плану и backup, не автоматически.

## 7. API/mobile compatibility

Старая mobile версия может жить месяцами. DB migration влияет на backend, а backend сохраняет `/v1` contract. Новое response field optional для старого клиента; удаление/смена смысла требует version policy.

Queue consumers также совместимы: сначала deploy consumer, который понимает старый и новый payload, затем producer.

## 8. Migration test

```text
empty DB -> все migrations -> schema assertions
previous snapshot -> seed edge data -> new migration -> integrity
old app contract -> expanded schema -> smoke
new app contract -> expanded/backfilled schema -> smoke
```

Для значимой migration сделайте production-scale dry run на восстановленной и безопасно изолированной копии/синтетическом объёме согласно privacy policy.

## 9. Release manifest

```json
{
  "release": "2026.07.16.1",
  "commit": "abc123",
  "imageDigest": "sha256:...",
  "requiredSchemaVersion": "0042",
  "openApiRevision": "...",
  "mobileMinimumVersion": "..."
}
```

Приложение при boot проверяет совместимый schema version без раскрытия credentials.

## 10. Упражнение

Спроектируйте expand-contract для нового обязательного поля `tournament_tier`, включая nullable add, backfill source, dual read/write, validation metric, constraint и позднее удаление fallback.

[Предыдущая глава](05-object-storage-data-protection.md) · [Оглавление](README.md) · [Следующая глава](07-github-actions-ci.md)

