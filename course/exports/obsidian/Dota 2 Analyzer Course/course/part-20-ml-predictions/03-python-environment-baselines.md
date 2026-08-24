# Глава 3. Python-окружение, данные и простые baseline-модели

## Цель

Создать изолированный Python-проект, прочитать immutable dataset, понять базовый синтаксис и получить две самые простые вероятностные модели. Без этих baseline нельзя доказать ценность более сложного ML.

## 1. Почему Python рядом с Node.js

Основное приложение остаётся на Node.js/TypeScript. Python добавляется для offline ML, потому что pandas, NumPy и scikit-learn дают зрелые инструменты подготовки, pipelines и оценки.

Граница:

```text
TypeScript ingestion -> immutable feature source/snapshot
Python training job  -> model artifact + manifest + predictions
Node.js API          -> reads published predictions
```

Два языка не должны обмениваться неописанными внутренними объектами. Между ними — versioned Parquet/JSON contract и PostgreSQL records.

## 2. Структура

```text
ml/
  README.md
  pyproject.toml
  requirements.lock.txt
  src/dota_predictor/
    __init__.py
    config.py
    data.py
    baselines.py
    evaluate.py
  tests/
    test_data.py
    test_baselines.py
  experiments/
    manifests/
  artifacts/              ignored; published to object storage
```

`artifacts/` не коммитит большие datasets/models. В Git находятся code, small fixtures, manifests и checksums.

## 3. Virtual environment

Из папки `ml`:

```powershell
python --version
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install numpy pandas pyarrow scikit-learn joblib pytest
python -m pip freeze > requirements.lock.txt
```

На macOS/Linux activation отличается:

```bash
source .venv/bin/activate
```

Перед командой установки проверьте поддерживаемые версии Python и библиотек по официальной документации. Файл lock должен содержать точные версии, использованные экспериментом. Не коммитите `.venv`.

Проверка:

```powershell
python -c "import sklearn; print(sklearn.__version__)"
python -m pytest
```

## 4. Минимальный Python

### Переменные

```py
RANDOM_SEED: int = 42
TARGET_COLUMN: str = "radiant_win"
FEATURE_COLUMNS: list[str] = [
    "elo_diff",
    "recent_win_rate_diff",
    "roster_continuity_diff",
    "radiant_side",
]
```

- имя слева — переменная;
- `: int`, `: str`, `: list[str]` — подсказка типа;
- `=` присваивает значение;
- названия capitals обозначают договорённость «константа»;
- list хранит упорядоченный набор имён columns.

Python type hints помогают IDE и проверкам, но сами по себе не запрещают неверное значение во время исполнения.

### Функция

```py
from pathlib import Path
import pandas as pd

def load_dataset(path: Path) -> pd.DataFrame:
    frame = pd.read_parquet(path)

    missing = set(FEATURE_COLUMNS + [TARGET_COLUMN]) - set(frame.columns)
    if missing:
        raise ValueError(f"Dataset columns are missing: {sorted(missing)}")

    return frame
```

Разбор:

- `def` объявляет функцию;
- `path` — параметр;
- `-> pd.DataFrame` описывает result;
- indentation задаёт тело;
- `frame` — таблица в памяти;
- `if missing` выполняется для непустого set;
- `raise` останавливает работу с понятной ошибкой;
- `return` возвращает validated frame.

Не передавайте весь dataset как untyped dictionary между функциями.

## 5. DataFrame

`DataFrame` похож на SQL-таблицу:

```py
frame.shape       # (число строк, число столбцов)
frame.columns     # имена столбцов
frame.dtypes      # типы
frame.head(5)     # первые пять строк
```

Не печатайте production dataset целиком: там могут быть внутренние IDs и миллионы строк. Логируйте counts, schema, ranges и безопасные aggregates.

Проверки:

```py
def validate_dataset(frame: pd.DataFrame) -> None:
    if frame.empty:
        raise ValueError("Dataset is empty")

    if not frame["example_id"].is_unique:
        raise ValueError("example_id must be unique")

    labels = set(frame[TARGET_COLUMN].dropna().unique().tolist())
    if not labels.issubset({0, 1}):
        raise ValueError(f"Unexpected labels: {labels}")

    if not frame["prediction_cutoff"].is_monotonic_increasing:
        raise ValueError("Rows must be sorted chronologically")
```

