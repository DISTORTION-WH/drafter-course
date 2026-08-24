# Глава 3. Вертикаль №1: fixture → PostgreSQL → API → mobile

## Цель

Показать один заранее известный матч на физическом телефоне. Никакого внешнего API: сначала доказать собственный путь без network/provider uncertainty.

## 1. Почему fixture раньше provider

Если одновременно не работают provider, validation, database, backend и mobile, новичок не знает, где причина. Fixture исключает первый внешний фактор.

Путь:

```text
small licensed/synthetic fixture
-> runtime parser
-> PostgreSQL seed
-> GET /v1/matches/:id
-> generated client
-> MatchDetailsScreen
```

## 2. Fixture

`packages/testing/fixtures/match-completed-v1.json`:

```json
{
  "schemaVersion": 1,
  "matchId": "8000000000",
  "status": "completed",
  "startedAt": "2026-01-10T12:00:00Z",
  "durationSeconds": 2410,
  "radiant": { "teamId": "101", "name": "Radiant Fixture" },
  "dire": { "teamId": "202", "name": "Dire Fixture" },
  "winnerSide": "radiant"
}
```

Используйте вымышленные names/IDs, чтобы fixture не несла чужие assets/персональные данные.

## 3. Runtime parsing

TypeScript type не проверяет JSON. Создайте schema parser в `contracts` и tests:

```text
valid completed
missing matchId
numeric matchId rejected
bad ISO time
negative duration
unknown status
extra optional field according to policy
```

Parser возвращает canonical seed model или typed error с JSON path, но не весь payload в log.

## 4. Minimal database

Первая migration:

```text
teams
matches
schema_migrations managed by chosen tool
```

Не создавайте сразу 40 tables. Требования:

- primary keys;
- Radiant/Dire foreign keys;
- `started_at timestamptz`;
- duration check;
- winner side enum/check;
- timestamps;
- unique provider identity/provenance field, если применимо.

Запустите:

```powershell
docker compose up -d postgres
pnpm db:migrate
pnpm db:seed
```

После seed SQL-запросом подтвердите одну игру и две команды.

## 5. Repository

Интерфейс:

```ts
export interface MatchRepository {
  findDetailsById(matchId: MatchId): Promise<MatchDetails | null>;
}
```

PostgreSQL adapter parameterized. Controller не пишет SQL.

Integration test поднимает чистую database, применяет migration, seed и проверяет domain result.

## 6. Use case и controller

```text
GET /v1/matches/8000000000
```

States:

- `200` validated response;
- `400` malformed ID;
- `404 MATCH_NOT_FOUND`;
- `503` database unavailable без stack trace.

Response содержит `freshness.asOf`/source status даже для fixture, чтобы contract не пришлось ломать позже.

## 7. OpenAPI и generated client

После endpoint:

1. сгенерируйте OpenAPI JSON;
2. проверьте response/error examples;
3. сгенерируйте client в package;
4. запретите ручное редактирование generated files;
5. добавьте CI check, что regeneration не создаёт diff.

## 8. Mobile environment

На physical device `localhost` означает телефон. Development API URL должен указывать на LAN IP компьютера или tunnel по правилам курса.

Runtime config:

```text
development -> local LAN HTTPS/HTTP only for controlled dev
staging -> https://staging-api.example.com
production -> https://api.example.com
```

Production build отказывается запускаться со staging/local URL.

## 9. Match screen

Экран показывает:

- loading skeleton;
- team names/sides;
- status/start/duration;
- winner;
- freshness/source label;
- retryable error;
- not found;
- offline cached state, если уже изучено.

Не начинайте с графика. Сначала текстовый корректный screen.

## 10. Tests

```text
schema unit
domain unit
repository integration
API e2e
OpenAPI contract
mobile component states
physical-device smoke
```

Device smoke evidence:

```text
build ID
device/OS
API environment
match ID
expected/actual
timestamp
screenshot without secrets
```

## 11. Debug sequence

Если screen не работает:

1. `SELECT` подтверждает row;
2. repository test;
3. API через curl/HTTP client;
4. OpenAPI response;
5. mobile network log;
6. runtime parse;
7. render state.

Не меняйте все слои одновременно.

## 12. Commit sequence

```text
feat(db): add minimal teams and matches schema
test(db): add seeded match repository integration
feat(api): expose match details endpoint
feat(mobile): render first match details vertical slice
test(e2e): cover fixture match on device
```

## Definition of Done

- synthetic fixture validated;
- migration работает с пустой базы;
- seed идемпотентен или явно dev-reset only;
- repository parameterized;
- endpoint имеет typed errors/freshness;
- generated client синхронизирован;
- phone получает данные не через mock;
- loading/error/empty/success протестированы;
- CI зелёный;
- screenshot/device evidence сохранены.

[Предыдущая глава](02-production-monorepo.md) · [Оглавление](README.md) · [Следующая глава](04-provider-ingestion-slice.md)
