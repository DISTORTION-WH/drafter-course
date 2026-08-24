# Глава 1. Metric contract, grain и population

[← Оглавление](README.md) · [Глава 2 →](02-core-hero-metrics.md)

## Метрика начинается с предложения

Плохо: «pick rate героя за patch».

Хорошо:

> Доля eligible профессиональных матчей patch P, начавшихся в UTC-интервале `[from, to)`, в draft которых герой H был выбран хотя бы один раз.

Теперь понятны population, time field, interval boundary, action и denominator.

## Grain

Grain одной строки endpoint:

```text
один hero × один patch × один normalized filter set × одна metric version
```

Если добавим side, grain станет `hero × side × ...`; нельзя случайно смешать две стороны в одну строку.

## Population

Для MVP eligible match:

- профессиональный match по зафиксированному правилу provider/league;
- не отменён/не remake по определённому threshold/policy;
- canonical core complete;
- draft complete для pick/ban/contest;
- participants/result complete для win rate;
- patch известен и равен filter;
- `start_time >= from AND start_time < to`;
- не помечен duplicate/corrupt/quarantined.

Pick rate и win rate могут иметь разные eligible subsets. Это надо показывать отдельными denominators.

## Почему `[from, to)`

Полуоткрытый interval включает начало и исключает конец. Соседние окна не пересекаются:

```text
[2026-07-01, 2026-07-08)
[2026-07-08, 2026-07-15)
```

Матч ровно в полночь входит только во второе.

## Event time против ingestion time

Мета фильтруется по `match.start_time`, а не `created_at`/`normalized_at`. Иначе поздно загруженный старый match попадёт в сегодняшнюю мету.

Freshness использует ingestion/published time отдельно.

## Metric specification

Создайте tracked документ:

```yaml
id: hero_meta_core
version: 1.0.0
grain: hero
population: pro_matches
event_time: matches.start_time
window: half_open_utc
requires:
  pick_ban_contest: complete_draft
  win_rate: complete_participants_and_result
identities:
  hero: heroes.id
rates_scale: 0_to_1
rounding: none_in_storage_4_decimals_in_ui
```

Semantic version metric не обязательно равна API version. Исправление bug/definition может требовать новую metric version и cache namespace.

## Selection bias

OpenDota/pro dataset может быть неполным или иметь задержки. Отчёт должен говорить «по матчам, включённым в dataset», а не «абсолютно все профессиональные матчи», пока coverage не доказан.

## Simpson’s paradox

Общий win rate может измениться из-за состава турниров/команд/сторон, а не силы героя. Filters и breakdowns нужны, но не надо сразу выдавать causal claims.

## Практика

Напишите contracts для:

1. hero pick rate;
2. hero radiant win rate;
3. team form last 10;
4. hero pair win rate.

Для каждого найдите grain, numerator, denominator, completeness и минимум sample. Не пишите SQL, пока определения нельзя проверить на одном матче вручную.

## Самопроверка

- [ ] Метрика сформулирована одним точным предложением.
- [ ] Grain указан.
- [ ] Event time не перепутан с ingestion time.
- [ ] Window полуоткрытое и UTC.
- [ ] Eligible/missing policy явная.
