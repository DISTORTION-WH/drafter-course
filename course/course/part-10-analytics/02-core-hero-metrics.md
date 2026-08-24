# Глава 2. Pick, ban, contest и win rate

[← Глава 1](01-metric-contract-and-grain.md) · [Оглавление](README.md) · [Глава 3 →](03-patch-windows-and-filters.md)

## Raw counters прежде процентов

Для героя H:

- `eligibleDrafts` — число eligible matches с полным draft;
- `picks` — eligible drafts, где H выбран;
- `bans` — eligible drafts, где H забанен;
- `contests = picks + bans` при условии, что в одном draft герой не может появиться в обеих категориях;
- `games` — eligible сыгранные матчи, где H участвовал;
- `wins` — эти games, выигранные стороной H.

Если data допускает duplicate/contradictory actions, сначала quarantine/deduplicate по контракту; нельзя просто складывать.

## Формулы

```text
pickRate    = picks / eligibleDrafts
banRate     = bans / eligibleDrafts
contestRate = (picks + bans) / eligibleDrafts
winRate     = wins / games
```

Все rates хранятся/выдаются как ratio `0..1`. UI отображает `67.4%`. Не храните уже округлённый percent.

## Разные denominators

`winRate` делится на picks/games героя, а не на все drafts. Если герой выбран 10 раз и победил 6, win rate `0.6` независимо от 100 eligible drafts.

`pickRate = 10/100 = 0.1`.

## `games` и `picks`

При полном согласованном dataset один pick приводит к одному participant/game. Но draft может быть полный, а participant detail partial. Поэтому счётчики/denominators не обязаны совпадать. Endpoint показывает оба и data coverage.

## Side metrics

```text
radiantPickRate = radiant picks / eligibleDrafts
direPickRate     = dire picks / eligibleDrafts
radiantWinRate   = radiant-side wins with hero / radiant games with hero
```

Сумма side picks равна total picks при полном mapping. Но radiant/dire pick rates каждый имеют denominator drafts; их сумма равна total pick rate.

## First phase и role

Draft order/phase требует versioned mapping для текущего Captain’s Mode. Не угадывайте phase по sequence без patch-aware rules. Role ещё сложнее: provider role может отсутствовать/быть inferred. В MVP core metrics не смешиваем с предположительным role.

## Contest > 100%

При определении «доля drafts» contest не может превышать 1. Значение >1 означает:

- вы считали action rows, а не distinct match/hero;
- duplicate draft actions;
- picks+bans overlap;
- denominator слишком мал из-за другого filter.

Это data-quality alarm.

## Пример

4 eligible drafts. Герой выбран в 3, забанен в 1. В выбранных матчах 2 победы:

```text
pickRate = 3/4 = 0.75
banRate = 1/4 = 0.25
contestRate = 4/4 = 1.00
winRate = 2/3 ≈ 0.6667
```

Показывать `66.7%` без `2–1, n=3` вводит в заблуждение.

## Практика

Рассчитайте вручную 3 heroes на 5 matches, включая один match с complete draft, но incomplete participants. Сравните `eligibleDrafts` и `games`. Это станет golden fixture главы 9.

## Самопроверка

- [ ] Raw counters доступны вместе с rates.
- [ ] Win rate denominator — games/picks героя.
- [ ] Contest при нашем definition не выше 1.
- [ ] Complete draft и complete result могут дать разные samples.
- [ ] UI, а не storage, округляет percent.
