# Глава 2. Point-in-time dataset и утечка будущего

## Цель

Собрать dataset так, как будто каждый исторический матч снова находится в моменте до начала. Вы научитесь проверять availability каждого признака и не позволять будущей информации улучшать offline-метрики.

## 1. Что такое leakage

Data leakage возникает, когда обучение или проверка использует информацию, недоступную при реальном прогнозе.

Очевидные примеры:

- победитель матча;
- длительность;
- kills/gold/xp после старта;
- финальная статистика игроков;
- first blood;
- итоговый счёт серии, включающий текущую игру.

Неочевидные:

- Elo уже обновлён результатом текущего матча;
- «последние 10 игр» выбраны по database state после конца test period;
- tournament final rank известен только после турнира;
- roster correction внесена после матча, но вы используете её как предматчевое знание;
- aggregate по patch включает будущие матчи;
- normalization/scaler обучен на train + test;
- random split отправил соседние игры одной серии в train и test;
- feature `team_total_wins_in_tournament` включает текущую победу.

Leakage часто даёт впечатляющую метрику. В production она исчезает.

## 2. Point-in-time правило

Для каждой строки с cutoff `T`:

```text
feature may use only records whose availability_time < T
```

Не всегда достаточно `event_time < T`. Provider мог опубликовать/исправить запись позже. Поэтому полезно различать:

```text
occurred_at    — когда событие произошло в мире
observed_at    — когда pipeline его впервые увидел
valid_from/to  — когда значение предметно действовало
corrected_at   — когда исправлено
```

Для строгого historical simulation нужен bitemporal/audit history либо immutable raw snapshots. Если старые состояния перезаписаны без истории, честно восстановить некоторые features невозможно.

## 3. Feature registry

Создайте таблицу контракта:

| Feature | Формула | Source | Availability | Null policy | Version |
|---|---|---|---|---|---|
| `elo_diff` | radiant Elo − dire Elo | rating history | before cutoff | required/fallback policy | v1 |
| `radiant_side` | constant 1 | match | at draft | required | v1 |
| `tier` | canonical tier at event | tournament history | before cutoff | unknown category | v2 |
| `roster_continuity_diff` | games together difference | roster/matches | before cutoff | missing indicator | v1 |
| `recent_win_rate_diff` | prior eligible wins / games | historical results | result observed before cutoff | min sample + shrinkage | v1 |
| `draft_hero_vector` | picks known by completed draft | draft events | at cutoff | draft-aware only | v1 |

У каждого feature появляется функция и тест «не читает future rows».

## 4. История составов

Текущая таблица `team_players` недостаточна: состав меняется. Нужна временная модель, например:

```text
team_roster_memberships
  team_id
  player_id
  valid_from
  valid_to
  observed_at
  source_version
```

Для cutoff `T` выбирается membership, действующий и известный к `T`. Нельзя присвоить историческому матчу сегодняшний состав.

Если источники составов ненадёжны, feature получает missing status или матч исключается согласно заранее записанной policy. Не угадывайте roster по итоговой player stats текущего матча: это post-match leakage.

## 5. Последние N матчей

Корректный запрос использует только результаты, опубликованные раньше cutoff:

```sql
SELECT
  count(*) FILTER (WHERE winner_team_id = $1) AS wins,
  count(*) AS games
FROM matches
WHERE status = 'completed'
  AND label_observed_at < $2
  AND (radiant_team_id = $1 OR dire_team_id = $1)
  AND match_id <> $3
ORDER BY completed_at DESC
LIMIT 20;
```

Но `LIMIT` после aggregate в таком виде логически не ограничит входные строки. Нужен subquery:

```sql
SELECT
  count(*) FILTER (WHERE winner_team_id = $1) AS wins,
  count(*) AS games
FROM (
  SELECT winner_team_id
  FROM matches
  WHERE status = 'completed'
    AND label_observed_at < $2
    AND (radiant_team_id = $1 OR dire_team_id = $1)
    AND match_id <> $3
  ORDER BY completed_at DESC, match_id DESC
  LIMIT 20
) prior_games;
```

