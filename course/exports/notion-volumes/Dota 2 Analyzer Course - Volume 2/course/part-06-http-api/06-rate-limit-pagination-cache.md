# Глава 6. Rate limit, pagination и cache

[← Глава 5](05-timeout-errors-retry.md) · [Оглавление](README.md) · [Глава 7 →](07-api-key-and-secrets.md)

## Три разных механизма

- Rate limit ограничивает частоту запросов.
- Pagination делит большую коллекцию на страницы.
- Cache не запрашивает повторно то, что ещё достаточно свежее.

Они взаимодействуют, но не заменяют друг друга.

## Не зашивайте квоту в код

Тариф и лимиты провайдера могут меняться. Настройки должны приходить из configuration:

```ts
export type ProviderPolicy = {
  minimumIntervalMs: number;
  maxConcurrentRequests: number;
  cacheTtlMs: number;
};
```

Значения выбираются по актуальной документации и вашему тарифу. Бесплатная квота не является разрешением на бесконечный исторический crawl.

## Простейший последовательный limiter

```ts
export class IntervalLimiter {
  private nextAllowedAt = 0;

  constructor(private readonly minimumIntervalMs: number) {}

  async wait(): Promise<void> {
    const now = Date.now();
    const delayMs = Math.max(0, this.nextAllowedAt - now);

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    this.nextAllowedAt = Date.now() + this.minimumIntervalMs;
  }
}
```

Этот limiter годится для одного процесса и последовательных вызовов. Несколько backend replicas не разделяют память — в части 9 координацию перенесём в очередь/Redis или общий scheduler.

## Pagination через cursor

Offset (`page=5`) прост, но при вставке новых матчей страницы могут сдвигаться. Cursor основан на устойчивом поле:

```ts
type MatchPage = {
  items: readonly ProviderMatchSummary[];
  nextCursor?: string;
};
```

Алгоритм:

```text
cursor = отсутствует
повторять:
  запросить страницу(cursor)
  сохранить items идемпотентно
  cursor = nextCursor
пока cursor существует и лимит работы не исчерпан
```

Cursor — opaque: клиент не обязан понимать его внутренний формат. Если OpenDota endpoint использует `less_than_match_id`, adapter преобразует наш cursor в этот параметр.

## Условия остановки

Цикл обязан иметь границы:

- достигнут известный последний ID;
- страница пуста;
- нет следующего cursor;
- достигнут `maxPages`;
- закончился time/request budget;
- процесс получил сигнал остановки.

Без этого ошибка provider может вызвать бесконечный цикл.

## Cache и freshness

Матч после завершения почти неизменяем, но данные parsing могут дополниться. Список последних матчей меняется часто. Значит TTL различается:

```ts
type CacheEntry<T> = {
  value: T;
  storedAtMs: number;
  expiresAtMs: number;
};
```

Cache key должен включать все влияющие параметры:

```text
provider:opendota:match:8000000000
provider:opendota:proMatches:before:8000000000
```

Не храните `undefined` как «ресурс отсутствует» без отдельного TTL: иначе временный `404` может стать вечным.

## Conditional requests

Если provider отдаёт `ETag`, можно отправить `If-None-Match`. Ответ `304 Not Modified` не содержит нового body. Это экономит трафик, но запрос всё ещё может учитываться в квоте — проверяйте правила провайдера.

## Cache stampede

После истечения TTL сто запросов могут одновременно обновить один key. Базовые решения:

- single-flight: один Promise на key внутри процесса;
- distributed lock с коротким TTL;
- stale-while-revalidate;
- предварительное фоновое обновление.

В MVP начнём с фонового ingestion: mobile читает нашу БД, а не вызывает OpenDota.

## Практика

Напишите `fetchPages`, принимающую:

```ts
type FetchPage<T> = (cursor?: string) => Promise<{
  items: readonly T[];
  nextCursor?: string;
}>;
```

Функция должна возвращать объединённый массив, но останавливаться после `maxPages`. Проверьте повторяющийся cursor — это ошибка контракта, а не повод к бесконечному циклу.

## Самопроверка

- [ ] Лимит — configuration, не магическое число по всему коду.
- [ ] Pagination имеет явное условие остановки.
- [ ] Cache key учитывает параметры.
- [ ] Mobile не обращается к provider напрямую.
