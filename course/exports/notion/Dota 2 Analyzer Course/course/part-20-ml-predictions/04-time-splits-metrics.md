# Глава 4. Временные разбиения и честные метрики

## Цель

Оценить модель на данных, которые находятся позже обучения. Разделить подбор признаков, калибровку и окончательную проверку, а затем измерить не только «угадал/не угадал», но и качество вероятностей.

## 1. Почему random split неверен

Обычный случайный split может отправить:

- игру 1 серии в train, игру 2 в test;
- будущий patch в train, прошлый в test;
- позднюю форму команды в обучение для прогноза раннего матча;
- почти одинаковые roster/tournament contexts по обе стороны.

В production модель всегда обучена на прошлом и применяется к будущему. Offline evaluation должна повторять это направление времени.

## 2. Четыре периода

Пример, даты выбираются по вашему dataset:

```text
train:       2023-01-01 .. 2024-06-30
validation:  2024-07-01 .. 2024-12-31
calibration: 2025-01-01 .. 2025-03-31
test:        2025-04-01 .. 2025-09-30
```

Назначение:

- **train** — fit model/preprocessing;
- **validation** — выбрать features/hyperparameters;
- **calibration** — настроить преобразование raw probabilities;
- **test** — один раз оценить замороженный pipeline.

Если данных мало, calibration можно организовать внутренним cross-validation на прошлом, но test всё равно должен быть изолирован. Нельзя еженедельно смотреть test, менять модель и продолжать называть этот период test: он фактически стал validation.

## 3. Полуоткрытые интервалы

Функция split:

```py
from dataclasses import dataclass
import pandas as pd

@dataclass(frozen=True)
class TimeWindow:
    start: pd.Timestamp
    end_exclusive: pd.Timestamp


def select_window(frame: pd.DataFrame, window: TimeWindow) -> pd.DataFrame:
    cutoff = frame["prediction_cutoff"]
    mask = (cutoff >= window.start) & (cutoff < window.end_exclusive)
    return frame.loc[mask].copy()
```

- `@dataclass` создаёт класс данных;
- `frozen=True` не позволяет случайно изменить даты после создания;
- `[start, end)` не считает запись на границе дважды;
- `.copy()` делает самостоятельный frame и уменьшает риск неявного изменения исходного.

После split проверьте отсутствие пересечений `example_id` и строгий порядок окон.

## 4. Gap и зависимые группы

Иногда между train и validation/test нужен gap:

- labels последних train games ещё не были доступны к первому test cutoff;
- ingestion имеет задержку;
- серии пересекают границу;
- features используют окно последних N дней;
- patch release создаёт резкий переход.

Пример:

```text
train ends June 30
gap July 1–7
validation begins July 8
```

Решите, как обращаться с одной серией на границе. В строгой оценке можно перенести всю серию в более позднее окно или задать group-aware exclusion. Запишите policy.

`TimeSeriesSplit` scikit-learn полезен для упорядоченных fold'ов и поддерживает `gap`, но профессиональные матчи распределены во времени неравномерно и сгруппированы в серии/турниры. Поэтому явные date windows часто понятнее. Сверяйте поведение с [официальной документацией TimeSeriesSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html).

## 5. Log loss

Для каждого матча с label `y` и вероятностью `p`:

```text
loss = -(y * ln(p) + (1-y) * ln(1-p))
```

Среднее по матчам — log loss. Меньше лучше.

Примеры для фактической победы Radiant:

```text
p = 0.60 -> небольшой штраф
p = 0.51 -> почти неуверенный прогноз
p = 0.01 -> огромный штраф за самоуверенную ошибку
```

Code:

```py
from sklearn.metrics import log_loss

value = log_loss(y_true, probabilities, labels=[0, 1])
```

Log loss поощряет полезные вероятности и наказывает ложную уверенность.

## 6. Brier score

```text
Brier = mean((p - y)^2)
```

Для бинарной задачи диапазон обычно `0..1`, меньше лучше. Code:

```py
from sklearn.metrics import brier_score_loss

value = brier_score_loss(y_true, probabilities)
```

Brier интуитивно измеряет квадрат ошибки вероятности. И log loss, и Brier относятся к proper scoring rules, но по-разному штрафуют крайние ошибки.

## 7. Calibration curve

Если всем прогнозам около `0.70` Radiant выигрывает примерно в 70% случаев, модель хорошо откалибрована в этом диапазоне.

