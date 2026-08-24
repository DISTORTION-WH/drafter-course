# Глава 7. Градиентный бустинг и контролируемое усложнение

## Цель

Проверить модель, способную находить нелинейные зависимости и interactions, не превращая эксперимент в бесконечный подбор параметров. Candidate публикуется только при устойчивом улучшении над logistic/Elo и приемлемой операционной цене.

## 1. Чего не видит простая linear model

Логистическая регрессия складывает эффекты. Но в Dota 2 возможны условия:

```text
высокий Elo полезен по-разному на разных tiers;
новый roster особенно рискован сразу после patch;
hero A и hero B вместе отличаются от суммы отдельных эффектов;
recent form важна только при достаточном числе игр;
```

Decision trees умеют делать разделения:

```text
if elo_diff > 120:
    if roster_continuity_diff > 5:
        ...
```

Gradient boosting строит последовательность небольших trees, где каждый следующий исправляет часть ошибок предыдущих.

## 2. Почему `HistGradientBoostingClassifier`

Для первой версии используем реализацию из scikit-learn:

- не добавляем ещё одну библиотеку;
- есть probability output;
- есть regularization/early stopping options;
- хорошо работает с табличными numeric features;
- pipeline можно сохранить вместе с preprocessing.

Это не утверждение, что она всегда сильнее XGBoost/LightGBM/CatBoost. Сначала нужен честный baseline, затем benchmark альтернатив.

## 3. Feature matrix

Начните с тех же point-in-time features, что logistic. Для категорий можно применить dense one-hot, если размер контролируем:

```py
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


def build_boosting_pipeline() -> Pipeline:
    numeric = Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="median", add_indicator=True)),
        ]
    )

    categorical = Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="most_frequent")),
            (
                "one_hot",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False,
                ),
            ),
        ]
    )

    preprocessing = ColumnTransformer(
        transformers=[
            ("numeric", numeric, NUMERIC_FEATURES),
            ("categorical", categorical, CATEGORICAL_FEATURES),
        ],
        sparse_threshold=0.0,
    )

    classifier = HistGradientBoostingClassifier(
        learning_rate=0.05,
        max_iter=200,
        max_leaf_nodes=15,
        min_samples_leaf=30,
        l2_regularization=1.0,
        early_stopping=False,
        random_state=42,
    )

    return Pipeline(
        steps=[
            ("preprocess", preprocessing),
            ("classifier", classifier),
        ]
    )
```

Dense one-hot может потребовать много RAM. Перед fit оцените:

```text
rows * transformed_columns * bytes_per_value
```

Если feature space огромен, не переключайтесь на dense вслепую. Пересмотрите representation или выберите estimator с подходящей sparse/categorical поддержкой, сверившись с официальной документацией закреплённой версии.

## 4. Почему `early_stopping=False`

Автоматический early stopping estimator может создать внутренний validation subset способом, который не соответствует времени. Для time-series задачи безопаснее:

- явно задать chronological validation;
- обучить кандидаты с разным `max_iter` на train;
- выбрать по внешнему validation;
- после заморозки переобучить по заранее описанной policy.

Если используете встроенный early stopping, докажите, что split не содержит future leakage. Default нельзя считать доказательством.

## 5. Основные параметры

### `learning_rate`

Насколько сильно добавляется каждое дерево. Меньше обычно требует больше iterations.

### `max_iter`

Число boosting iterations. Слишком много может overfit.

### `max_leaf_nodes`

Ограничивает сложность дерева. Для небольшого dataset начните с малых значений.

### `min_samples_leaf`

Минимум examples в leaf. Большое значение сглаживает редкие случайные patterns.

### `l2_regularization`

Штрафует слишком сложные leaf values.

Не меняйте все параметры одновременно без experiment registry.

## 6. Ограниченный поиск

Пример небольшого плана:

```text
learning_rate: [0.03, 0.05, 0.1]
max_iter: [100, 200, 400]
max_leaf_nodes: [7, 15, 31]
min_samples_leaf: [20, 50]
```

Это уже 54 combinations. На небольшом dataset достаточно меньшего staged search:

