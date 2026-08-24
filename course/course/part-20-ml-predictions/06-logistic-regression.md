# Глава 6. Логистическая регрессия

## Цель

Построить первую обучаемую вероятностную модель, в которой preprocessing и classifier объединены в один reproducible pipeline. Научиться читать коэффициенты без причинных выводов и сравнить результат с constant/Elo baselines.

## 1. Идея модели

Сначала признаки складываются в linear score:

```text
z = b + w1*x1 + w2*x2 + ... + wn*xn
```

Sigmoid превращает score в вероятность:

```text
p = 1 / (1 + exp(-z))
```

Если `z = 0`, `p = 0.5`. Большое положительное `z` приближает probability к 1, отрицательное — к 0.

Модель называется regression исторически, но решает classification.

## 2. Признаки baseline v1

Начните с небольшого набора:

Числовые:

```text
elo_diff
recent_win_rate_diff
recent_games_diff
roster_continuity_diff
days_since_last_game_diff
known_roster_ratio_diff
```

Категориальные:

```text
patch_id
tournament_tier
```

Draft-aware признаки можно добавить как бинарные hero presence columns:

```text
radiant_has_hero_001 ... radiant_has_hero_N
dire_has_hero_001 ... dire_has_hero_N
```

Или как категориальные picks by slot, если draft order является частью контракта. Не используйте final player performance.

`radiant_side` не нужен как column, если каждая строка всегда ориентирована Radiant и model intercept уже отражает средний side prior.

## 3. Почему нужен Pipeline

Числовые missing values надо заполнить и масштабировать. Категории — заполнить и one-hot encode. Если делать это вручную до split, легко обучить preprocessing на test.

`Pipeline` гарантирует:

```text
fit(train): preprocessing fit + classifier fit
predict(test): use already fitted preprocessing + classifier
```

## 4. Код pipeline

```py
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

NUMERIC_FEATURES = [
    "elo_diff",
    "recent_win_rate_diff",
    "recent_games_diff",
    "roster_continuity_diff",
    "days_since_last_game_diff",
    "known_roster_ratio_diff",
]

CATEGORICAL_FEATURES = [
    "patch_id",
    "tournament_tier",
]


def build_logistic_pipeline() -> Pipeline:
    numeric_pipeline = Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="median", add_indicator=True)),
            ("scale", StandardScaler()),
        ]
    )

    categorical_pipeline = Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="most_frequent")),
            ("one_hot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessing = ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, NUMERIC_FEATURES),
            ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
        ]
    )

    classifier = LogisticRegression(
        penalty="l2",
        C=1.0,
        max_iter=2_000,
        random_state=42,
    )

    return Pipeline(
        steps=[
            ("preprocess", preprocessing),
            ("classifier", classifier),
        ]
    )
```

Проверяйте совместимость solver/penalty и актуальные defaults по [официальной документации LogisticRegression](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html).

## 5. Что делает каждая строка

- `SimpleImputer(strategy="median")` вычисляет median **на train** и подставляет её вместо missing;
- `add_indicator=True` добавляет флаг, что значение отсутствовало;
- `StandardScaler` центрирует/масштабирует numeric features по train;
- `OneHotEncoder` создаёт бинарные columns категорий;
- `handle_unknown="ignore"` позволяет новому patch/tier не уронить predict, но unknown кодируется без известной category effect;
- `L2` regularization сдерживает слишком большие coefficients;
- `C` обратно связан с силой regularization: меньше C — сильнее;
- `max_iter` даёт solver больше итераций для сходимости.

Unknown patch всё равно может быть drift risk. Техническая способность predict не означает разрешение публиковать.

## 6. Обучение

```py
pipeline = build_logistic_pipeline()

X_train = train_frame[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
y_train = train_frame["radiant_win"]

pipeline.fit(X_train, y_train)

X_validation = validation_frame[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
validation_probability = pipeline.predict_proba(X_validation)[:, 1]
```

`[:, 1]` означает: все строки, колонка probability класса `1`. Не предполагайте порядок классов без проверки `pipeline.classes_`/classifier classes в test.

