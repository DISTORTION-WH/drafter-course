# Глава 5. Timeout, классификация ошибок и retry

[← Глава 4](04-node-fetch.md) · [Оглавление](README.md) · [Глава 6 →](06-rate-limit-pagination-cache.md)

## Почему запрос обязан иметь deadline

Без ограничения один зависший запрос удерживает worker неопределённо долго. Timeout — часть контракта надёжности, а не ускоритель.

```ts
const response = await fetch(url, {
  signal: AbortSignal.timeout(10_000),
});
```

`10_000` — миллисекунды. Нижнее подчёркивание улучшает чтение числа и не меняет значение.

## Типизированные ошибки

```ts
export class HttpStatusError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfterMs: number | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'HttpStatusError';
  }
}
```

Поля `readonly`: после создания ошибки status не должен случайно измениться. Класс полезен, потому что решение retry требует структурированных данных, а не поиска подстроки в message.

## Что можно повторять

Обычно допустимые кандидаты:

- отсутствие соединения и некоторые временные сетевые сбои;
- timeout;
- `408`, `429`, `502`, `503`, `504`;
- иногда `500`, если операция безопасна и провайдер допускает повтор.

Обычно нельзя автоматически повторять `400`, `401`, `403`, `404`, validation error. Код не исправится ожиданием.

Retry допустим только для операции, повтор которой безопасен. Для команды создания платежа правила были бы строже; для `GET` матча — проще.

## Exponential backoff с jitter

Если тысяча workers повторит запрос ровно через секунду, они снова создадут пик. Добавим случайное смещение:

```ts
function calculateDelayMs(attempt: number, baseMs = 500, capMs = 10_000): number {
  const exponential = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.floor(Math.random() * exponential);
}
```

Для попыток `0, 1, 2` верхняя граница — примерно `500, 1000, 2000` мс. Случайная задержка называется full jitter.

```ts
function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
```

## Ограниченный retry loop

```ts
type RetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
};

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  shouldRetry: (error: unknown) => boolean,
  options: RetryOptions,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < options.maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error: unknown) {
      lastError = error;
      const isLastAttempt = attempt === options.maxAttempts - 1;

      if (isLastAttempt || !shouldRetry(error)) {
        throw error;
      }

      await sleep(calculateDelayMs(attempt, options.baseDelayMs));
    }
  }

  throw lastError;
}
```

Generic `<T>` означает: wrapper возвращает тот же тип, что успешная operation. `lastError` нужен для полноты, хотя цикл при корректном `maxAttempts > 0` вернёт или выбросит раньше. Добавьте проверку options.

## Учитывайте `Retry-After`

Header может содержать число секунд или HTTP date. Начните с секунд:

```ts
function parseRetryAfterMs(value: string | null): number | undefined {
  if (value === null) return undefined;

  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return undefined;

  return seconds * 1000;
}
```

Если сервер дал корректное значение, не повторяйте раньше него. В production добавьте поддержку HTTP date и общий верхний предел.

## Бюджет времени

Три попытки по 10 секунд плюс backoff могут занять более 30 секунд. Поэтому нужны:

- timeout одной попытки;
- max attempts;
- иногда общий deadline всей операции;
- отмена при остановке worker.

## Практика

С fake fetch проверьте:

1. `503`, затем `200` — два вызова;
2. `400` — один вызов;
3. постоянный timeout — ровно `maxAttempts`;
4. `maxAttempts: 0` — configuration error;
5. `429` использует `retry-after`.

В тестах внедрите `sleepFn`, которая ничего не ждёт. Иначе тесты будут медленными и нестабильными.

## Самопроверка

- [ ] Timeout ограничивает одну попытку.
- [ ] Retry ограничен числом попыток.
- [ ] Решение принимается по типу/status, а не тексту message.
- [ ] Backoff содержит jitter.
- [ ] `4xx` не повторяются без разбора.
