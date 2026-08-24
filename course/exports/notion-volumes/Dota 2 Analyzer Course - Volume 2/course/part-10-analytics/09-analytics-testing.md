# Глава 9. Тестирование аналитики и data quality

[← Глава 8](08-cache-freshness-versioning.md) · [Оглавление](README.md) · [Глава 10 →](10-final-analytics-lab.md)

## Golden dataset

Создайте маленький synthetic dataset, который можно посчитать вручную. Не используйте огромный live sample как единственный test oracle.

Пример 4 eligible drafts одного patch:

- Hero A: picks 3, bans 1, wins 2 из 3;
- Hero B: picks 1, bans 2, wins 0 из 1;
- Hero C: picks 0, bans 0, games 0;
- один дополнительный match incomplete draft — исключён из draft denominator;
- один complete draft/incomplete participants — входит в draft metrics, не win sample;
- match ровно на `to` — исключён.

Expected A:

```text
eligibleDrafts=4, picks=3, bans=1, games=3, wins=2
pick=.75, ban=.25, contest=1, win=.666...
```

## Уровни тестов

### Pure formula tests

- rate/division;
- Wilson;
- filter normalization;
- cache key;
- metric version serialization.

### SQL integration

- migrations + fixtures;
- exact counters;
- boundary/exclusion;
- duplicate defense/quality errors;
- materialized refresh/late data.

### API E2E

- DTO/status/schema;
- sort/min sample;
- null/finite numbers;
- metadata/freshness/cache.

## Property/invariant tests

Для generated valid counters:

```text
0 <= wins <= games
0 <= picks <= eligibleDrafts
0 <= bans <= eligibleDrafts
0 <= picks + bans <= eligibleDrafts
rate is null iff denominator = 0
otherwise 0 <= rate <= 1
Wilson lower <= raw rate <= upper
```

Последнее обычно выполняется для Wilson two-sided interval; проверьте implementation/reference values.

## SQL differential test

Для небольшого fixture рассчитайте counters двумя независимыми способами:

1. простой TypeScript loop по canonical rows;
2. production SQL/materialized view.

Результаты должны совпасть. Это помогает поймать join multiplication/filter mistake.

## Mutation scenarios

- late match после refresh;
- match patch mapping исправлен;
- full data заменяет partial;
- duplicate action inserted (constraint/quality catches);
- hero disabled, но исторические rows остаются;
- new parser reprocess меняет draft;
- refresh fails, old result remains.

## Floating comparison

Не сравнивайте дроби через formatted string. Для test:

```ts
assert.ok(Math.abs(actual - expected) < 1e-12);
```

Counters сравниваются точно. API decimal representation может иметь contract tolerance.

## Snapshot tests

Snapshot полезен для full response schema, но не заменяет assertions ключевых counters. Иначе ошибочный update snapshot «узаконит» bug.

## Production data checks

После каждого refresh:

- no duplicate grain;
- no impossible counters/rates;
- expected hero coverage;
- denominator not unexpectedly zero;
- counts reconcile with eligible match set;
- refresh row complete;
- change vs previous within alert policy (не жёсткий fail для реальной meta shift).

## Практика

Сначала напишите expected table вручную, потом fixture/SQL. Намеренно внесите join multiplication bug и убедитесь, что invariant/differential test падает.

## Самопроверка

- [ ] Golden fixture посчитан вручную.
- [ ] SQL и independent implementation сравниваются.
- [ ] Boundary/partial/late data покрыты.
- [ ] Counters проверяются отдельно от rates.
- [ ] Snapshot не является единственной проверкой.