Добавьте assertion:

```py
classes = pipeline.named_steps["classifier"].classes_.tolist()
if classes != [0, 1]:
    raise ValueError(f"Unexpected class order: {classes}")
```

## 7. Regularization и настройка

Выберите небольшой список `C`, например:

```text
0.01, 0.1, 1.0, 10.0
```

Для каждого:

1. fit только train;
2. evaluate validation;
3. сравнить log loss/Brier/slices;
4. выбрать правило;
5. заморозить;
6. не трогать test.

Если вы перебрали features по test, test загрязнён. Потребуется новый будущий holdout.

## 8. `class_weight="balanced"` — не автоматическое улучшение

Balanced weights могут помочь classification minority class, но меняют objective и часто искажают raw probabilities/base rate. В нашей задаче классы обычно не экстремально несбалансированы.

Не включайте weight по привычке. Если используете:

- обоснуйте product cost;
- сравните probability metrics;
- проведите отдельную calibration;
- сохраните weights в manifest.

## 9. Коэффициенты

Положительный coefficient увеличивает model score Radiant, отрицательный уменьшает — при прочих равных.

Но:

- scaled feature coefficient относится к standard deviation, не исходной единице;
- correlated features делят влияние;
- one-hot coefficient зависит от reference/intercept representation;
- regularization сжимает значения;
- association не означает причинность.

Нельзя говорить: «увеличение roster continuity на одну игру вызывает +3% к победе». Модель наблюдательная и нелинейно переводит score в probability.

Полезнее использовать coefficients для sanity check:

- `elo_diff` ожидаемо направлен;
- post-match feature случайно не попал;
- один ID/category не доминирует;
- знак стабилен по time folds.

## 10. Draft representation

Для каждого hero можно создать два binary features. Важно:

- hero dictionary version;
- новый hero даёт new feature schema/model version;
- picks известны к cutoff;
- один hero не отмечен одновременно за обе команды;
- bans не смешаны с picks;
- duplicate/invalid draft останавливает prediction;
- interaction двух heroes linear model напрямую не выражает.

Сначала сравните без draft и с draft на одинаковых windows. Так вы измерите добавочную ценность драфта.

## 11. Сохранение artifact

```py
from pathlib import Path
import joblib

def save_pipeline(pipeline: Pipeline, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=False)
    joblib.dump(pipeline, destination / "model.joblib")
```

`joblib`/pickle-форматы могут исполнять код при загрузке. Загружайте artifact только из доверенного private storage после проверки checksum/signature и allowlisted manifest. Никогда не принимайте model file от mobile/API пользователя.

Сохраняйте весь pipeline, иначе serving может применить другой scaler/category mapping.

## 12. Тесты

- missing numeric проходит policy;
- unseen category не падает;
- запрещённый column отсутствует;
- output shape `(N, 2)`;
- probabilities finite и `[0,1]`;
- class index проверен;
- row order соответствует prediction IDs;
- saved/loaded trusted pipeline даёт тот же output;
- schema mismatch останавливает job;
- future row не меняет старый preprocessing/dataset.

## Практика

1. Обучите pipeline без draft.
2. Сравните с constant и Elo на validation.
3. Проверьте несколько C.
4. Добавьте draft representation v2.
5. Сравните incremental gain.
6. Постройте calibration curve/slices.
7. Заморозьте один candidate до test.
8. Сохраните trusted artifact и checksum.

## Критерии готовности

- preprocessing внутри Pipeline;
- fit не видит validation/test;
- missing и unseen categories имеют явную policy;
- feature list/version фиксированы;
- target/IDs не входят в X;
- class probability index проверен;
- regularization выбрана на validation;
- coefficients не интерпретируются причинно;
- candidate сравнивается с Elo;
- artifact содержит preprocessing и проверяется checksum.

[Предыдущая глава](05-elo-glicko.md) · [Оглавление части](README.md) · [Следующая глава](07-gradient-boosting.md)
