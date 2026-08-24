# Глава 1. Задача, цель и точный момент прогноза

## Цель

Превратить расплывчатое «предсказывать матчи» в проверяемую спецификацию. Вы выберете объект прогноза, target, момент cutoff, набор допустимых данных и поведение для матчей, которые нельзя прогнозировать.

## 1. Начинаем не с алгоритма

До `LogisticRegression` ответьте:

```text
Что прогнозируем?
Для каких матчей?
В какой момент?
Какое решение продукта использует вероятность?
Когда узнаём правильный ответ?
Что считаем ошибкой?
```

Пример узкой задачи:

> Для завершённых, не отменённых профессиональных игр Dota 2 с известными двумя командами оценить вероятность победы Radiant после завершения драфта, но до первого игрового события.

Это бинарная classification task.

## 2. Observation unit

Одна строка dataset — одна **игра**, а не серия и не команда:

```ts
type PredictionExample = {
  matchId: string;
  seriesId: string | null;
  predictionCutoff: string;
  radiantTeamId: string;
  direTeamId: string;
  radiantWin: 0 | 1;
};
```

Target:

```text
y = 1, если Radiant победил
y = 0, если Dire победил
```

Исключите или отдельно обработайте:

- cancelled/abandoned/remake;
- неизвестного победителя;
- duplicate provider match;
- матч без устойчивых team identities;
- неполный draft, если модель draft-aware;
- матчи, которые не соответствуют professional eligibility contract.

Правило eligibility версионируется, например `completed-pro-game-v3`.

## 3. Два разных продукта

### Pre-draft модель

Cutoff, например, за 15 минут до фактического/подтверждённого начала:

```text
model_id = pro-game-predraft-v1
allowed = team history, known roster, patch, tier, side
forbidden = picks, bans, post-draft changes
```

Она полезна для preview до драфта, но scheduled time может переноситься. Нужен устойчивый event «prediction snapshot created» до появления draft.

### Draft-aware модель

Cutoff — событие `draft_completed_at`, сохранённое до начала игры:

```text
model_id = pro-game-postdraft-v1
allowed = всё pre-draft + picks/bans, порядок draft
forbidden = first blood, duration, live gold, result
```

Это другой продукт и другая метрика. Нельзя обучить одну таблицу, где часть строк имеет draft features, а часть случайно нет, и называть результат единым pre-match прогнозом.

## 4. Выбор для учебной лабораторной

В курсе основной baseline будет **draft-aware**:

```text
prediction_cutoff = persisted draft_completed_at
delivery_deadline = before first gameplay event
target = radiant_win
```

Почему:

- picks/bans — важная часть анализатора;
- cutoff можно явно записать;
- интерфейс показывает контекст драфта;
- dataset остаётся бинарным и понятным.

Если ваш источник не даёт надёжный `draft_completed_at`, начните с pre-draft модели и полностью исключите draft features. Не восстанавливайте cutoff задним числом из результата сомнительным правилом.

## 5. Target availability

Target становится доступен только после канонического завершения матча:

```text
prediction cutoff ----> game ----> canonical completed result
      features                          label available
```

Сохраните:

- `prediction_cutoff`;
- `label_observed_at`;
- `source_version`;
- correction status.

Если победитель позже исправлен, dataset/model evaluation должна получить новую label version и audit record.

## 6. Вероятность, а не класс

Основной output:

```ts
type MatchPrediction = {
  radiantWinProbability: number; // 0..1
};
```

Не только:

```text
Radiant win / Dire win
```

Вероятность различает слабую уверенность `0.52` и сильную `0.82`. Именно поэтому мы будем использовать log loss, Brier score и calibration, а accuracy оставим дополнительной метрикой.

## 7. Product behavior

Спецификация экрана:

```text
Radiant: 61%
Dire: 39%
Calculated after draft at 18:42 UTC
Model: postdraft-logistic-v1
Coverage: both rosters known
```

Обязательные состояния:

- `available`;
- `pending_features`;
- `not_eligible`;
- `insufficient_history`;
- `model_unavailable`;
- `expired` после начала live state, если продукт запрещает поздний расчёт;
- `superseded` для старой версии.

Не подставляйте `50%` при сломанном feature pipeline: это скрывает отказ как уверенный прогноз.

## 8. Acceptance criteria задачи

До обучения запишите:

- минимальное число eligible matches;
- coverage, например ≥ 85% eligible games;
- максимальную prediction latency после draft;
- baseline, который надо превзойти;
- временной test period;
- log loss/Brier threshold или относительное улучшение;
- calibration acceptance;
- allowed/forbidden features;
- patch drift behavior;
- правило «не публиковать», если данных мало.

Не задавайте нереалистичную «точность 90%». Профессиональные матчи содержат неопределённость, а хороший вероятностный прогноз оценивается не одним процентом угаданных победителей.

## 9. Ethics и представление

В интерфейсе:

- не использовать «гарантированная победа»;
- не обещать финансовый результат;
- не маскировать модель под экспертное мнение;
- показывать время и версию;
- объяснять, какие категории данных использованы;
- не показывать ложную точность `61.384729%` — округлить разумно;
- иметь возможность полностью выключить feature flag.

Если продукт попадает под локальные правила betting/gambling, требуется отдельная правовая проверка. Этот курс строит аналитическую демонстрацию, а не систему ставок.

## 10. Документ задачи

Создайте `ml/docs/problem-v1.md`:

```markdown
# pro-game-postdraft-v1

Observation: one completed eligible professional game
Target: Radiant win (0/1)
Cutoff: persisted draft_completed_at before first gameplay event
Eligible: completed-pro-game-v3 + complete draft + known teams
Prediction output: calibrated probability [0, 1]
Forbidden: any event/result/aggregate after cutoff
Primary metrics: log loss, Brier, reliability curve
Secondary: ROC-AUC, accuracy at 0.5, coverage
Split: chronological, exact dates in experiment manifest
Publication: only if quality gate passes
```

## Практика

1. Выберите pre-draft или draft-aware продукт.
2. Напишите точный cutoff event.
3. Опишите eligibility и exclusions.
4. Составьте allowed/forbidden list.
5. Нарисуйте timeline features → game → label.
6. Опишите UI states и feature flag.

## Критерии готовности

- observation unit — одна игра;
- target однозначен;
- cutoff сохранён до результата;
- pre-draft и draft-aware не смешаны;
- exclusions версионированы;
- output — вероятность;
- coverage измеряется;
- неизвестность не превращается молча в 50%;
- публикация имеет quality gate;
- интерфейс не обещает гарантии/прибыль.

[Оглавление части](README.md) · [Следующая глава](02-point-in-time-dataset-leakage.md)

