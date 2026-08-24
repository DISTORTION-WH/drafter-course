# Модуль 15. Тесты, безопасность и наблюдаемость

## Результат

До AWS проект получит автоматическую проверку критических сценариев, ограничение запросов, безопасные HTTP headers, redaction секретов, error monitoring и измеримые health signals. Это не отдельная «учебная инфраструктура»: те же проверки блокируют плохой production deploy.

## 1. Какие тесты нужны именно этому приложению

Не стремитесь к абстрактным 100% coverage. Защитите места, где ошибка искажает данные, ломает деньги или доступ:

```text
unit
  provider mapping, rate math, token helpers
integration
  Prisma repositories, idempotent import, webhook deduplication
API e2e
  auth, permissions, public contracts, watchlist
mobile component
  loading/error/empty/success, paywall, navigation data
release smoke
  production health, one match, one meta query, login callback
```

Каждый найденный production bug сначала превращается в failing regression test, затем исправляется.

## 2. Отдельная test database

В `docker-compose.yml` добавьте database `dota_analyzer_test` через init script либо отдельный Postgres service `postgres-test` на другом порту. Никогда не запускайте test cleanup против development/production URL.

В test setup:

```ts
const testDatabaseUrlSchema = z
  .string()
  .url()
  .refine((url) => url.includes('dota_analyzer_test'), {
    message: 'Tests require the dedicated test database',
  });

export const TEST_DATABASE_URL = testDatabaseUrlSchema.parse(
  process.env.TEST_DATABASE_URL,
);
```

`refine` — дополнительное бизнес-правило поверх корректного URL. Если переменная случайно указывает на production, suite останавливается до `deleteMany`.

Перед API integration suite применяйте migrations:

```powershell
$env:DATABASE_URL=$env:TEST_DATABASE_URL
pnpm --filter @dota/database exec prisma migrate deploy
```

`migrate deploy`, а не `migrate dev`, проверяет тот же способ применения готовых migrations, который будет в AWS.

## 3. Integration test идемпотентного импорта

Создайте реальный test:

```ts
it('повторный импорт обновляет матч, а не создаёт дубль', async () => {
  await saveImportedMatch(prisma, fixtureMatch);
  await saveImportedMatch(prisma, {
    ...fixtureMatch,
    radiantScore: 25,
    direScore: 18,
  });

  const matches = await prisma.match.findMany({
    where: {
      provider: fixtureMatch.provider,
      providerMatchId: fixtureMatch.providerMatchId,
    },
  });

  expect(matches).toHaveLength(1);
  expect(matches[0].radiantScore).toBe(25);
});
```

- `fixtureMatch` хранится в `packages/ingestion/test/fixtures` и повторяет валидную provider shape.
- Spread `...fixtureMatch` копирует объект, после него score перезаписывается.
- Тест одновременно защищает unique constraint и правильный update branch upsert.

## 4. API e2e через реальное Nest application

Установите `supertest`. Создайте `apps/api/test/matches.e2e.test.ts`:

```ts
describe('GET /v1/matches', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('возвращает только public contract', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/matches?limit=1')
      .expect(200);

    const matches = MatchListSchema.parse(response.body);
    expect(matches).toHaveLength(1);
    expect(response.body[0]).not.toHaveProperty('providerMatchId');
  });
});
```

`app` — реальный Nest application без network port. `response.body` проходит ту же schema, что mobile. Последняя проверка не даёт случайно раскрыть внутренние provider fields.

Критический auth e2e test должен доказать:

- без bearer token watchlist отвечает 401;
- user A не может удалить данные user B;
- повторный login ticket отвечает 401;
- revoked refresh token отвечает 401;
- malformed match ID не приводит к 500.

## 5. Mobile component test

Установите React Native Testing Library. `MatchCard` тестируйте как поведение:

```tsx
it('открывает выбранный матч', () => {
  const onPress = vi.fn();
  const screen = render(<MatchCard match={matchFixture} onPress={onPress} />);

  fireEvent.press(screen.getByText(matchFixture.radiant.name));

  expect(onPress).toHaveBeenCalledOnce();
});
```

