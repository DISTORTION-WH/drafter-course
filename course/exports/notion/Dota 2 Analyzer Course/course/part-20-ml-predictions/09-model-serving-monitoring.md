# Глава 9. Публикация модели, serving и мониторинг

## Цель

Доставить прогноз в Node.js/React Native без обучения в request path, без загрузки недоверенного Python artifact backend'ом и без потери связи между probability, features, моделью и cutoff.

## 1. Самая простая serving-архитектура

Для расписания профессиональных матчей не нужен синхронный Python microservice на каждый mobile request.

```text
upcoming match + completed draft
-> durable prediction job
-> build exact point-in-time feature snapshot
-> trusted Python batch runner
-> probability + manifest validation
-> PostgreSQL prediction record
-> Node.js API read
-> mobile
```

Преимущества:

- низкая API latency;
- Python outage не ломает чтение уже опубликованных прогнозов;
- каждый output аудируем;
- retries идемпотентны;
- модель не загружается в каждом Node request;
- проще ограничить CPU/RAM/time.

## 2. Model registry

PostgreSQL table:

```sql
CREATE TABLE prediction_models (
  model_version text PRIMARY KEY,
  status text NOT NULL,
  problem_version text NOT NULL,
  eligibility_version text NOT NULL,
  feature_schema_version text NOT NULL,
  cutoff_definition text NOT NULL,
  artifact_key text NOT NULL,
  artifact_sha256 text NOT NULL,
  dataset_id text NOT NULL,
  dataset_sha256 text NOT NULL,
  code_commit text NOT NULL,
  dependency_lock_sha256 text NOT NULL,
  trained_from timestamptz NOT NULL,
  trained_to_exclusive timestamptz NOT NULL,
  metrics jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  promoted_at timestamptz,
  retired_at timestamptz,
  CHECK (status IN ('candidate', 'champion', 'retired', 'rejected'))
);
```

На один problem/product одновременно один champion — через transaction/partial unique constraint или отдельный current pointer.

`metrics jsonb` удобен для manifest copy, но critical filter fields лучше отдельными typed columns.

## 3. Model manifest

Immutable JSON рядом с artifact:

```json
{
  "modelVersion": "postdraft-logistic-2026-07-001",
  "problemVersion": "pro-game-postdraft-v1",
  "featureSchemaVersion": "postdraft-features-v2",
  "eligibilityVersion": "completed-pro-game-v3",
  "cutoffDefinition": "persisted draft_completed_at before gameplay",
  "trainingWindow": {
    "from": "2023-01-01T00:00:00Z",
    "toExclusive": "2026-01-01T00:00:00Z"
  },
  "calibrationWindow": {
    "from": "2026-01-01T00:00:00Z",
    "toExclusive": "2026-04-01T00:00:00Z"
  },
  "dataset": { "id": "...", "sha256": "..." },
  "codeCommit": "...",
  "pythonVersion": "record exact value",
  "dependencyLockSha256": "...",
  "artifactSha256": "...",
  "calibration": "sigmoid-v1",
  "metrics": { "logLoss": 0.0, "brier": 0.0, "coverage": 0.0 },
  "createdAt": "..."
}
```

До запуска runner проверяет manifest schema, allowlisted model status, checksum и feature compatibility.

## 4. Prediction records

```sql
CREATE TABLE match_predictions (
  prediction_id uuid PRIMARY KEY,
  match_id bigint NOT NULL REFERENCES matches(id),
  model_version text NOT NULL REFERENCES prediction_models(model_version),
  feature_snapshot_id uuid NOT NULL,
  prediction_cutoff timestamptz NOT NULL,
  generated_at timestamptz NOT NULL,
  published_at timestamptz,
  radiant_win_probability double precision NOT NULL,
  status text NOT NULL,
  reason_code text,
  input_schema_hash text NOT NULL,
  output_sha256 text NOT NULL,
  UNIQUE (match_id, model_version, prediction_cutoff),
  CHECK (radiant_win_probability >= 0 AND radiant_win_probability <= 1),
  CHECK (status IN ('candidate', 'published', 'superseded', 'rejected'))
);
```

Для `unavailable/not_eligible` можно хранить отдельную attempt/status table, потому что probability отсутствует и `NOT NULL` должна оставаться честной.

## 5. Feature snapshot

Feature builder создаёт immutable snapshot до model runner:

```json
{
  "featureSnapshotId": "...",
  "matchId": "123",
  "predictionCutoff": "...",
  "featureSchemaVersion": "postdraft-features-v2",
  "values": {},
  "provenance": {},
  "sha256": "..."
}
```

Runner не запрашивает live database features произвольным SQL во время predict. Это предотвращает training-serving skew и позволяет повторить output.

Перед prediction:

- snapshot создан до deadline;
- model ожидает ту же schema version/hash;
- required fields присутствуют;
- no future availability violation;
- artifact checksum верен;
- match ещё находится в допустимом product state.

