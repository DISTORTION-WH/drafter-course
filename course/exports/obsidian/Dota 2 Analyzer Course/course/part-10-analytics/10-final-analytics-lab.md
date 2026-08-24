# Глава 10. Итоговая лабораторная: `/v1/meta/heroes`

[← Глава 9](09-analytics-testing.md) · [Оглавление](README.md) · [Часть 11 →](../part-11-react/README.md)

## Цель

Добавить полностью проверяемую вертикаль аналитики: от metric specification и migrations до materialized counters, cache и public endpoint.

## Структура

```text
docs/metrics/
└─ hero-meta-core-v1.md
apps/api/src/meta/heroes/
├─ hero-meta.controller.ts
├─ hero-meta.service.ts
├─ hero-meta.repository.ts
├─ hero-meta.mapper.ts
├─ hero-meta-cache.ts
├─ wilson.ts
└─ dto/
apps/worker/src/analytics/
├─ refresh-hero-meta.job.ts
└─ refresh-hero-meta.processor.ts
drizzle/
├─ ...add-completeness-columns.sql
└─ ...add-hero-meta-daily-v1.sql
```

## Шаг 1. Specification

До кода зафиксируйте population/grain/formulas/completeness/window/version/rounding/freshness. Review specification как API contract.

## Шаг 2. Canonical readiness

Migration добавляет/нормализует признаки:

- `is_professional`;
- `has_complete_draft`;
- `has_complete_participants`;
- `is_quarantined`;
- patch identity/mapping lineage.

Backfill flags из подтверждённых ingestion states. Unknown не превращается в false без distinction, если это влияет на coverage.

## Шаг 3. Golden fixture

Создайте 4+ boundary/partial matches и expected counters вручную. Integration test сначала может падать.

## Шаг 4. Base SQL

Реализуйте eligible CTE, отдельные draft/results aggregations и raw counters. Добейтесь exact expected counts. Только затем добавьте rates.

## Шаг 5. Materialization

Создайте `hero_meta_daily_v1` с additive counters, unique grain и indexes. Запишите refresh metadata. Проверяйте late-arriving match.

## Шаг 6. Service/formulas

Service суммирует buckets для effective window, вычисляет rates/Wilson, ставит `insufficientSample`, сортирует approved key и ограничивает result.

## Шаг 7. API/OpenAPI

Реализуйте `/v1/meta/heroes`, DTO validation, response/error schemas и examples. Все ID strings, timestamps UTC, rates `number|null`.

## Шаг 8. Cache

Key включает metric version, normalized filters и refresh generation. Добавьте short single-flight/lock и parser cached JSON как `unknown`.

## Шаг 9. Worker refresh

BullMQ scheduled job инициирует refresh. Одновременно работает только один refresh конкретной view/version. Failed refresh сохраняет last good, пишет status и alert metric.

## Шаг 10. Observability

Metrics:

- refresh duration/status/age;
- query latency/cache hit;
- eligible/excluded counts;
- impossible invariant count;
- endpoint freshness state.

## Acceptance table

| Проверка | Ожидание |
|---|---|
| Hero A golden counters | `4/3/1/3/2` по полям |
| rates | `.75/.25/1/.666…` |
| `games=0` | win/interval `null` |
| match at `to` | исключён |
| incomplete draft | не меняет eligibleDrafts |
| incomplete participants | не меняет games/wins |
| late match before refresh | старые counters |
| late match after refresh | новые counters/generation |
| другой patch | не смешан |
| invalid filter | единый `400` |
| unknown known-empty patch | documented empty behavior |
| refresh failure | last good + stale metadata/policy |

## Команды проверки

```powershell
pnpm typecheck
pnpm test
pnpm db:migrate
pnpm analytics:refresh -- hero-meta-core@1.0.0
pnpm openapi:generate
```

Затем запросите endpoint через `Invoke-RestMethod` и сравните golden result.

## Commit plan

```text
docs(metrics): define hero meta core v1
feat(analytics): add eligible hero counter query
feat(analytics): materialize daily hero counters
feat(meta): expose versioned hero meta endpoint
feat(meta): cache by refresh generation
test(meta): add golden SQL and API contract suite
```

## Definition of done

- [ ] Metric contract reviewable и versioned.
- [ ] Один patch/window, event time и eligibility явны.
- [ ] Counters совпадают с ручным fixture.
- [ ] Rates используют правильные denominators.
- [ ] `n=0` → `null`, все остальные rates finite `0..1`.
- [ ] Wilson tested на reference cases.
- [ ] Materialized grain unique, rates не усредняются.
- [ ] Refresh metadata и late-data behavior видимы.
- [ ] API возвращает samples, coverage, freshness и metric version.
- [ ] Cache key зависит от filters/version/generation.
- [ ] Impossible counters блокируют публикацию/дают alert.

## Что уже умеет приложение после части 10

```text
OpenDota
→ надёжный HTTP client
→ raw archive
→ provider adapter
→ Redis/BullMQ worker
→ PostgreSQL canonical facts
→ versioned analytical aggregate
→ NestJS `/v1/matches` и `/v1/meta/heroes`
```

Backend-основание MVP готово на учебном уровне. Следующая часть общей карты — основы React, после неё React Native/Expo и подключение mobile к этому API.
