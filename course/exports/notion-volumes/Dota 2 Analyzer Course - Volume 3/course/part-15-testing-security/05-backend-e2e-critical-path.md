# Глава 5. Backend E2E и критический путь

## 1. Что запускает backend E2E

```text
real HTTP request
-> Fastify adapter
-> Nest guards/pipes/controller
-> service/repository
-> real test PostgreSQL/Redis
-> serialized HTTP response
```

Внешние providers остаются fake adapters с fixtures. Иначе тест становится медленным, квотируемым и недетерминированным.

## 2. Test app factory

```ts
export async function createE2eApp(overrides: E2eOverrides) {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(STEAM_OPEN_ID_ADAPTER)
    .useValue(overrides.steamOpenId)
    .overrideProvider(EXPO_PUSH_ADAPTER)
    .useValue(overrides.push)
    .compile();

  const app = moduleRef.createNestApplication(
    new FastifyAdapter(),
  );

  configureApplication(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
```

Production и tests вызывают одну `configureApplication`: validation pipe, exception filter, prefix и serialization не должны расходиться.

Точные типы Nest/Fastify зависят от версии проекта. Используйте official testing API зафиксированной версии.

## 3. HTTP request

Fastify instance поддерживает injection без реального TCP-порта:

```ts
const response = await app.inject({
  method: 'GET',
  url: '/v1/matches?limit=2',
});

expect(response.statusCode).toBe(200);
expect(response.headers['content-type']).toContain('application/json');

const body = response.json();
expect(body.items).toHaveLength(2);
expect(typeof body.items[0].id).toBe('string');
```

Иногда настоящий socket нужен для специфического middleware; большинство HTTP E2E быстрее и стабильнее через inject.

## 4. Сценарий списка и деталей

Given:

- migrations применены;
- seed из 45 матчей;
- два имеют одинаковый `startedAt`;
- IDs выше безопасного диапазона JavaScript number;
- команды/турнир связаны.

Then:

- первая и вторая страницы не пересекаются;
- объединённые IDs идут в стабильном порядке;
- фильтр команды не возвращает чужие матчи;
- detail совпадает с summary по ID;
- invalid cursor даёт документированный 400 code;
- unknown match — 404 envelope с request ID.

## 5. Auth E2E без настоящего Steam

Fake Steam adapter принимает только заранее заданный подписанный fixture result. Проверяется наш flow:

```text
start -> transaction/state
callback -> adapter verified SteamID
-> one-time code
exchange -> tokens/session row
refresh -> rotation
old refresh -> reuse/revoke family
```

Не тестируйте пароль или UI Steam. Provider protocol проверяется отдельным adapter contract/integration canary.

## 6. Ownership test

```ts
it('user B не удаляет watchlist entry user A', async () => {
  const userA = await createAuthenticatedUser();
  const userB = await createAuthenticatedUser();
  const entry = await addTeam(userA, '2163');

  const response = await app.inject({
    method: 'DELETE',
    url: `/v1/me/watchlist/${entry.id}`,
    headers: authorization(userB.accessToken),
  });

  expect([403, 404]).toContain(response.statusCode);
  expect(await watchlistRepository.findOwned(userA.id, entry.id))
    .not.toBeNull();
});
```

Выберите один статус в контракте; массив здесь подчёркивает возможные политики, но production test должен ожидать точное решение.

## 7. Outbox E2E

В одной DB transaction изменение матча и outbox row либо существуют вместе, либо отсутствуют вместе. Тест намеренно вызывает failure между операциями и проверяет rollback.

Worker test затем:

- получает outbox/job;
- повторно обрабатывает один event;
- создаёт одну delivery;
- сохраняет ticket;
- обрабатывает receipt;
- отключает DeviceNotRegistered token.

## 8. Ошибки и request ID

Для 400, 401, 403/404, 409, 429 и 500 проверяйте:

- точный HTTP status;
- стабильный machine `code`;
- безопасный message;
- `requestId`;
- отсутствие stack trace/SQL/token;
- соответствие OpenAPI error schema.

## 9. Parallel tests

Каждый worker получает отдельную database/schema и уникальные job prefixes. Фиксированный порт не нужен — Testcontainers сообщает mapped port. Не используйте production-like cron во время suite: background schedulers отключены или управляются test harness.

## 10. Практика

Создайте E2E suites:

```text
matches.e2e.test.ts
meta.e2e.test.ts
auth.e2e.test.ts
watchlist.e2e.test.ts
notifications.e2e.test.ts
errors.e2e.test.ts
```

Один test не должен зависеть от предыдущего. В CI suite проходит на пустой disposable infrastructure.

[Предыдущая глава](04-contract-fixtures-api.md) · [Оглавление](README.md) · [Следующая глава](06-mobile-rntl.md)