## 6. X и y

В ML принято:

```py
X = frame[FEATURE_COLUMNS]
y = frame[TARGET_COLUMN]
```

- `X` — matrix признаков, строки × columns;
- `y` — правильный target для каждой строки.

Имена короткие по математической традиции. В прикладном code можно использовать `features` и `labels`, если так понятнее.

Metadata не входит в X:

```py
metadata = frame[["example_id", "match_id", "prediction_cutoff"]]
```

Особенно не включайте `match_id`: уникальный identifier не является содержательным числовым признаком и может способствовать запоминанию.

## 7. Baseline 1: постоянная вероятность

Самая простая модель всегда выдаёт долю побед Radiant в **train**:

```py
import numpy as np

def fit_constant_prior(y_train: pd.Series) -> float:
    probability = float(y_train.mean())
    return float(np.clip(probability, 0.001, 0.999))

def predict_constant(probability: float, row_count: int) -> np.ndarray:
    return np.full(shape=row_count, fill_value=probability, dtype=float)
```

Почему clip: log loss не принимает самоуверенную вероятность 0 для случившегося события или 1 для противоположного без огромного штрафа/численной проблемы. Границы входят в methodology.

Критически важно: `probability` вычисляется только по train. Если использовать target test, это leakage.

То же можно сделать `DummyClassifier(strategy="prior")`, но ручная версия полезна для понимания.

## 8. Baseline 2: сторона

Если в данных существует устойчивое преимущество стороны, простой baseline использует отдельный исторический prior для контекста. В нашей target-схеме строка всегда ориентирована Radiant/Dire, поэтому side baseline фактически совпадает с train Radiant win rate, если других side categories нет.

Более содержательный контекстный baseline может отличаться по patch/tier, но small groups надо сгладить к global prior:

```text
smoothed_probability =
  (group_wins + alpha * global_prior)
  / (group_games + alpha)
```

`alpha` — сила prior. Она выбирается по train/validation, не по test. Для групп без истории используется global prior.

## 9. Baseline report

Каждый запуск сохраняет:

```json
{
  "experimentId": "...",
  "datasetId": "...",
  "datasetSha256": "...",
  "trainRange": ["...", "..."],
  "testRange": ["...", "..."],
  "model": "constant-prior",
  "trainPrior": 0.512,
  "randomSeed": 42,
  "dependenciesLockSha256": "...",
  "codeCommit": "...",
  "metrics": {}
}
```

Метрики добавим в следующей главе. Сейчас важно, что baseline воспроизводим.

## 10. Tests

```py
def test_constant_prior_uses_training_labels() -> None:
    y_train = pd.Series([1, 1, 0, 0])

    probability = fit_constant_prior(y_train)

    assert probability == 0.5


def test_constant_prediction_has_requested_length() -> None:
    predictions = predict_constant(0.6, row_count=3)

    assert predictions.tolist() == [0.6, 0.6, 0.6]
```

Добавьте tests на empty labels, invalid target, duplicate ID, unsorted cutoff и missing columns. Решите, должна ли empty train давать ошибку — обычно да.

## 11. Reproducibility

Зафиксируйте:

- Python version;
- dependency lock;
- random seed;
- dataset checksum;
- feature schema;
- split dates;
- code commit;
- environment/CPU notes при необходимости;
- artifact checksum.

Seed не делает недетерминированную внешнюю базу воспроизводимой. Training читает immutable snapshot, а не live SQL, которое завтра вернёт другой результат.

## Практика

1. Создайте `ml` и virtual environment.
2. Зафиксируйте exact dependencies.
3. Прочитайте Parquet dataset.
4. Напишите schema/quality checks.
5. Разделите metadata, X и y.
6. Реализуйте constant prior.
7. Сохраните experiment manifest.
8. Запустите tests в чистом environment.

## Критерии готовности

- Python изолирован от Node runtime;
- `.venv` и artifacts не в Git;
- exact dependencies сохранены;
- dataset immutable/checksummed;
- schema/labels/order проверяются;
- IDs и target не попали в X;
- prior считается только по train;
- baseline имеет tests;
- experiment manifest воспроизводим;
- неуспех валидации останавливает обучение.

[Предыдущая глава](02-point-in-time-dataset-leakage.md) · [Оглавление части](README.md) · [Следующая глава](04-time-splits-metrics.md)
