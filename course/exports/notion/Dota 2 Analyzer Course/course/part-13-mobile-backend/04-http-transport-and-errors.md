# Глава 4. HTTP-транспорт и модель ошибок

## 1. Почему экраны не должны вызывать fetch напрямую

Если каждый экран сам создаёт URL и разбирает ошибку, быстро появятся разные правила:

- один экран забудет base URL;
- второй потеряет `requestId`;
- третий повторит запрос после 400;
- четвёртый запишет в лог чувствительный заголовок;
- пятый не отменит запрос при смене фильтра.

Поэтому создаём три слоя:

```text
screen -> query function -> domain API function -> typed HTTP client
```

## 2. Единый класс ошибки

Создайте `packages/api-client/src/api-error.ts`:

```ts
export type ApiErrorOptions = {
  status: number;
  code: string;
  message: string;
  requestId?: string;
  retryAfterSeconds?: number;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
```

`extends Error` означает наследование стандартного поведения ошибки. `readonly` запрещает случайно поменять статус после создания. `?` означает необязательное поле.

Backend должен возвращать предсказуемый envelope:

```json
{
  "code": "INVALID_CURSOR",
  "message": "Cursor is invalid",
  "requestId": "01J..."
}
```

Текст backend не обязан быть финальным пользовательским переводом. UI выбирает локализованное сообщение по `code`, а `requestId` показывает в деталях поддержки.

## 3. Domain API function

Пример адаптера списка матчей:

```ts
import type { ApiClient } from '@dota/api-client';
import { ApiError } from '@dota/api-client';

export type ListMatchesInput = {
  cursor?: string;
  limit: number;
  teamId?: string;
};

export async function listMatches(
  client: ApiClient,
  input: ListMatchesInput,
  signal?: AbortSignal,
) {
  const result = await client.GET('/v1/matches', {
    params: { query: input },
    signal,
  });

  if (result.error) {
    throw new ApiError({
      status: result.response.status,
      code: result.error.code ?? 'UNKNOWN_API_ERROR',
      message: result.error.message ?? 'API request failed',
      requestId: result.error.requestId,
    });
  }

  if (!result.data) {
    throw new ApiError({
      status: result.response.status,
      code: 'EMPTY_API_RESPONSE',
      message: 'API returned no response body',
    });
  }

  return result.data;
}
```

Точные свойства `result.error` зависят от вашей OpenAPI-схемы. Если error DTO объединён с несколькими ответами, сделайте маленькую функцию безопасного извлечения полей, а не `as any`.

`AbortSignal` приходит от TanStack Query. Когда запрос больше не нужен, клиент может остановить его и не тратить трафик.

## 4. Категории ошибок

UI должен различать хотя бы:

| Ситуация | Пример | Поведение |
|---|---|---|
| нет сети/timeout | fetch не получил HTTP-ответ | показать offline/retry |
| неверный запрос | 400 | не повторять автоматически |
| нужна сессия | 401 | обновить сессию или открыть вход |
| нет права | 403 | объяснить ограничение |
| не найдено | 404 | отдельное пустое состояние |
| конфликт | 409 | обновить данные и объяснить конфликт |
| rate limit | 429 | уважать Retry-After |
| временная ошибка | 502/503/504 | ограниченный retry с backoff |
| внутренняя ошибка | 500 | fallback и requestId |

401 будет подробно реализована в части 14. Пока публичные endpoints не требуют токена.

## 5. Retry не должен умножать проблему

Безопасная стартовая политика для query:

```ts
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (!(error instanceof ApiError)) return true;

  return error.status === 429 || error.status >= 500;
}
```

Это не универсальная истина. POST с неидемпотентным действием нельзя слепо повторять: сервер мог выполнить действие, а ответ потерялся. Для важных команд используйте idempotency key и серверную дедупликацию.

## 6. Безопасное логирование

Можно логировать:

- метод и шаблон маршрута;
- статус;
- длительность;
- безопасный код ошибки;
- request ID;
- версию приложения и окружение.

Нельзя логировать:

- `Authorization`;
- refresh token;
- одноразовый auth code;
- push token целиком;
- полный URL, если query может содержать чувствительные данные;
- необработанное тело ответа пользователя.

## 7. Упражнение

Реализуйте `ApiError` и адаптер `listMatches`. Затем тестами смоделируйте 200, 400, 429, 500 и отсутствие HTTP-ответа. Для каждого случая проверьте, что экран получает нужную категорию, а не строку «Something went wrong» без контекста.

[Предыдущая глава](03-openapi-generated-client.md) · [Оглавление](README.md) · [Следующая глава](05-query-keys-and-cache.md)

