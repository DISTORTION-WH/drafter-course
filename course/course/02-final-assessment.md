# Финальная аттестация. Фильтр меты по tournament tier

## Зачем нужна аттестация

Во время курса вы выполняли задания по главам, где границы решения были уже объяснены. Теперь нужно самостоятельно провести одно изменение через всю систему и суметь объяснить каждую строку, контракт и риск.

Задача:

> Добавить фильтр меты по уровню турнира (`tournament tier`) от источника и базы данных до API и мобильного интерфейса, включая миграцию, пересчёт аналитики, тесты, deployment, наблюдаемость и откат.

Это не проверка скорости печати. Аттестация проверяет, умеете ли вы сохранять смысл данных при прохождении через все слои.

## 1. Исходные условия

До работы должны проходить:

```text
lint
typecheck
unit tests
integration tests
current meta endpoint contract test
mobile smoke test
```

Сохраните baseline:

- текущий OpenAPI contract;
- пример ответа `/v1/meta/heroes`;
- текущие query latency и row counts;
- скриншот/тест meta screen;
- freshness последнего успешного ingestion/aggregation;
- точный commit, с которого начинается работа.

Создайте отдельную branch и краткий ADR/feature document.

## 2. Предметный контракт

Сначала определите enum. Пример учебного контракта:

```ts
export const TOURNAMENT_TIERS = [
  'tier_1',
  'tier_2',
  'tier_3',
  'qualifier',
  'unknown',
] as const;

export type TournamentTier = (typeof TOURNAMENT_TIERS)[number];
```

Ваша классификация может отличаться, если источник имеет надёжный официальный словарь. Обязательно запишите:

- что означает каждый tier;
- где находится source value;
- кто владелец canonical mapping;
- как обрабатывается неизвестное значение;
- можно ли изменить tier задним числом;
- как tier турнира выбирается на момент матча;
- входит ли qualifier в отдельную категорию;
- версия mapping, например `tournament-tier-v1`.

`unknown` не должен молча превращаться в `tier_3` или исчезать из общего результата.

## 3. Семантика фильтра

Определите до кода:

```text
filter omitted -> все eligible tiers согласно текущей методологии
tournamentTier=tier_1 -> только матчи tier_1
tournamentTier=unknown -> только явно неклассифицированные
invalid value -> HTTP 400 typed validation error
empty result -> 200 с пустым data и denominator 0
```

Ответ обязан показывать denominator и применённый filter. Иначе пользователь не понимает, по какой выборке рассчитана win/pick rate.

Проверьте важный вопрос: tier относится к турниру, серии или конкретному матчу? Выберите canonical semantics и не храните три противоречивых значения.

## 4. План затронутых слоёв

Заполните impact map:

| Слой | Изменение | Риск | Проверка |
|---|---|---|---|
| provider adapter | получить/сопоставить raw tier | новое значение | fixture test |
| canonical model | сохранить tier/version/source | correction | migration/integration |
| PostgreSQL | column/table/index/constraint | lock/backfill | explain + migration drill |
| ingestion | normalize/reconcile | unknown mapping | unit/data-quality |
| analytics | filter/group/materialization | stale aggregate | exact totals |
| ClickHouse, если включён | dimension/backfill/MV | double count | reconciliation |
| API/OpenAPI | query enum/response applied filters | breaking contract | contract test |
| generated client | regenerated types | manual drift | clean generation diff |
| mobile | selector/query key/states | stale cache | component/E2E |
| deploy | expand/backfill/switch/contract | mixed versions | staging/rollback |
| observability | unknown rate/latency/freshness | silent degradation | dashboard/alert |

Если какой-то слой не используется в вашей реализации, отметьте `N/A` и объясните почему.

## 5. Миграция PostgreSQL

Спроектируйте безопасный expand-contract путь.

### Expand

- добавить nullable/совместимое поле или отдельную classification table;
- не переписывать огромную таблицу блокирующим default без измерения;
- добавить mapping version/source provenance;
- выпустить code, который умеет читать старое отсутствие;
- добавить data-quality metric.

### Backfill

- диапазоны/checkpoints;
- идемпотентность;
- bounded load;
- counts по tier;
- unknown/error report;
- возможность продолжить после остановки;
- correction policy.

### Enforce/contract

- после backfill добавить `NOT NULL`/constraint, только если semantics это допускает;
- индекс выбирать по реальному meta query;
- проверить `EXPLAIN (ANALYZE, BUFFERS)` на staging-like объёме;
- не удалять compatibility path до обновления всех consumers.

Миграция `down` не обязана удалять данные, если это небезопасно. Rollback приложения и rollback schema — разные действия.

## 6. Ingestion и provenance

Provider adapter принимает `unknown` input и возвращает validated provider DTO. Отдельный normalizer сопоставляет source value с canonical tier.

Требования:

- raw payload/archive остаётся доступным по retention policy;
- неизвестное source value не падает в бесконечный retry;
- mapping version записывается;
- новое значение создаёт data-quality event;
- повторная обработка даёт тот же canonical result;
- correction турнира запускает targeted re-aggregation;
- provider-specific названия не протекают в public API.

