# Глава 8. Калибровка вероятностей и drift

## Цель

Сделать так, чтобы заявленные 60%, 70% и 80% соответствовали наблюдаемым частотам, а после нового патча система замечала изменение данных и умела остановить публикацию.

## 1. Ranking и calibration — не одно

Модель может правильно располагать матчи от менее к более вероятной победе Radiant и иметь хороший ROC-AUC, но быть слишком уверенной:

```text
model says 80%
observed wins only 64%
```

Для пользовательской вероятности это серьёзная ошибка. Поэтому проверяем:

- log loss;
- Brier score;
- reliability diagram;
- distribution probabilities;
- counts в bins;
- slices по patch/tier/time.

## 2. Отдельный calibration period

Правильный путь:

```text
train -> fit base model
validation -> select model/hyperparameters
calibration -> fit mapping raw_score -> calibrated_probability
test -> evaluate frozen model + mapping once
```

Если calibrator обучен на test labels, итоговая метрика нечестна.

Calibration period должен идти после base training/selection по времени. Model и calibrator versions сохраняются вместе.

## 3. Platt/sigmoid calibration

Прозрачный вариант — logistic mapping для raw score/probability. Учебная реализация на clipped logit:

```py
import numpy as np
from sklearn.linear_model import LogisticRegression

EPSILON = 1e-6


def to_logit(probabilities: np.ndarray) -> np.ndarray:
    clipped = np.clip(probabilities, EPSILON, 1.0 - EPSILON)
    values = np.log(clipped / (1.0 - clipped))
    return values.reshape(-1, 1)


def fit_sigmoid_calibrator(
    raw_calibration_probability: np.ndarray,
    y_calibration: pd.Series,
) -> LogisticRegression:
    calibrator = LogisticRegression(C=1_000_000.0)
    calibrator.fit(to_logit(raw_calibration_probability), y_calibration)
    return calibrator


def apply_calibrator(
    calibrator: LogisticRegression,
    raw_probability: np.ndarray,
) -> np.ndarray:
    return calibrator.predict_proba(to_logit(raw_probability))[:, 1]
```

Это учебная схема. В production сравните с официальными calibration utilities scikit-learn, проверьте class order, regularization и численную устойчивость. Фиксируйте точную реализацию как часть model artifact.

## 4. Isotonic calibration

Isotonic regression учит монотонную ступенчатую mapping без sigmoid формы. Она гибче, но требует больше calibration examples и легче overfit.

```py
from sklearn.isotonic import IsotonicRegression

calibrator = IsotonicRegression(
    y_min=0.0,
    y_max=1.0,
    out_of_bounds="clip",
)
calibrator.fit(raw_calibration_probability, y_calibration)
calibrated = calibrator.predict(raw_test_probability)
```

Выбирайте sigmoid/isotonic по заранее заданным temporal validation/calibration experiments, а не по финальному test.

## 5. Reliability report

Для каждой bin:

```json
{
  "lower": 0.6,
  "upper": 0.7,
  "meanPredicted": 0.646,
  "observedRate": 0.612,
  "examples": 284
}
```

Используйте quantile bins для примерно равного N или uniform bins для фиксированных probability ranges. Укажите strategy.

Expected Calibration Error (ECE) можно показывать как описательную сводку:

```text
sum(bin_weight * abs(mean_predicted - observed_rate))
```

Но ECE зависит от binning и не заменяет proper scoring rules/график.

## 6. Что такое drift

### Feature/data drift

Распределение inputs изменилось:

- новый patch;
- новые heroes;
- другой tournament tier mix;
- больше неизвестных rosters;
- provider изменил поле;
- Elo difference стал шире.

### Prediction drift

Модель стала выдавать заметно больше 0.9/0.1 или почти всё около 0.5.

### Label/base-rate drift

Radiant win rate изменился. Labels доступны только после завершения матчей.

### Performance/calibration drift

После появления labels ухудшились log loss/Brier/reliability.