Важен стабильный tie-breaker `match_id`. Ещё надёжнее строить features последовательным chronological job, который обновляет state только после создания строки текущего матча.

## 6. Серии и турниры

Матчи одной best-of серии зависимы. Для второй игры результат первой может быть допустим, если:

- первая игра канонически завершилась до cutoff второй;
- production feature job действительно успел получить результат;
- спецификация разрешает live-series context.

Если вы не можете доказать availability, исключите feature. При split старайтесь не разрывать тесно связанные группы между train/test в спорных местах; задайте gap или делите по целым временным блокам/сериям.

Финальная позиция команды на турнире почти всегда будущее для ранних игр и запрещена.

## 7. Dataset row

Храните не только features:

```json
{
  "exampleId": "match:123:postdraft-v1",
  "matchId": "123",
  "seriesId": "s-9",
  "cutoff": "2026-01-05T12:10:00Z",
  "labelObservedAt": "2026-01-05T13:02:00Z",
  "featureSchemaVersion": "postdraft-features-v1",
  "eligibilityVersion": "completed-pro-game-v3",
  "sourceSnapshotId": "...",
  "features": {
    "eloDiff": 84.2,
    "recentWinRateDiff": 0.07,
    "rosterContinuityDiff": 12,
    "radiantSide": 1
  },
  "radiantWin": 1
}
```

Dataset artifact immutable и имеет SHA-256. Не перезаписывайте `dataset.parquet` новым содержимым под тем же ID.

## 8. Feature computation pattern

Наиболее понятный способ для первого baseline:

```text
sort eligible games by cutoff, stable tie-breaker
initialize historical state

for each game:
  compute features from current historical state
  write feature row
  if label is available after game:
      update ratings/recent history
```

В реальности label появляется позже, поэтому offline simulation должна соблюдать тот же порядок availability. Если несколько игр идут одновременно, результат одной не должен попасть в feature другой с более ранним cutoff.

## 9. Automated leakage tests

### Cutoff assertion

Каждый source record:

```text
record.availability_time < example.prediction_cutoff
```

### Target permutation sanity

Если случайно перемешать labels, качество должно упасть к baseline. Высокая метрика после permutation — признак утечки/bug.

### Feature timestamp audit

Для sample rows сохраняйте provenance:

```text
feature -> contributing record IDs -> max availability time
```

### Future mutation test

Добавьте в source будущие матчи и пересоберите старый dataset. Features старых examples не должны измениться.

### Forbidden columns

Schema builder явно отклоняет `winner_team_id`, `duration`, post-match fields в feature matrix.

## 10. Missing data

Отсутствие — не ноль:

```text
unknown recent win rate != 0% wins
unknown Elo != rating 0
unknown roster continuity != no continuity
```

Варианты:

- матч не eligible;
- imputation, вычисленная только по train;
- нейтральное prior значение + missing indicator;
- отдельная unknown category.

Политика задаётся до test evaluation и сохраняется в preprocessing pipeline.

## Практика

1. Создайте feature registry для 8–15 простых признаков.
2. Для каждого укажите availability.
3. Реализуйте chronological builder.
4. Сохраните immutable Parquet/manifest.
5. Добавьте future mutation test.
6. Найдите и исключите хотя бы пять leakage columns.
7. Вручную расследуйте 20 случайных rows и их provenance.

## Критерии готовности

- все features имеют availability contract;
- история roster/team не заменена текущим состоянием;
- aggregates используют только прошлые labels;
- текущий match исключён из history;
- preprocessing не обучается на test;
- dataset immutable/checksummed;
- future mutation не меняет старые rows;
- missing не кодируется как ложный ноль;
- sample provenance можно объяснить;
- leakage tests выполняются автоматически.

[Предыдущая глава](01-problem-and-prediction-time.md) · [Оглавление части](README.md) · [Следующая глава](03-python-environment-baselines.md)

