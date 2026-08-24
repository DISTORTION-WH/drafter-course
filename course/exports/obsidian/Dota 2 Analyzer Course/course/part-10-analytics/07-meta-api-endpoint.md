# Глава 7. REST endpoint меты

[← Глава 6](06-materialized-views.md) · [Оглавление](README.md) · [Глава 8 →](08-cache-freshness-versioning.md)

## Request

```http
GET /v1/meta/heroes
  ?patch=7.XX
  &from=2026-07-01T00:00:00Z
  &to=2026-07-16T00:00:00Z
  &minPicks=10
  &sort=contestRateDesc
  &limit=50
```

`patch` обязателен в MVP. Allowed sort whitelist:

- `contestRateDesc`;
- `pickRateDesc`;
- `banRateDesc`;
- `winRateDesc`;
- `wilsonLowerDesc`;
- `heroNameAsc`.

## Response

```json
{
  "items": [
    {
      "hero": { "id": "1", "name": "Anti-Mage" },
      "sample": {
        "eligibleDrafts": 120,
        "picks": 30,
        "bans": 12,
        "games": 30,
        "wins": 18
      },
      "rates": {
        "pick": 0.25,
        "ban": 0.1,
        "contest": 0.35,
        "win": 0.6
      },
      "winRateInterval": { "method": "wilson", "level": 0.95, "lower": 0.423, "upper": 0.754 },
      "insufficientSample": false
    }
  ],
  "filters": {
    "patch": "7.XX",
    "from": "2026-07-01T00:00:00.000Z",
    "to": "2026-07-16T00:00:00.000Z",
    "minPicks": 10,
    "sort": "contestRateDesc"
  },
  "meta": {
    "metricId": "hero_meta_core",
    "metricVersion": "1.0.0",
    "computedAt": "2026-07-16T00:05:00.000Z",
    "dataCutoff": "2026-07-16T00:00:00.000Z",
    "lastMatchStartedAt": "2026-07-15T23:40:00.000Z",
    "coverage": { "eligibleMatches": 120, "excludedMissingDraft": 3, "excludedUnknownPatch": 1 }
  }
}
```

## Service flow

```text
DTO validation
→ normalize filters
→ cache lookup
→ analytics repository sums buckets
→ calculate rates/intervals
→ minimum sample flag/filter
→ whitelist sort + limit
→ response + freshness
```

## SQL sort безопасность

Не подставляйте query `sort` как raw SQL. Map enum:

```ts
const orderBy = {
  contestRateDesc: sql`contest_rate DESC, hero_id ASC`,
  heroNameAsc: sql`display_name ASC, hero_id ASC`,
}[sort];
```

Лучше вычислить approved query variant. Tie-breaker обязателен.

## Null rate

При `games=0`, `win=null`, interval `null`, insufficient sample true. Не сериализуйте `NaN`/`Infinity` (JSON превратит их непредсказуемо/в `null`). Mapper проверяет finite/range.

## Ошибки

- invalid range/filter → `400 INVALID_REQUEST`;
- unknown patch ID: либо `404 PATCH_NOT_FOUND`, если справочник не знает patch, либо `200 []`, если patch известен, но данных нет;
- refresh ещё не создан → `503 ANALYTICS_NOT_READY`;
- stale beyond hard threshold → product policy: serve stale with warning или `503`; явно зафиксировать.

## Pagination

В игре ограниченное число heroes, поэтому `limit` до полного справочника и stable sort достаточно. Cursor можно не добавлять в MVP. Не применяйте шаблон pagination там, где dataset мал.

## Практика

Напишите DTO/OpenAPI schemas и E2E для valid, no data, unknown patch, `n=0`, invalid sort/range, stale metadata. Проверьте, что все rates либо `null`, либо finite `0..1`.

## Самопроверка

- [ ] Response содержит counters, rates и interval.
- [ ] Effective filters и metric version возвращаются.
- [ ] Sort whitelist, tie-breaker stable.
- [ ] `n=0` не превращается в zero win rate.
- [ ] Coverage/freshness видимы.
