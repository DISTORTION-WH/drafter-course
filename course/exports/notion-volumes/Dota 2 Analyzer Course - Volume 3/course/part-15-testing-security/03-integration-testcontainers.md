# Глава 3. Integration-тесты с Testcontainers

## 1. Зачем настоящий PostgreSQL

Repository использует PostgreSQL-специфичное поведение:

- `timestamptz`;
- JSONB;
- partial/unique indexes;
- transactions и locks;
- `ON CONFLICT`;
- materialized views;
- constraints;
- cursor ordering.

In-memory массив или SQLite не доказывает работу этих возможностей. Testcontainers запускает disposable PostgreSQL container для тестового процесса.

## 2. Требования

- Docker-compatible runtime запущен;
- тестовый процесс имеет доступ к Docker socket/daemon;
- image tag фиксирован и совместим с production major;
- CI runner поддерживает containers;
- тест не обращается к development/production БД.

Установка:

```bash
pnpm add -D testcontainers @testcontainers/postgresql
```

Команда и package names сверяются с текущей официальной документацией зафиксированной версии.

## 3. Жизненный цикл контейнера

```ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll } from 'vitest';

let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;
let database: TestDatabase;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:18-bookworm')
    .withDatabase('dota_test')
    .withUsername('test_user')
    .withPassword('test_password')
    .start();

  database = await createTestDatabase(container.getConnectionUri());
  await database.runMigrations();
}, 120_000);

afterAll(async () => {
  await database.close();
  await container.stop();
});
```

Тип started container удобнее импортировать явно из установленного package, чем использовать сложный `ReturnType`; пример показывает идею. Пароль тестовый и локальный, production secrets здесь не используются.

Не ставьте `latest`: тест внезапно изменится при следующем pull. Major PostgreSQL должен совпадать с production, а patch image обновляется контролируемым PR.

## 4. Миграции — часть теста

Не создавайте schema отдельным тестовым SQL, иначе tests проверят схему, которой нет в production.

```text
empty official image
  -> выполнить все migrations
  -> seed конкретного теста
  -> выполнить repository/service
```

Добавьте отдельный migration test:

1. поднять предыдущую поддерживаемую schema;
2. добавить данные граничных случаев;
3. применить новые migrations;
4. проверить сохранность и constraints;
5. при поддерживаемом downgrade проверить rollback отдельно.

## 5. Изоляция тестов

Варианты:

- один container на file/suite, `TRUNCATE ... RESTART IDENTITY CASCADE` между tests;
- новая schema/database на worker;
- transaction rollback, если код под тестом не управляет собственными transactions;
- container на каждый test — максимально чисто, но медленно.

Стартовая политика: один container на integration project, отдельная database/schema на parallel worker и явная очистка. Не позволяйте двум workers писать в одни таблицы.

## 6. Repository test cursor pagination

```ts
it('не пропускает матчи с одинаковым временем', async () => {
  const startedAt = new Date('2026-07-01T10:00:00.000Z');

  await seedMatches([
    matchRow({ id: '1003', startedAt }),
    matchRow({ id: '1002', startedAt }),
    matchRow({ id: '1001', startedAt }),
  ]);

  const first = await repository.list({ limit: 2 });
  const second = await repository.list({
    limit: 2,
    cursor: first.nextCursor ?? undefined,
  });

  expect([...first.items, ...second.items].map((item) => item.id))
    .toEqual(['1003', '1002', '1001']);
});
```

Это невозможно честно доказать mock repository.

## 7. Проверяем constraints

```ts
it('БД не допускает две одинаковые watchlist entries', async () => {
  await repository.add(userId, 'team', '2163');

  await expect(repository.add(userId, 'team', '2163'))
    .rejects.toMatchObject({ code: 'WATCHLIST_ALREADY_EXISTS' });
});
```

Repository преобразует конкретный SQLSTATE/constraint name в domain error. Не связывайте controller с текстом PostgreSQL.

## 8. Redis/BullMQ

Для idempotency, locks и jobs используйте настоящий Redis container в integration suite. Проверяйте:

- deterministic `jobId` не создаёт дубликат;
- retry/backoff policy;
- dead-letter/failed state;
- lock TTL и повторное получение;
- job payload не содержит секретов.

Не пытайтесь проверять wall-clock backoff минутами. Вынесите policy в unit test, а integration проверяет один короткий переход.

## 9. Не делайте container глобальным навечно

Reusable containers ускоряют local development, но могут сохранить состояние и скрыть зависимость тестов. CI должен уметь пройти с чистого image. Local reuse — оптимизация после правильной изоляции.

## 10. Практика

Создайте integration project и проверьте:

- все migrations на пустой БД;
- match upsert/idempotency;
- cursor tie-breaker;
- unique SteamID и watchlist;
- refresh row lock/concurrency;
- outbox атомарно с domain event;
- materialized view refresh;
- Redis job deduplication.

Официальный справочник: [Testcontainers PostgreSQL module](https://node.testcontainers.org/modules/postgresql/).

[Предыдущая глава](02-vitest-unit-tests.md) · [Оглавление](README.md) · [Следующая глава](04-contract-fixtures-api.md)

