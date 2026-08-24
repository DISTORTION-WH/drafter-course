# Глава 10. Итоговая лабораторная: честный прогнозный baseline

## Цель

Создать draft-aware вероятность победы Radiant для профессионального матча: от point-in-time dataset до скрытого challenger, published champion, мобильного отображения и мониторинга после появления результата.

## 1. Условия старта

Лабораторная начинается, только если:

- canonical match/team/tournament/draft data стабильны;
- хранится история team/roster identities;
- `draft_completed_at` записывается до gameplay events;
- label availability/corrections аудируются;
- достаточно eligible исторических игр;
- feature snapshots можно воспроизвести;
- product/legal review разрешает статистическое отображение;
- основное приложение работает без ML.

Если условий нет, создайте readiness report и остановите ML-публикацию. Это правильный инженерный результат.

## 2. Problem contract

Создайте `ml/docs/pro-game-postdraft-v1.md`:

```text
observation: one eligible professional game
target: radiant_win 0/1
cutoff: persisted draft_completed_at before gameplay
deadline: before first gameplay event / product-defined expiry
eligible: completed-pro-game-v3 + known teams + complete valid draft
primary metrics: log loss, Brier, calibration
secondary: ROC-AUC, accuracy, coverage
forbidden: all live/post-match/future information
safe mode: unavailable or Elo-only after major patch
```

Pre-draft model, если нужен, получает отдельный problem/model ID и dataset.

## 3. Feature dataset v1

Минимальные point-in-time features:

```text
team Elo before cutoff
recent win rate/games with shrinkage
roster continuity and known ratio
days since prior game
patch ID
tournament tier
Radiant/Dire completed picks as versioned hero vector
optional bans/order only if contract reliable
```

Для каждой строки:

- stable example ID;
- match/series IDs как metadata, не blind features;
- cutoff/label observed times;
- feature/eligibility/source versions;
- provenance/max availability;
- target;
- exclusion reason при исключении.

Сохраните Parquet + JSON manifest + SHA-256 в private object storage.

## 4. Leakage gate

Автоматические проверки:

1. все contributing records доступны до cutoff;
2. current match не входит в recent/history/Elo update;
3. future mutation не меняет старые rows;
4. labels только 0/1;
5. IDs уникальны;
6. запрещённые columns отсутствуют в X;
7. roster выбирается point-in-time;
8. preprocessing не fit на будущих окнах;
9. series/time boundaries соблюдены;
10. 20–50 random examples прошли ручной provenance review.

Failure любого critical check блокирует training/promotion.

## 5. Split manifest

Определите exact:

```text
train range
validation range
calibration range
test range
gaps
series grouping policy
minimum examples per window
patch distribution
```

Сохраните counts/target rate/coverage по каждому. Test checksum известен, но labels/results не используются для выбора до freeze.

## 6. Модели

Обязательные:

1. constant train prior;
2. chronological team Elo;
3. logistic regression без draft;
4. logistic regression с draft.

Необязательная:

5. HistGradientBoosting candidate.

Каждая модель получает:

- exact feature list;
- hyperparameters;
- seed;
- train/validation metrics;
- calibration choice;
- artifact/manifest checksum;
- training resource/time.

Если boosting не даёт убедительного gain, он получает status `rejected`, а logistic остаётся кандидатом.

## 7. Evaluation report

Создайте `ml/reports/postdraft-v1-evaluation.md`:

| Model | Log loss | Brier | ROC-AUC | Accuracy | Coverage |
|---|---:|---:|---:|---:|---:|
| constant | | | | | |
| Elo | | | | | |
| logistic no draft | | | | | |
| logistic + draft raw | | | | | |
| logistic + draft calibrated | | | | | |
| boosting calibrated | | | | | |

Приложите:

- reliability diagram + bin counts;
- patch/tier slices;
- confidence buckets;
- new-roster/low-history slice;
- paired comparison на одинаковом coverage;
- block-bootstrap interval gain;
- known limitations;
- candidate decision.

Не округляйте report так, чтобы маленькое различие выглядело большим.

## 8. Calibration и test

