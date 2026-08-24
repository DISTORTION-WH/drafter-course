# Глава 5. Матчи, серии, команды, игроки и драфты

## Цель

Расширять приложение вертикалями, сохраняя один domain vocabulary и не создавая screens поверх непроверенных связей.

## 1. Порядок вертикалей

```text
A. match list
B. match details
C. team details
D. player details
E. draft
F. series/tournament context
```

Каждая вертикаль заканчивается API contract, generated client, mobile states и тестами до следующей.

## 2. Canonical tables

Минимальный набор постепенно:

```text
tournaments
series
teams
team_names/history
players
team_roster_memberships
matches
match_players
match_drafts
patches
provider_identities
```

Не храните только текущую команду игрока. История состава имеет `valid_from/valid_to`, provenance/correction.

## 3. Match list

Endpoint:

```http
GET /v1/matches?status=&from=&to=&teamId=&cursor=&limit=
```

Rules:

- UTC полуоткрытый interval;
- cursor pagination со stable tie-breaker;
- maximum date range/limit;
- cancelled/rescheduled status;
- series score семантически отделён от game winner;
- freshness/quality metadata.

Mobile использует `FlatList`, stable keys, pull-to-refresh и empty/error/offline states.

## 4. Match details

Не возвращайте один гигантский DTO «на все будущие случаи». Sections могут быть:

```text
summary
draft
players/stats
series context
data availability
```

Если draft отсутствует, response явно содержит `availability: unavailable/pending`, а не пустые picks, похожие на нулевой draft.

## 5. Team details

```http
GET /v1/teams/{teamId}
GET /v1/teams/{teamId}/matches?cursor=...
GET /v1/teams/{teamId}/form?window=10
```

Form contract:

- только eligible completed matches до `asOf`;
- window denominator;
- side/opponent context;
- correction/freshness;
- no future result.

Логотип отображается только при подтверждённом праве. Иначе используйте собственный text/initial placeholder.

## 6. Player details

Показывайте только поля, для которых есть стабильная identity/provenance:

- nickname;
- current/historical team;
- role, если источник/semantics надёжен;
- recent professional matches;
- aggregated hero/stat samples.

Не смешивайте public pro identity и private Steam profile. Фото имеет отдельное право.

## 7. Draft

Draft model:

```text
match_id
order
phase
action pick|ban
team_side radiant|dire
hero_id
occurred/order source
schema/version
```

Constraints/tests:

- unique order per match;
- allowed action/side;
- hero exists;
- no impossible duplicates according to game mode/patch;
- partial draft marked incomplete;
- unknown phase preserved/quality flag, not guessed.

## 8. Tournament and series

Tournament name/logo/tier/region may come from different sources. Canonical mapping and correction must be explicit.

Series endpoint distinguishes:

```text
scheduled best-of
games currently discovered
series score
winner after completion
rescheduled/cancelled
```

Do not infer future game IDs or series winner from incomplete provider rows.

## 9. API composition

Avoid N+1:

```text
match list -> one query/bounded joins
team names -> joined/batched
hero dictionary -> cache/versioned package
```

Measure query plans. Client should not call player endpoint ten times just to draw one match table if backend can return a bounded participant summary.

## 10. Mobile navigation

Typed route parameters pass only IDs, not entire stale objects. Query keys:

```ts
['matches', filters]
['match', matchId]
['team', teamId]
['team-matches', teamId, filters]
['player', playerId]
```

Every filter affecting response belongs to key.

## 11. Accessibility

- side/winner encoded text + color;
- draft order read in logical order;
- player table remains usable with large font;
- images have labels/fallback;
- touch targets adequate;
- charts have textual summary.

## 12. Vertical checklist per feature

```text
domain semantics
rights/provenance
migration/constraints
ingestion/merge
repository query/explain
OpenAPI/errors
generated client
mobile states/accessibility
unit/integration/E2E
freshness/metrics
rollback
```

## Definition of Done

- core identities/relations canonical;
- historical roster not overwritten;
- lists paginated/bounded;
- partial data has typed availability;
- drafts validated/versioned;
- names/images have rights status;
- no N+1 critical path;
- generated routes/query keys correct;
- accessibility states tested;
- physical device completes matches → team/player flow.

[Предыдущая глава](04-provider-ingestion-slice.md) · [Оглавление](README.md) · [Следующая глава](06-meta-search-freshness.md)

