# Глава 5. Elo и Glicko для рейтинга команд

## Цель

Построить сильный и объяснимый chronological baseline. Elo превращает разницу рейтингов двух команд в вероятность и обновляет ratings только после доступного результата.

## 1. Идея Elo

У каждой команды rating, например начальный `1500`. До игры ожидаемая вероятность победы команды A над B:

```text
E_A = 1 / (1 + 10 ^ ((R_B - R_A) / 400))
```

Если ratings равны:

```text
R_A = R_B -> E_A = 0.5
```

Если A выше примерно на 400 points:

```text
E_A ≈ 0.91
```

Число `400` — scale parameter классической формы. Для Dota 2 его можно валидировать/настраивать на validation, но не на test.

## 2. Обновление

После результата:

```text
R_A_new = R_A + K * (S_A - E_A)
```

Где:

- `S_A = 1`, если A победила;
- `S_A = 0`, если проиграла;
- `E_A` — ожидаемая вероятность;
- `K` — скорость изменения rating.

Неожиданная победа слабой команды даёт большой прирост. Ожидаемая победа фаворита — небольшой.

## 3. Реализация функции

```py
import math

def expected_score(
    rating_a: float,
    rating_b: float,
    scale: float = 400.0,
) -> float:
    exponent = (rating_b - rating_a) / scale
    return 1.0 / (1.0 + math.pow(10.0, exponent))


def update_rating(
    rating: float,
    actual: float,
    expected: float,
    k_factor: float,
) -> float:
    return rating + k_factor * (actual - expected)
```

Tests:

```py
def test_equal_ratings_produce_half() -> None:
    assert expected_score(1500.0, 1500.0) == 0.5


def test_upset_moves_rating_more_than_expected_win() -> None:
    underdog_gain = update_rating(1300, 1, expected_score(1300, 1700), 32)
    favorite_gain = update_rating(1700, 1, expected_score(1700, 1300), 32)

    assert underdog_gain - 1300 > favorite_gain - 1700
```

## 4. Chronological feature generation

Правильный порядок для одной игры:

```text
1. получить ratings, существующие до cutoff
2. вычислить probability/elo_diff feature
3. сохранить prediction example
4. дождаться/симулировать доступность label
5. обновить ratings
```

Неправильно сначала обновить winner, затем записать feature текущего матча.

```py
from collections import defaultdict

INITIAL_RATING = 1500.0

ratings: dict[str, float] = defaultdict(lambda: INITIAL_RATING)

for game in games_sorted_by_cutoff:
    radiant_rating = ratings[game.radiant_team_id]
    dire_rating = ratings[game.dire_team_id]

    probability = expected_score(radiant_rating, dire_rating)
    write_features(game, radiant_rating, dire_rating, probability)

    if game.label_is_available:
        radiant_score = float(game.radiant_win)
        ratings[game.radiant_team_id] = update_rating(
            radiant_rating, radiant_score, probability, k_factor=32.0
        )
        ratings[game.dire_team_id] = update_rating(
            dire_rating, 1.0 - radiant_score, 1.0 - probability, k_factor=32.0
        )
```

Production simulation должна сортировать по availability/cutoff и корректно обрабатывать одновременно идущие игры. Результат игры не обновляет state для другой игры, cutoff которой был раньше результата.

## 5. Radiant advantage

Если исторически Radiant имеет преимущество, добавьте offset:

```text
effective_radiant_rating = radiant_rating + side_advantage
```

`side_advantage` выбирается на train/validation и проверяется по patch/time. Не вычисляйте его на test.

Если сторона определяется draft-order/selection rules, убедитесь, что значение известно к cutoff и имеет одинаковый смысл в истории.

## 6. K-factor

Большой K:

- быстрее реагирует на форму/roster change;
- более шумный.

Малый K:

- стабилен;
- медленно реагирует на новый состав/patch.

Проведите walk-forward validation для небольшого набора K, например `8, 16, 24, 32, 48`, но это лишь кандидаты. Выбирайте по log loss/Brier validation, затем замораживайте до test.

Не перебирайте сотни параметров на маленьком dataset.

## 7. Новые команды и identity

Новая команда получает prior rating. Но профессиональные организации меняют ID/название, а состав может перейти в новую организацию.

Нужно решить:

- rating принадлежит organization ID или roster core;
- когда происходит hard reset;
- переносится ли часть rating при 3/5 сохранённых игроков;
- как обрабатывать stand-ins;
- как identity correction пересчитывает историю.

Простой baseline:

```text
rating belongs to canonical team identity
new identity starts at global prior
roster continuity is separate feature
no hidden manual transfer
```

Позже сравните roster-aware policy на validation. Не меняйте её после просмотра test.

## 8. Patch и decay

После большого patch сила команд может измениться. Возможные механизмы:

- ничего не делать и позволить Elo адаптироваться;
- уменьшить отклонение от prior: `R = prior + decay * (R - prior)`;
- увеличить uncertainty/K временно;
- отдельный patch-form feature.

Любой reset/decay применяется одинаково в offline и production и настраивается только на прошлом.

## 9. Glicko

Elo хранит одно число. Glicko добавляет rating deviation (неопределённость): у редко играющей или новой команды uncertainty выше. Glicko-2 также вводит volatility.

Плюсы:

- лучше выражает недостаток данных;
- rating сильнее меняется, когда uncertainty высока;
- естественно учитывает периоды неактивности.

Сложности для Dota 2:

- надо определить rating period;
- team/roster identity всё равно остаётся предметной проблемой;
- реализация формул сложнее;
- output probability и calibration надо проверять отдельно.

Не переписывайте Glicko-2 по памяти. Используйте официальный алгоритм и тестовые примеры либо проверенную библиотеку с понятной лицензией. Оригинальные материалы и примеры доступны на [сайте Марка Гликмана](https://www.glicko.net/glicko/glicko2.html).

## 10. Elo как модель и feature

Два варианта:

1. **Elo probability baseline** — готовый прогноз;
2. **`elo_diff` feature** — вход логистической регрессии/boosting.

Сначала оцените вариант 1. Если сложная модель не превосходит его, добавленная сложность не оправдана.

Сохраняйте до матча:

```json
{
  "radiantRating": 1584.2,
  "direRating": 1511.7,
  "ratingSystem": "team-elo-v3",
  "ratingStateAsOf": "...",
  "probability": 0.602
}
```

## 11. Проверки

- одинаковые ratings → 0.5 до side offset;
- probabilities в `(0,1)`;
- сумма A/B probabilities = 1;
- zero-sum update для одинакового K;
- текущий match не влияет на свои features;
- future mutation не меняет старые ratings;
- stable order для одинаковых timestamps;
- new team prior;
- patch decay exact fixture;
- corrected result вызывает versioned rebuild, а не ручное изменение одной цифры.

## Практика

1. Реализуйте Elo functions/tests.
2. Постройте chronological rating history.
3. Добавьте side offset candidate.
4. Сравните K на validation.
5. Заморозьте Elo v1 и оцените test один раз.
6. Постройте calibration curve.
7. Запишите roster/new-team/patch policies.

## Критерии готовности

- rating до матча не содержит его результат;
- все updates идут по availability order;
- side advantage fit только на прошлом;
- K выбран на validation;
- team identity policy явна;
- new teams имеют prior;
- patch behavior воспроизводим;
- Elo оценён log loss/Brier/calibration;
- Glicko не внедряется без official reference tests;
- rating/version/as-of сохраняются с прогнозом.

[Предыдущая глава](04-time-splits-metrics.md) · [Оглавление части](README.md) · [Следующая глава](06-logistic-regression.md)

