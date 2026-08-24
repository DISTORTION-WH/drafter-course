# Часть 20. Прогнозирование профессиональных матчей и ML

Эта часть **необязательная**. Приложение-анализатор полноценно работает без прогнозов. Добавляйте ML только после того, как канонические матчи, история составов, патчи, data quality, тесты и эксплуатация уже стабильны.

Модель не «знает победителя». Она оценивает вероятность при конкретном наборе данных, доступных в конкретный момент. Вероятность `0.64` означает не обещание, а результат модели, который обязан быть честно проверен на будущих по времени матчах и откалиброван.

## Результат части

Вы построите прозрачный baseline:

```text
point-in-time canonical data
-> versioned feature snapshot before match
-> chronological train/calibration/test split
-> constant + Elo baselines
-> logistic regression
-> optional gradient boosting
-> probability calibration
-> immutable model manifest/artifact
-> offline predictions
-> Node.js read API
-> transparent mobile presentation
-> delayed outcome monitoring
```

Прогнозы не используются для ставок, не обещают прибыль и не подменяют фактический результат матча.

## Главы

1. [Задача, цель и точный момент прогноза](01-problem-and-prediction-time.md)
2. [Point-in-time dataset и утечка будущего](02-point-in-time-dataset-leakage.md)
3. [Python-окружение, данные и простые baseline-модели](03-python-environment-baselines.md)
4. [Временные разбиения и честные метрики](04-time-splits-metrics.md)
5. [Elo и Glicko для рейтинга команд](05-elo-glicko.md)
6. [Логистическая регрессия](06-logistic-regression.md)
7. [Градиентный бустинг и контролируемое усложнение](07-gradient-boosting.md)
8. [Калибровка вероятностей и drift](08-calibration-drift.md)
9. [Публикация модели, serving и мониторинг](09-model-serving-monitoring.md)
10. [Итоговая лабораторная: честный прогнозный baseline](10-final-ml-lab.md)

## Граница ответственности

- PostgreSQL хранит канонические матчи и published prediction records.
- Object storage хранит immutable dataset/model artifacts и manifests.
- Python job строит features, обучает, оценивает и пакетно прогнозирует.
- Node.js API не загружает произвольный pickle из запроса и не обучает модель.
- React Native показывает вероятность, версию, время расчёта, покрытие и ограничения.
- Фактический победитель всегда приходит из канонического ingestion, а не из модели.

## Минимальное правило честности

Ни один feature не может использовать информацию, которая появилась после `prediction_cutoff`. Dataset делится по времени. Test period открывается один раз для финальной оценки и не участвует в подборе признаков или параметров.

## Документация

Основной Python-инструмент курса — scikit-learn. Перед установкой зафиксируйте поддерживаемую версию Python и точные зависимости. Актуальные API сверяйте с [официальным руководством scikit-learn](https://scikit-learn.org/stable/user_guide.html).

## Навигация

- [Назад: часть 19 — ClickHouse и масштабирование аналитики](../part-19-clickhouse-scaling/README.md)
- [После курса: финальная аттестация](../02-final-assessment.md)