1. зафиксировать leaf/min samples, сравнить learning rate/iterations;
2. выбрать диапазон;
3. сравнить 2–3 complexities;
4. повторить на нескольких temporal folds;
5. остановиться, если gain меньше uncertainty.

Каждый запуск имеет manifest. Validation не превращается в leaderboard из сотен случайных попыток без поправки на selection bias.

## 7. Overfitting

Признаки:

- train log loss заметно лучше validation;
- gain есть только на одном турнире;
- новый patch резко проваливается;
- extreme probabilities чаще ошибочны;
- feature importance сосредоточена на редком ID;
- качество исчезает после удаления подозрительного feature;
- small time shift меняет вывод.

Лечение:

- меньше trees/leaves;
- больше min samples/regularization;
- меньше features;
- убрать team/player IDs, которые модель запоминает;
- больше данных/временных folds;
- пересмотреть leakage;
- вернуться к logistic/Elo.

## 8. Draft interactions

Boosting может находить комбинации hero binary features, но пространство сочетаний огромно, а профессиональных матчей относительно мало.

Риск:

```text
редкая пара встретилась 4 раза и выиграла 4
-> tree считает её сильным сигналом
-> future patch меняет механику
```

Требуйте:

- minimum support;
- temporal stability;
- regularization;
- patch slices;
- confidence/calibration check;
- никакой причинной формулировки «синергия даёт X%» без отдельного исследования.

## 9. Feature importance

Tree impurity importance может быть biased. Предпочтительнее permutation importance на validation:

```text
1. измерить исходный log loss
2. перемешать один feature в validation
3. снова измерить
4. рост loss показывает predictive dependence
```

Но correlated features могут заменять друг друга, а permutation нарушает естественные связи. SHAP/importance объясняют поведение модели, не причинность матча.

Не показывайте пользователю «герой дал +17%» без проверенного explanation contract.

## 10. Сравнение candidate

Одна таблица, одинаковые windows:

| Model | Log loss | Brier | AUC | Coverage | Artifact | Inference |
|---|---:|---:|---:|---:|---:|---:|
| constant prior | ... | ... | ... | ... | none | trivial |
| Elo | ... | ... | ... | ... | state | trivial |
| logistic | ... | ... | ... | ... | small | low |
| boosting | ... | ... | ... | ... | larger | medium |

Добавьте:

- calibration;
- patch/tier slices;
- block-bootstrap interval для gain;
- training duration/memory;
- prediction throughput;
- schema complexity;
- retraining/monitoring burden.

Сложная модель выигрывает не тогда, когда её single metric меньше на `0.0003`, а когда улучшение устойчиво и полезно.

## 11. Promotion rule

Пример:

```text
boosting promoted only if:
  log loss improvement over logistic exceeds agreed threshold
  Brier not worse
  calibration after separate calibration is acceptable
  critical patch/tier slices have no unexplained regression
  gain interval is mostly favorable
  coverage is unchanged or better
  serving/retraining fit operational budget
```

Иначе champion остаётся logistic/Elo, а boosting сохраняется как experiment.

## 12. Тесты

- transformed matrix finite;
- dense memory limit проверен;
- probability class index проверен;
- deterministic output при одинаковом seed/version;
- no internal random validation leakage;
- missing/unseen category behavior;
- save/load checksum;
- old feature schema rejected;
- probability distribution не collapsed в 0/1;
- training job имеет CPU/RAM/time limits.

## Практика

1. Создайте boosting pipeline с теми же features.
2. Измерьте transformed matrix memory.
3. Проведите staged temporal tuning.
4. Сравните с logistic/Elo.
5. Выполните patch/tier/calibration slices.
6. Посчитайте block-bootstrap gain.
7. Примите и запишите promote/reject решение.

## Критерии готовности

- boosting решает измеренную nonlinear гипотезу;
- preprocessing fit только на train;
- internal random early stopping не нарушает время;
- search ограничен и зарегистрирован;
- train/validation gap наблюдается;
- draft interactions имеют support;
- importance не называется причинностью;
- gain сравнен с uncertainty и operations cost;
- test не использован для tuning;
- простая модель остаётся champion при неубедительном gain.

[Предыдущая глава](06-logistic-regression.md) · [Оглавление части](README.md) · [Следующая глава](08-calibration-drift.md)

