# Глава 6. Мета, поиск, фильтры и freshness

## Цель

Дать пользователю аналитическую ценность, не показывая проценты без выборки, периода и свежести.

## 1. Meta v1

Для MVP:

- pick rate;
- ban rate;
- contest rate;
- win rate среди picked;
- games/matches denominator;
- filters: patch, time, tournament tier;
- minimum sample warning.

Синергии/counters/roles добавляются позже, потому что требуют более сложной grain/eligibility semantics.

## 2. Metric contract

```text
population = eligible completed professional games
grain = hero within game/draft
pick_rate = picked_games / eligible_games
ban_rate = banned_games / eligible_games
contest_rate = (picked_or_banned_games) / eligible_games
win_rate = wins_when_picked / picked_games
interval = [from, to)
patch/tier = canonical as-of match
methodology = hero-meta-v1
```

Проверьте, считается ли одна game или серия denominator. Не меняйте между endpoints.

## 3. Hand-calculated fixture

Создайте 10–20 synthetic games и таблицу ручных ожиданий. Tests должны ловить:

- hero only picked;
- only banned;
- pick and invalid duplicate;
- Radiant/Dire win;
- cancelled/remake excluded;
- patch boundary;
- tier filter;
- empty selection;
- denominator zero.

## 4. API

```http
GET /v1/meta/heroes?patchId=&tournamentTier=&from=&to=&sort=&cursor=&limit=
```

Response:

```json
{
  "data": [],
  "filters": {},
  "denominator": { "games": 0 },
  "methodologyVersion": "hero-meta-v1",
  "freshness": { "asOf": "...", "status": "fresh" },
  "quality": { "warnings": [] }
}
```

Percentages можно отдавать decimal fraction `0..1`; formatting в mobile. Contract фиксирует это явно.

## 5. Query and cache

Начните с PostgreSQL query/materialized table из части 10. Cache key включает:

```text
methodology
patch
tier
from/to
sort
cursor/limit
locale only if response localized
```

Cache TTL не заменяет source freshness. Ответ сообщает `asOf` независимо от cache age.

## 6. Mobile meta screen

- явные filter chips;
- applied filters рядом с результатом;
- games denominator;
- sample warning;
- loading/error/empty/stale;
- sort indicator;
- accessible numeric labels;
- methodology link.

Не используйте `53.428573%`; разумное округление и N важнее ложной точности.

## 7. Search v1

Scope:

```text
teams by normalized name
players by nickname
tournaments by name
exact decimal match ID
```

Endpoint ограничивает query length, result count и rate. Search term параметризован/escaped according to DB driver. Не запускайте arbitrary regex от пользователя.

## 8. Normalization

Храните display name отдельно от search form:

```text
case normalization
whitespace normalization
aliases/history
Unicode policy
```

Не уничтожайте исходное написание. Alias имеет source/provenance/validity.

## 9. Freshness state

```text
fresh      lag <= target
delayed    lag above target, data still useful
stale      past safety/product threshold
unknown    no reliable watermark
```

Mobile copy говорит, что произошло, а не показывает красный icon без текста.

## 10. Data-quality dashboard

- last provider success;
- newest canonical match;
- newest completed with details;
- meta materialization as-of;
- missing draft/team/player rate;
- unknown patch/tier;
- search zero-result trend;
- reconciliation backlog.

## 11. Performance budget

Пример starting budgets, затем измерить:

```text
match list p95 < 500 ms
details p95 < 500 ms
meta p95 < 750 ms cached/materialized
search p95 < 300 ms
max response bytes documented
```

Не переносите в ClickHouse до измеренной причины.

## Definition of Done

- metric contract точен;
- golden fixture совпадает вручную;
- denominator/methodology/freshness видны;
- cache key содержит все filters;
- search bounded/parameterized;
- display names не потеряны normalization;
- mobile имеет sample/stale/empty states;
- freshness/data quality dashboard работает;
- p95/response size измерены;
- PostgreSQL остаётся достаточным либо ADR доказывает обратное.

[Предыдущая глава](05-core-domain-screens.md) · [Оглавление](README.md) · [Следующая глава](07-auth-watchlist-notifications.md)