Fixture cases:

```text
known tier_1
known qualifier
missing field
new unknown provider value
conflicting providers
corrected classification
duplicate ingestion
```

## 7. Аналитическая семантика

Расширьте metric contract:

```text
eligible matches
time interval [from, to)
patch selection
tournament tier selection
minimum denominator
unknown inclusion policy
freshness
methodology version
```

Проверки на небольшом hand-calculated fixture:

```text
10 eligible games total
4 tier_1
3 tier_2
2 qualifier
1 unknown
```

Для нескольких heroes вручную рассчитайте picks, bans, contests, wins и denominators по каждому tier. SQL/result должен совпасть точно.

Если используется PostgreSQL materialized view:

- tier входит в grouping/key;
- refresh/backfill не оставляет старую методологию;
- current pointer переключается после validation.

Если используется ClickHouse:

- tier присутствует в versioned raw event/aggregate contract;
- существующая история backfill'ится;
- incremental MV не считается автоматическим backfill;
- historical/live boundary не имеет дыр/двойного учёта;
- raw и aggregate totals reconciled;
- old read adapter остаётся за flag.

## 8. API contract

Пример:

```http
GET /v1/meta/heroes
  ?patchId=7.xx
  &tournamentTier=tier_1
  &from=...
  &to=...
  &limit=50
```

OpenAPI должен описывать:

- query parameter;
- enum values;
- optional/default semantics;
- `400` для invalid tier;
- applied filter в response metadata;
- denominator/freshness/methodology;
- examples.

Пример metadata:

```json
{
  "filters": {
    "patchId": "7.xx",
    "tournamentTier": "tier_1",
    "from": "...",
    "toExclusive": "..."
  },
  "denominator": {
    "matches": 128
  },
  "freshness": {
    "asOf": "...",
    "status": "fresh"
  },
  "methodologyVersion": "hero-meta-v4"
}
```

Никакой SQL fragment, произвольное имя column или provider value от клиента не передаётся в query. Используйте typed parameter/bindings.

После OpenAPI change generated TypeScript client создаётся стандартной командой. Ручное редактирование generated files запрещено.

## 9. Backend

Путь:

```text
query DTO/runtime validation
-> domain MetaFilter
-> use case/service
-> repository/analytics interface
-> parameterized query
-> domain result
-> response DTO
```

Убедитесь, что tier входит:

- в query object;
- в repository method;
- в cache/query key;
- в metrics fingerprint с ограниченным enum;
- в response filters;
- в shadow comparison key;
- в tests.

Классическая ошибка: SQL уже фильтрует, но cache key не содержит tier, и пользователь tier_2 получает закэшированный tier_1.

## 10. Mobile

Добавьте selector/chips/dropdown согласно текущей design system.

Требования:

- понятная подпись «Уровень турнира»;
- вариант «Все уровни» соответствует отсутствию query parameter;
- выбранное значение входит в TanStack Query key;
- изменение фильтра запускает корректный новый query;
- старые данные не выдаются без appropriate loading/placeholder policy;
- deep link/navigation state при необходимости сохраняет tier;
- empty state объясняет, что для фильтра нет матчей;
- offline cached response показывает applied filter/freshness;
- selector доступен screen reader и keyboard/web sandbox;
- цвет не единственный признак выбранного значения;
- invalid/устаревший deep-link value безопасно отклоняется или нормализуется по контракту.

Не храните два независимых источника состояния для одного filter без необходимости.

## 11. Обязательная матрица тестов

### Unit

- provider mapping;
- unknown/missing/correction;
- DTO parsing enum;
- query-key factory;
- meta metric calculations;
- UI filter state/labels.

### PostgreSQL integration

- migration на пустой базе;
- migration на fixture старой схемы;
- backfill resume/idempotency;
- exact tier filters;
- omitted filter includes correct categories;
- constraint/index/query plan;
- correction/re-aggregation.

### ClickHouse integration, если включён

- history + live boundary;
- tier aggregate totals;
- duplicate batch;
- materialized view backfill;
- shadow equivalence;
- rollback adapter.

### API contract

- omitted;
- каждое допустимое enum value;
- invalid/case/empty value;
- empty result;
- cursor/cache combination;
- OpenAPI/generated client compatibility.

### Mobile component

- default «Все»;
- select tier_1;
- query key/request changed;
- loading/success/empty/error/offline/stale;
- accessibility;
- restored/deep-link state.

### End-to-end

```text
seed mixed-tier matches
-> open meta screen
-> choose tier_1
-> verify counts/list
-> choose qualifier
-> verify different result
-> return All
-> verify aggregate
```

## 12. Deployment plan

Пример стадий:

1. expand migration;
2. ingestion writes tier while readers ignore it;
3. backfill + dashboard unknown rate;
4. build new aggregate shadow;
5. deploy API accepting parameter behind flag;
6. regenerate/release compatible mobile;
7. internal/canary filter enable;
8. compare correctness/latency/freshness;
9. enable 100%;
10. enforce constraint/retire old aggregate after rollback window.

