# Глава 5. Единый контракт ошибок

[← Глава 4](04-dto-validation-serialization.md) · [Оглавление](README.md) · [Глава 6 →](06-rest-versioning-pagination.md)

## Ошибка тоже API response

Mobile не должно разбирать разные случайные формы. Зафиксируем:

```json
{
  "error": {
    "code": "MATCH_NOT_FOUND",
    "message": "Match was not found",
    "requestId": "01J...",
    "details": null
  }
}
```

`code` стабилен для программы. `message` понятен человеку, но не используется как machine switch. `requestId` связывает экран и log.

## Domain/application error

```ts
export class MatchNotFoundError extends Error {
  readonly code = 'MATCH_NOT_FOUND';

  constructor(public readonly matchId: string) {
    super(`Match ${matchId} was not found`);
    this.name = 'MatchNotFoundError';
  }
}
```

Service не импортирует `NotFoundException`; он сообщает смысл. HTTP adapter выбирает status.

## Mapping

```text
validation failed          → 400 INVALID_REQUEST
match absent               → 404 MATCH_NOT_FOUND
cursor invalid/expired     → 400 INVALID_CURSOR
rate limit нашего API      → 429 RATE_LIMITED
database unavailable       → 503 SERVICE_UNAVAILABLE
unexpected bug             → 500 INTERNAL_ERROR
```

Не выдавайте `500` stack trace клиенту. Stack остаётся в server log.

## Exception filter

```ts
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<FastifyReply>();
    const request = http.getRequest<FastifyRequest & { id: string }>();

    const mapped = mapException(exception);
    void response.status(mapped.status).send({
      error: {
        code: mapped.code,
        message: mapped.publicMessage,
        requestId: request.id,
        details: mapped.details,
      },
    });
  }
}
```

Типы Fastify должны соответствовать adapter. `mapException` — pure function, поэтому легко тестируется.

## Validation details

Details могут содержать безопасные поля:

```json
{
  "fields": [
    { "path": "limit", "rule": "max", "message": "must not exceed 100" }
  ]
}
```

Не отражайте произвольный payload целиком. Он может содержать secret/огромную строку.

## Logging once

Unexpected exception logируется на boundary один раз с requestId, route, method, status, duration. Если каждый слой пишет тот же stack, logs становятся шумом. Expected `404` обычно не требует error-level stack.

## PostgreSQL errors

Не отправляйте клиенту constraint name/SQL text напрямую. Repository переводит ожидаемые conflicts в application errors, а неизвестные остаются internal. Например duplicate favorite later → `409`, а broken query → `500`/`503` в зависимости от причины.

## Практика

Напишите table-driven tests `mapException` минимум для 7 категорий. Проверьте, что unexpected `Error('password=...')` не возвращает message клиенту.

## Самопроверка

- [ ] У error response одна форма.
- [ ] Machine code отделён от message.
- [ ] Stack и SQL не выходят клиенту.
- [ ] Domain error не зависит от HTTP.
- [ ] Один requestId присутствует в response и log.