## 6. Idempotent prediction job

Logical key:

```text
match_id + prediction_cutoff + model_version + feature_snapshot_sha256
```

Повторный job:

- возвращает существующий одинаковый output;
- не перезаписывает published probability;
- создаёт новую запись только для новой model/snapshot/cutoff version;
- сохраняет attempts/errors отдельно;
- не публикует частичный result.

Publish transaction проверяет, что model всё ещё champion и cutoff/deadline не нарушен. Candidate можно сохранять для shadow, но API его не показывает.

## 7. API contract

```http
GET /v1/matches/{matchId}/prediction
```

Успешный ответ:

```json
{
  "status": "available",
  "matchId": "123",
  "cutoff": "post_draft",
  "generatedAt": "2026-07-16T18:42:10Z",
  "radiantWinProbability": 0.61,
  "direWinProbability": 0.39,
  "model": {
    "version": "postdraft-logistic-2026-07-001",
    "methodology": "team history, roster continuity, patch, tier and completed draft"
  },
  "coverage": {
    "rostersKnown": true,
    "draftComplete": true
  },
  "disclaimer": "Statistical estimate, not a guarantee."
}
```

Недоступность — typed state, а не fake probability:

```json
{
  "status": "unavailable",
  "reason": "INSUFFICIENT_HISTORY"
}
```

Internal artifact keys, feature vectors, pickle errors и stack traces не возвращаются.

## 8. Mobile UI

- обе вероятности дополняют друг друга до 100% после согласованного округления;
- время/cutoff явно показаны;
- version/methodology доступна в details;
- `unavailable` имеет человеческое объяснение;
- old prediction не выдаётся как live после изменения draft/cutoff;
- факт результата визуально отделён от прежнего прогноза;
- нет betting call-to-action;
- accessibility label: «Оценка вероятности победы Radiant — 61 процент»;
- цвет не единственный носитель информации.

Не показывайте список «факторов +12%», если модель не имеет проверенного explanation contract.

## 9. Безопасность artifact

Python pickle/joblib может исполнить код при load. Поэтому:

- private object storage;
- service identity с read-only нужного prefix;
- artifact checksum/signature;
- allowlisted model registry;
- no user upload;
- isolated runner/container;
- non-root, read-only filesystem где возможно;
- egress limits;
- CPU/RAM/time/output limits;
- dependency/security scan;
- secrets не внутри model.

Node API вообще не обязан загружать artifact.

## 10. Monitoring

### Pipeline

- eligible matches;
- feature snapshots success/error;
- prediction job latency;
- deadline misses;
- published coverage;
- rejection reasons;
- model/schema mismatch;
- champion version distribution.

### Predictions до labels

- probability histogram;
- extreme probability rate;
- missing/unknown features;
- patch/tier slices;
- duplicate/superseded records.

### После labels

- rolling log loss/Brier/AUC/accuracy;
- reliability bins;
- Elo/champion difference;
- coverage;
- corrected/excluded labels;
- patch/tier/time slices.

## 11. Champion/challenger

Новая модель сначала создаёт candidate predictions параллельно:

```text
champion -> visible
challenger -> hidden, measured
```

Сравнение корректно только на одинаковых eligible matches/cutoffs. Если challenger имеет другое coverage, публикуйте paired metrics и общие coverage metrics.

Promotion — atomic pointer/status transaction. Rollback возвращает previous champion; original predictions сохраняются.

## 12. Failure modes

| Сбой | Поведение |
|---|---|
| feature job опоздал | unavailable, deadline miss metric |
| unknown feature schema | reject/quarantine |
| artifact checksum mismatch | security incident, no load |
| Python runner down | queued retry before deadline; API independent |
| model returns NaN/out of range | reject, alert |
| new patch safe mode | Elo/unavailable by policy |
| PostgreSQL publish conflict | idempotent read/retry |
| wrong champion | transaction prevents publish/rollback pointer |

Никаких silent defaults.

## Практика

1. Создайте registry/prediction/attempt migrations.
2. Опишите manifest runtime schema.
3. Создайте immutable feature snapshot.
4. Запустите trusted offline runner.
5. Опубликуйте prediction transactionally.
6. Добавьте generated OpenAPI client/mobile states.
7. Включите challenger shadow.
8. Смоделируйте checksum mismatch, NaN и missed deadline.
9. Откатите champion без удаления records.

## Критерии готовности

- prediction не вычисляется в mobile request;
- Node API не загружает недоверенный pickle;
- model/dataset/code/dependencies checksummed;
- feature snapshot point-in-time и immutable;
- job идемпотентен;
- published probability не перезаписывается после результата;
- API имеет typed unavailable states;
- cutoff/version/methodology видны;
- pre-label и delayed-label monitoring работают;
- champion/challenger/rollback атомарны.

[Предыдущая глава](08-calibration-drift.md) · [Оглавление части](README.md) · [Следующая глава](10-final-ml-lab.md)

