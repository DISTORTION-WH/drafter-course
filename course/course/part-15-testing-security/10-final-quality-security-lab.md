# Глава 10. Итоговая лабораторная качества и безопасности

## Цель

Создать тестовый набор, который защищает один полный критический путь:

```text
provider match fixture
-> ingestion/idempotency
-> PostgreSQL
-> /v1/matches и detail
-> mobile list/detail
-> Steam test identity/session
-> watchlist ownership
-> notification event/delivery
-> deep link
```

## 1. Структура

```text
apps/api/test/
  fixtures/
  integration/
  e2e/
apps/mobile/src/**/*.test.tsx
.maestro/flows/
packages/domain/src/**/*.test.ts
docs/testing/
  critical-paths.md
  test-data.md
  restore-runbook.md
  security-checklist.md
```

Не складывайте tests в один giant file.

## 2. Обязательные unit tests

- meta denominator/remakes;
- match state machine;
- cursor encoding/validation;
- ID как string;
- refresh rotation/reuse state;
- notification dedup key;
- push action parser;
- retry classification;
- guest watchlist merge.

## 3. Integration tests

С настоящими disposable PostgreSQL/Redis:

- migrations from empty;
- match upsert дважды;
- cursor tie-breaker;
- DB constraints;
- transaction rollback/outbox;
- concurrent refresh;
- unique Steam identity;
- watchlist ownership query;
- job deduplication.

## 4. HTTP E2E

Проверьте status/body/OpenAPI schema:

```text
GET /v1/matches
GET /v1/matches/{id}
GET /v1/meta/snapshot
POST /v1/auth/exchange
POST /v1/auth/refresh
GET/POST/DELETE /v1/me/watchlist
PUT /v1/me/notification-preferences
POST /v1/me/push-devices
DELETE /v1/me
```

Внешние providers fake; infrastructure real.

## 5. Mobile tests

Для match list/detail/watchlist/account:

- pending;
- success;
- empty;
- no-cache error;
- cached refetch error;
- user interaction;
- account switch/private cache;
- invalid notification link.

## 6. Maestro smoke

Минимум:

1. fresh E2E build открывает список;
2. пользователь открывает deterministic match;
3. test login создаёт session;
4. команда добавляется;
5. deep link открывает match;
6. logout убирает private state.

## 7. Security regression tests

- cross-user IDOR;
- reused exchange/refresh token;
- arbitrary redirect URL;
- oversized/unknown input;
- SQL injection payload остаётся данными;
- forged IP header не обходит limiter;
- secret/token redaction;
- worker не отправляет disabled device;
- deletion job повторяется безопасно.

## 8. Restore drill

Создайте backup тестовой БД, восстановите в новую, выполните migrations/health/API smoke и запишите RPO/RTO evidence. Test environment не отправляет push и не использует production keys.

## 9. Команды CI

Приведите scripts к одному контракту:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e:api
pnpm test:mobile
pnpm api:openapi:check
pnpm security:check
```

Точные команды создаются в package/root scripts. Каждый процесс завершается ненулевым exit code при ошибке и создаёт диагностический artifact при необходимости.

## 10. Definition of Done части 15

- критические правила нанесены на test matrix;
- быстрые tests детерминированы;
- SQL проверяется настоящим PostgreSQL той же major-линии;
- migrations проходят с пустого состояния;
- contract fixtures безопасны и версионированы;
- HTTP E2E включает auth/ownership/error envelope;
- mobile tests используют поведение/доступные queries;
- device suite мал и стабилен;
- input/rate limit/secret/constraint layers протестированы;
- dependency findings имеют triage policy;
- backup реально восстановлен;
- ни один test не зависит от production или чужого provider password;
- failures дают достаточно context без утечки secrets.

## Что дальше

Теперь проверки можно встроить в reproducible container build и CI/CD. Следующая часть создаёт Docker image, локальный Compose stack, staging/production environments, безопасные migrations, GitHub Actions, EAS builds и rollback.

[Предыдущая глава](09-backup-dependencies-security-ci.md) · [Оглавление части](README.md) · [Перейти к части 16](../part-16-docker-cicd-production/README.md)