Не проверяйте private state или точный порядок style properties. Пользователь видит текст и нажимает card — это и защищает test.

## 6. HTTP security в реальном `main.ts`

Установите `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`. После создания app, до listen:

Расширьте существующую `envSchema`, а не создавайте второй config object:

```ts
CORS_ORIGINS: z
  .string()
  .transform((value) => value.split(',').map((origin) => origin.trim())),
SENTRY_DSN: z.string().url().optional(),
```

В `.env.example` добавьте `CORS_ORIGINS=http://localhost:8081` и пустой необязательный Sentry DSN не указывайте до настройки проекта.

```ts
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

await app.register(helmet);
await app.register(cors, {
  origin: env.CORS_ORIGINS,
  credentials: true,
});
await app.register(rateLimit, {
  max: 120,
  timeWindow: '1 minute',
});
```

`CORS_ORIGINS` валидируйте как массив конкретных HTTPS origins. Не используйте `*` с credentials. Для `/auth/steam/start`, `/auth/exchange` и webhook установите более строгие route limits.

Также:

- максимальный body 1 MB для обычного API;
- structured JSON logging;
- request ID из входного безопасного header или generated UUID;
- в logs redaction полей `authorization`, `cookie`, `refreshToken`, `code`, `expoToken`, `DATABASE_URL`;
- одинаковое внешнее сообщение login failure без уточнения, найден ли user/token;
- raw webhook body сохраняется только в памяти до HMAC-проверки и не логируется.

## 7. Sentry и operational events

Установите `@sentry/nestjs` в API/worker и `@sentry/react-native` в mobile. DSN не является password, но environment и release задавайте явно.

В API initialize до импорта app module:

```ts
Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  release: env.APP_VERSION,
  tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1,
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    return event;
  },
});
```

- `event` — готовящееся к отправке событие.
- `beforeSend` — последняя защита от отправки auth headers.
- `tracesSampleRate` 0.1 означает примерно 10% performance traces, но все captured errors остаются.

Worker логирует события с полями `jobName`, `jobId`, `attemptsMade`, `provider`, `durationMs`, но не body пользователя. Измеряйте:

- возраст последнего успешно импортированного матча;
- failed jobs;
- API p95 latency и 5xx rate;
- active DB connections;
- notification failures;
- webhook processing lag.

## 8. CI, который блокирует плохой merge

Создайте `.github/workflows/ci.yml` с PostgreSQL и Redis services. Jobs выполняют:

```powershell
pnpm install --frozen-lockfile
pnpm build:packages
pnpm -r typecheck
pnpm -r test
pnpm --filter @dota/api build
pnpm --filter @dota/worker build
pnpm --filter @dota/mobile exec expo export --platform all
```

В CI используйте Node 24 и pnpm version из `packageManager`. Secret scan и dependency audit запускайте по расписанию/PR, но не применяйте автоматическое major upgrade.

## 9. Ваша аналогичная задача: regression test команды

Для `GET /v1/teams/:id/details` напишите e2e test:

1. Создайте team и два связанных match fixture в test DB.
2. Выполните GET реального endpoint.
3. Проверьте response через `TeamDetailsSchema.parse`.
4. Ожидайте ровно два recent matches.
5. Убедитесь, что provider ID отсутствует в JSON.
6. Второй test вызывает неизвестный ID и ожидает 404.

Точные переменные: `team`, `response`, `details`. Cleanup делает общая database fixture factory, а не каждый test вручную.

Этот test войдёт в CI и защитит задание модулей 8/11 перед AWS deploy.

## 10. Проверка и commit

```powershell
pnpm -r typecheck
pnpm -r test
pnpm --filter @dota/api build
pnpm --filter @dota/worker build
git add .github apps packages docker-compose.yml
git commit -m "test(security): enforce critical quality and security gates"
```

Готово, только если suite проходит из чистого clone, неправильная test DB останавливает tests, secrets отсутствуют в sample logs, а Sentry test event виден в нужном environment.

[Следующий модуль](17_MODULE_16_AWS_PRODUCTION.md)
