# Глава 2. Structured logs, request ID и job ID

## 1. Лог — объект, не собранная строка

Плохо:

```ts
console.log(`Failed match ${matchId}: ${error}`);
```

Лучше:

```ts
logger.error(
  {
    matchId,
    jobId,
    errorCode: error.code,
    err: safeError(error),
  },
  'match ingestion failed',
);
```

JSON fields можно фильтровать и агрегировать. Message остаётся коротким стабильным описанием.

## 2. Pino configuration

```ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: {
    service: 'dota-api',
    environment: env.environment,
    release: env.release,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'refreshToken',
      'exchangeCode',
      'steamApiKey',
      'expoPushToken',
    ],
    censor: '[REDACTED]',
  },
});
```

Список redaction покрывается тестом. Не полагайтесь только на имена: вложенные DTO/headers и неожиданные provider payload требуют boundary allowlist.

Production пишет JSON в stdout. Pretty transport включается только локально и не помещается в runtime hot path.

## 3. Levels

| Level | Использование |
|---|---|
| fatal | процесс не может продолжить boot/run |
| error | операция провалилась и требует анализа/учтена как failure |
| warn | degraded/ожидаемое отклонение с риском |
| info | lifecycle и значимые business transitions |
| debug/trace | временная деталь с sampling/local use |

404 неизвестного публичного матча не обязательно `error`; массовый рост 404 отслеживает metric. Не создавайте page alert из каждого error log.

## 4. Request ID

На ingress:

```text
если trusted edge прислал корректный ID -> принять по policy
иначе -> создать новый UUID/ULID
```

Ограничьте длину/формат. Произвольная строка клиента не должна попадать в logs без validation.

Ответ:

```http
X-Request-Id: 01J...
```

Child logger:

```ts
const requestLogger = logger.child({
  requestId,
  traceId: currentTraceId(),
  route: request.routeOptions.url,
});
```

Логируйте route template `/v1/matches/:matchId`, а не raw URL с query/token и не создавайте metric label из каждого ID.

## 5. HTTP completion log

Один итоговый log:

```json
{
  "level": "info",
  "message": "http request completed",
  "requestId": "01J...",
  "traceId": "...",
  "method": "GET",
  "route": "/v1/matches/:matchId",
  "statusCode": 200,
  "durationMs": 43,
  "responseBytes": 3280
}
```

Не логируйте body по умолчанию. Slow/error request может получить дополнительный безопасный context.

## 6. Job ID

Deterministic ID помогает идемпотентности и поиску:

```ts
export function buildIngestJobId(matchId: string, schemaVersion: number) {
  return `ingest:${matchId}:v${schemaVersion}`;
}
```

Job log fields:

```text
jobId, queue, jobName, attempt, maxAttempts,
waitMs, processingMs, outcome, errorCode,
traceId, eventId, release
```

Не добавляйте весь job payload.

## 7. Ошибка

```ts
type SafeErrorLog = {
  name: string;
  code?: string;
  message: string;
  stack?: string;
  cause?: SafeErrorLog;
};
```

Stack доступен только в защищённом log/error backend. Provider response/body, SQL parameters и tokens исключаются. Public response получает machine code + request ID, не stack.

## 8. Context propagation

HTTP context переносится middleware/OpenTelemetry context manager. Для queue producer явно кладёт trace propagation carrier и correlation IDs в metadata. Worker извлекает context, создаёт consumer span и child logger.

Не храните request-scoped context в обычной глобальной переменной: concurrent requests смешаются.

## 9. Audit log

Отдельные события:

- Steam link conflict;
- refresh reuse/revoke;
- logout all;
- account deletion;
- admin/internal command;
- secret/config change на platform level.

Audit log содержит actor/internal resource/action/outcome/time/requestId, но не raw credentials. Доступ/retention строже обычных application logs.

## 10. Проверка

Тест захватывает JSON logs и доказывает:

- Authorization/refresh/push token redacted;
- request/job/trace/release присутствуют;
- raw body отсутствует;
- error code есть;
- malformed client request ID заменён;
- logging failure не ломает endpoint.

[Предыдущая глава](01-observability-model.md) · [Оглавление](README.md) · [Следующая глава](03-metrics-cardinality.md)

