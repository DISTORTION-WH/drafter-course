# Глава 9. Config, logs, health и тесты

[← Глава 8](08-openapi-contract.md) · [Оглавление](README.md) · [Глава 10 →](10-final-backend-lab.md)

## Fail fast configuration

При старте проверьте:

- `DATABASE_URL`;
- host/port;
- environment (`development/test/staging/production`);
- CORS origins;
- query/request timeouts;
- log level.

Не читайте `process.env` по всему приложению. Configuration module строит типизированный object и сообщает все ошибки до listen.

## Structured logs

Production log — JSON event, не предложение:

```json
{
  "level": "info",
  "event": "http_request_completed",
  "requestId": "01J...",
  "method": "GET",
  "route": "/v1/matches/:id",
  "status": 200,
  "durationMs": 18
}
```

Не logируйте API keys, authorization, cookies, raw payload и полный query string без redaction.

## Liveness и readiness

- Liveness: process/event loop жив; не требует каждого внешнего dependency.
- Readiness: instance готов обслуживать traffic, DB доступна и migrations совместимы.

Пример:

```http
GET /health/live   200 {"status":"ok"}
GET /health/ready  200/503
```

Readiness query должен быть дешёвым (`SELECT 1`) с коротким timeout. Нельзя запускать тяжёлую аналитику в probe.

## Test pyramid

### Unit

- cursor encode/decode;
- mappers;
- error mapping;
- service с fake repository;
- config parser.

### Integration

- repository с настоящим PostgreSQL;
- migrations;
- constraints/transactions.

### E2E

- Nest application через `app.init()`;
- реальный HTTP adapter;
- validation/status/body/headers;
- test DB или controlled fake repository.

E2E должен закрывать critical contract, а не дублировать все permutations unit tests.

## Fastify injection

Fastify позволяет inject request без real port. Через Nest получите underlying instance после `app.init()` и вызовите `inject`, следуя актуальной official test setup. Это быстрее и стабильнее network port tests.

## Time

`generatedAt: new Date()` делает snapshots нестабильными. Внедрите Clock:

```ts
export interface Clock { now(): Date }
export const CLOCK = Symbol('CLOCK');
```

Production Clock использует `new Date()`, test — фиксированную дату.

## Graceful resource cleanup

Каждый test suite закрывает app и DB pool в `afterAll`. Иначе test process висит с open handles.

## Практика

Добавьте тесты:

- readiness при working/broken DB;
- request log содержит requestId, но не authorization;
- invalid config останавливает bootstrap;
- E2E `404` соответствует error schema;
- app close закрывает pool.

## Самопроверка

- [ ] Configuration проверяется до listen.
- [ ] Logs structured и redacted.
- [ ] Liveness не равен readiness.
- [ ] Unit tests не требуют Nest module без причины.
- [ ] Tests закрывают resources.