Проверьте mixed versions:

- старый mobile ↔ новый API;
- новый mobile ↔ API во время staged rollout;
- old worker ↔ expanded schema;
- new worker before backfill complete;
- rollback API after schema expansion.

Mobile release нельзя откатить мгновенно на всех устройствах, поэтому API contract должен оставаться совместимым.

## 13. Наблюдаемость

Dashboard:

- matches by canonical tier;
- unknown/mapping error rate;
- backfill remaining/oldest;
- aggregation freshness by tier;
- API request/error/latency by bounded tier enum;
- cache hit ratio;
- empty response rate;
- ClickHouse/PostgreSQL rows read для query fingerprint;
- mobile error/crash breadcrumb без sensitive data.

Alerts:

- unknown spike после provider change;
- tier totals не суммируются к all-tier total;
- freshness SLO нарушен;
- new filter p95 превышает budget;
- correction/rebuild failed;
- cache cross-contamination test/monitor detected.

## 14. Rollback drill

В staging:

1. включите новый filter;
2. вызовите synthetic latency/error regression;
3. отключите server-side flag;
4. убедитесь, что старый mobile path работает;
5. остановите new aggregate promotion;
6. сохраните expanded schema/data;
7. восстановите previous read adapter;
8. подтвердите metrics/freshness;
9. снова исправьте и включите canary.

Rollback не должен требовать срочного destructive `DROP COLUMN`.

## 15. Что сдать

Артефакты:

```text
ADR/impact map
domain/methodology contract
migrations and backfill command/runbook
provider fixtures/normalizer
analytics query/materialization changes
OpenAPI diff + generated client
backend/mobile code
unit/integration/contract/E2E tests
benchmark/query plan
deployment/rollback plan
dashboard/alert evidence
screenshots or device test recording
final self-review
```

Каждый commit атомарен и объясним. Secrets, production dumps и replay artifacts в Git отсутствуют.

## 16. Защита работы

Ответьте без чтения готового текста:

1. Кто владеет canonical tier и почему?
2. Чем `unknown` отличается от отсутствующего фильтра?
3. Почему tier обязан входить в cache/query key?
4. Как correction распространяется в materialized aggregate?
5. Почему ClickHouse MV не backfill'ит старые rows сама?
6. Как вы доказали отсутствие holes/duplicates?
7. Почему invalid tier даёт 400, а empty result — 200?
8. Как старый mobile переживает новый API?
9. Как откатить feature без destructive migration?
10. Какие метрики первыми покажут provider mapping regression?

Если вы не можете объяснить участок, вернитесь к соответствующей части курса и упростите решение.

## 17. Оценивание: 100 баллов

| Раздел | Баллы |
|---|---:|
| предметный контракт и provenance | 10 |
| безопасная миграция/backfill | 15 |
| ingestion/data quality/corrections | 10 |
| корректность аналитики и denominators | 15 |
| OpenAPI/backend/cache | 12 |
| mobile UX/accessibility/offline states | 10 |
| автоматические тесты | 12 |
| deployment/compatibility/rollback | 8 |
| observability/performance | 5 |
| объяснение, commits и документация | 3 |

Условия зачёта:

- минимум 80 баллов;
- ни одного критического провала;
- все required automated checks зелёные;
- staging deployment и rollback drill пройдены;
- вы объясняете решение самостоятельно.

Критические провалы:

- SQL injection/секрет в repository;
- destructive production migration без recovery;
- неверные totals/denominators;
- leakage tier_1 cache в другой tier;
- unknown values молча классифицируются;
- ручное редактирование generated client вместо source contract;
- отсутствие rollback;
- тесты отключены ради зелёного CI.

## 18. Definition of Done всей аттестации

- tier имеет однозначную versioned semantics;
- canonical source/provenance/correction определены;
- migration expand-backfill-enforce воспроизводима;
- ingestion неизвестных значений наблюдаем;
- мета-фильтр математически проверен;
- denominators и applied filters видны;
- API параметризован, typed и обратно совместим;
- generated client синхронизирован;
- cache/query keys включают tier;
- mobile имеет доступный selector и все состояния;
- tests покрывают каждый слой и E2E;
- performance budget подтверждён;
- staged deployment/mixed versions проверены;
- dashboard/alerts работают;
- rollback выполнен без потери canonical данных;
- решение и ограничения объяснены вами.

## После зачёта

Не добавляйте новую технологию автоматически. Возьмите следующий маленький product change и повторите цикл:

```text
contract -> impact map -> safe data change -> implementation
-> tests -> observability -> staged release -> learning
```

Именно способность повторять этот цикл превращает учебный проект в поддерживаемый продукт.

[Главное оглавление курса](../README.md) · [Карта курса](01-course-map.md) · [Сборка MVP](part-21-guided-mvp-assembly/README.md) · [Коммерческий выпускной проект](04-commercial-graduation-project.md)