1. выберите base model на validation;
2. fit calibrator только calibration period;
3. заморозьте code/config/artifacts;
4. проверьте manifest/checksums;
5. откройте test один раз;
6. запишите все metrics/slices, включая плохие;
7. не меняйте model после test и не публикуйте повторную «финальную» оценку на том же holdout;
8. если нужны изменения, следующий будущий период становится новым test.

## 9. Registry и offline predictions

Реализуйте:

```text
prediction_models
prediction_feature_snapshots
prediction_attempts
match_predictions
prediction_evaluations
```

Pipeline:

```text
draft complete event
-> idempotent snapshot job
-> cutoff/leakage/schema validation
-> champion + optional challenger batch predict
-> probability validation
-> transactional publish champion
-> API/mobile
-> delayed label evaluation
```

Feature/model artifacts только trusted/checksummed. Runner isolated и bounded.

## 10. API и mobile

API:

```http
GET /v1/matches/{matchId}/prediction
```

Отдаёт:

- available/unavailable reason;
- Radiant/Dire rounded probabilities;
- raw stored value в JSON с разумной точностью;
- cutoff/generated time;
- model/methodology version;
- data coverage indicators;
- disclaimer.

Mobile tests:

- 61/39 отображаются и суммируются до 100 после rounding policy;
- loading/empty/unavailable/expired;
- old draft prediction superseded;
- completed result не перепутан с prior prediction;
- accessibility;
- offline cached prediction помечен временем;
- feature flag полностью скрывает блок.

## 11. Monitoring и patch game day

Dashboard:

```text
eligible / snapshot / published / deadline miss
coverage and rejection reasons
champion/challenger versions
probability distribution/extremes
missing/unknown features
rolling log loss/Brier/calibration after labels
Elo comparison
patch/tier slices
```

Drill:

1. неизвестный hero/feature schema;
2. corrupted model checksum;
3. NaN probability;
4. runner timeout;
5. draft correction after snapshot;
6. label correction;
7. major patch safe mode;
8. champion regression;
9. rollback to Elo/logistic;
10. complete ML feature flag off.

Основной match screen работает во всех случаях.

## 12. Model card

Опубликуйте внутренний model card:

```text
intended use
not intended use
training/evaluation windows
data sources and licensing
eligibility/coverage
features at category level
metrics and slices
calibration
known limitations
patch/roster risks
ethical/product constraints
version/owners/runbook
```

Не раскрывайте secrets, private artifact URLs или персональные данные.

## 13. Definition of Done части 20

- ML остаётся необязательным производным слоем;
- problem/target/cutoff/eligibility версионированы;
- draft-aware и pre-draft не смешаны;
- feature dataset point-in-time, immutable и checksummed;
- leakage/future-mutation/provenance tests проходят;
- chronological train/validation/calibration/test split зафиксирован;
- constant и Elo baselines существуют;
- logistic preprocessing находится внутри pipeline;
- boosting публикуется только при устойчивом gain;
- primary metrics — log loss/Brier/calibration;
- AUC/accuracy/coverage показаны дополнительно;
- calibrator не видел test;
- test использован один раз после freeze;
- model/dataset/code/dependencies имеют manifests/checksums;
- offline prediction job идемпотентен и bounded;
- API не загружает недоверенную Python-модель;
- probability/cutoff/version/limitations видны пользователю;
- отсутствующие features не превращаются в silent 50%;
- original published predictions неизменяемы;
- delayed labels дают rolling monitoring;
- major patch/champion rollback/feature-off проверены;
- model card и runbook готовы;
- прогноз не представлен как гарантия или совет для ставок.

## Курс завершён, но проект продолжается

Теперь у вас есть полный путь от переменной и функции до production-shaped аналитического приложения, replay-событий, ClickHouse и честного ML-baseline. Следующий документ — финальная аттестация: одна сквозная задача, которая проверяет, умеете ли вы изменить базу, ingestion, API, mobile, тесты и deployment как единую систему.

[Предыдущая глава](09-model-serving-monitoring.md) · [Оглавление части](README.md) · [Финальная аттестация](../02-final-assessment.md)