Разделите probabilities на bins:

```text
predicted average 0.55 -> observed frequency 0.53
predicted average 0.65 -> observed frequency 0.52  // overconfident
predicted average 0.75 -> observed frequency 0.74
```

Reliability diagram строит `predicted probability` по X и `observed win frequency` по Y. Всегда показывайте количество примеров в bins: пустой/малый bin ненадёжен.

```py
from sklearn.calibration import calibration_curve

observed, predicted = calibration_curve(
    y_true,
    probabilities,
    n_bins=10,
    strategy="quantile",
)
```

Официальное объяснение: [scikit-learn — probability calibration](https://scikit-learn.org/stable/modules/calibration.html).

## 8. Secondary metrics

### Accuracy

```py
predicted_class = (probabilities >= 0.5).astype(int)
```

Accuracy игнорирует разницу между 51% и 99%. Используйте её только дополнительно.

### ROC-AUC

Оценивает ranking: насколько победители получают более высокий score. Она не доказывает calibration. Модель может иметь хороший AUC и плохие probabilities.

### Coverage

```text
published predictions / eligible matches
```

Высокая метрика на 20% самых простых матчей не равна хорошему продукту. Всегда публикуйте coverage и причины пропусков.

## 9. Общая функция оценки

```py
from dataclasses import dataclass
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    log_loss,
    roc_auc_score,
)

@dataclass(frozen=True)
class Metrics:
    log_loss: float
    brier: float
    roc_auc: float
    accuracy: float
    examples: int


def evaluate_probabilities(y_true: pd.Series, p: np.ndarray) -> Metrics:
    if len(y_true) != len(p):
        raise ValueError("Labels and predictions have different lengths")

    if np.isnan(p).any() or ((p < 0) | (p > 1)).any():
        raise ValueError("Probabilities must be finite and within [0, 1]")

    return Metrics(
        log_loss=float(log_loss(y_true, p, labels=[0, 1])),
        brier=float(brier_score_loss(y_true, p)),
        roc_auc=float(roc_auc_score(y_true, p)),
        accuracy=float(accuracy_score(y_true, p >= 0.5)),
        examples=len(y_true),
    )
```

Если evaluation window содержит только один класс, ROC-AUC не определён. Это должно давать понятный `not_available`, а не падать посреди отчёта или превращаться в ноль.

## 10. Slices

Общая метрика может скрывать провал. Считайте отдельно:

- patch;
- tournament tier;
- model confidence bins;
- roster-known/partial;
- region, если определена корректно;
- favourite strength/Elo difference;
- новый patch первые 7/14/30 дней;
- pre-draft versus draft-aware — как разные модели.

Не публикуйте slice с очень малым N как уверенный вывод. Указывайте counts и uncertainty.

## 11. Confidence intervals

Матчи одной серии зависимы, поэтому naive bootstrap отдельных игр может недооценить uncertainty. Лучше resample целые серии или временные blocks.

```text
repeat B times:
  sample series blocks with replacement
  compute metric difference model - baseline
report median and percentile interval
```

Это не превращает observational evaluation в доказательство причинности, но показывает нестабильность оценки.

## 12. Promotion gate

Пример:

```text
candidate log loss < constant baseline
candidate Brier < Elo baseline or justified tradeoff
no critical slice regression beyond threshold
calibration curve acceptable with enough samples
coverage >= 85%
no leakage/data-quality failures
test evaluated once after freeze
```

Если сложная модель не превосходит Elo/logistic стабильно, публикуйте простую.

## Практика

1. Задайте exact train/validation/calibration/test dates.
2. Добавьте gap/group policy.
3. Реализуйте split assertions.
4. Посчитайте constant baseline log loss/Brier/AUC/accuracy.
5. Постройте reliability diagram с counts.
6. Добавьте patch/tier slices.
7. Сделайте block bootstrap difference.
8. Запишите promotion gate до обучения candidate.

## Критерии готовности

- нет random split;
- окна не пересекаются;
- preprocessing fit только на train;
- validation и calibration имеют разные назначения;
- test не используется для tuning;
- log loss/Brier — primary;
- calibration curve содержит sample counts;
- AUC/accuracy не подменяют вероятность;
- coverage и slices опубликованы;
- uncertainty учитывает series/time grouping.

[Предыдущая глава](03-python-environment-baselines.md) · [Оглавление части](README.md) · [Следующая глава](05-elo-glicko.md)