Feature drift не всегда означает ухудшение, а отсутствие drift по одному feature не доказывает качество. Это сигнал расследования.

## 7. Новый patch

Patch — ожидаемый regime change. Заранее задайте policy:

```text
day 0..N after major patch:
  prediction status = limited_confidence or unavailable
  monitor feature/hero coverage
  no automatic promotion

after minimum labeled games:
  evaluate log loss/Brier/calibration
  retrain challenger
  promote only after gate
```

Варианты:

- продолжить champion с warning;
- временно использовать Elo-only;
- увеличить shrinkage к prior;
- полностью скрыть probability;
- выпускать только для известных draft/roster contexts.

Выбор продуктовый и должен быть одинаковым до инцидента, а не придумываться после плохих результатов.

## 8. Мониторинг без labels

Сразу доступны:

- feature missing rate;
- unknown category/new hero rate;
- feature range violations;
- prediction distribution;
- coverage/rejection reasons;
- model/schema version;
- processing latency/freshness;
- distance от reference distributions.

Не используйте match ID/user data как metric labels. Высококардинальные details идут в ограниченный log/audit store.

## 9. Мониторинг с задержанными labels

Когда матч завершён и label проверен:

```text
join prediction record by matchId/cutoff/modelVersion
-> append evaluation event
-> compute rolling 7/30/90-day metrics
-> patch/tier slices
-> calibration bins
```

Нельзя перезаписывать original prediction новым model output после результата. Иначе historical monitoring станет нечестным.

Храните:

- probability published before cutoff/deadline;
- generated/published timestamps;
- label and label observed time;
- correction version;
- evaluation inclusion status.

## 10. Trigger и действие

Пример runbook:

| Сигнал | Порог | Действие |
|---|---|---|
| unknown feature category | > 5% | pause affected model, inspect schema |
| prediction coverage | < 80% | inspect feature pipeline |
| p99 batch latency | > deadline | serve unavailable, scale/fix job |
| 30-day log loss worse than Elo | sustained + enough N | demote champion |
| high-confidence bin gap | > threshold + enough N | recalibrate/investigate |
| new major patch | event | enter patch-safe mode |

Threshold включает minimum sample count и observation window, иначе alert будет шумным.

## 11. Retraining

Retraining — не автоматическая замена production:

```text
new point-in-time dataset
-> data/leakage checks
-> train candidate
-> validation/calibration
-> frozen test/rolling backtest
-> comparison report
-> approval/promotion
-> shadow/challenger
-> champion switch
```

Каждая версия immutable. Старый artifact сохраняется на rollback/audit window.

Schedule может быть ежемесячным/по patch, но quality gate важнее календаря.

## 12. Официальные материалы

Scikit-learn подробно объясняет calibration curves, proper scoring rules и calibrators в [разделе Probability calibration](https://scikit-learn.org/stable/modules/calibration.html). Используйте API своей закреплённой версии, потому что интерфейсы могут меняться.

## Практика

1. Сохраните отдельный calibration window.
2. Сравните raw, sigmoid и isotonic probabilities.
3. Выберите по validation/calibration policy без test tuning.
4. Постройте reliability diagrams с counts.
5. Смоделируйте новый patch/unknown hero spike.
6. Опишите fallback на Elo/unavailable.
7. Добавьте delayed label monitoring.
8. Проведите champion rollback.

## Критерии готовности

- calibrator не видел test labels;
- raw и calibrated metrics сохранены;
- bins имеют counts/strategy;
- ECE не заменяет log loss/Brier;
- drift разделён на data/prediction/label/performance;
- major patch имеет заранее заданную policy;
- original predictions immutable;
- label join учитывает availability/corrections;
- retraining создаёт challenger, не auto-production;
- champion можно выключить/откатить.

[Предыдущая глава](07-gradient-boosting.md) · [Оглавление части](README.md) · [Следующая глава](09-model-serving-monitoring.md)

