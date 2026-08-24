# Глава 1. Серверный процесс и lifecycle запроса

[← Оглавление](README.md) · [Глава 2 →](02-nestjs-fastify-bootstrap.md)

## CLI и server отличаются временем жизни

CLI части 6 выполнил задачу и завершился. Backend:

1. читает configuration;
2. создаёт connection pool;
3. открывает TCP port;
4. принимает много запросов;
5. при остановке перестаёт принимать новые;
6. завершает текущие;
7. закрывает pool и process.

Поэтому утечка connection или необработанный exception опаснее: процесс обслуживает других пользователей.

## Что происходит с `GET /v1/matches/42`

```text
DNS/TCP/TLS (в production proxy)
→ Fastify принимает request
→ Nest route matching
→ middleware
→ guards
→ interceptors before
→ pipes/validation
→ controller
→ service
→ repository/PostgreSQL
→ controller result
→ serialization
→ interceptors after
→ response
→ exception filter при ошибке
```

Не все слои нужны в каждом endpoint, но порядок помогает находить ошибку.

## Request-scoped и singleton

Nest providers по умолчанию singleton: один instance на application. Stateless service/repository обычно таким и должен быть. Нельзя сохранять `currentUser` или request parameters в полях singleton — запросы перепутаются.

```ts
// Плохо для singleton
private currentMatchId: string | undefined;
```

Передавайте request data параметрами функции.

## Concurrency

Node исполняет JavaScript в одном event loop на process, но много I/O операций ожидают одновременно. Если controller выполняет тяжёлый синхронный расчёт, он блокирует остальные requests. SQL aggregation выполняет PostgreSQL; replay parsing уйдёт отдельному worker/service.

## Connection pool

Pool не равен «одно соединение на request навсегда». Repository берёт connection/выполняет query/возвращает ресурс. Размер pool ограничен. При 10 replicas по 20 connections база видит до 200; планируйте общий budget.

## Stateless API

API replica должна быть заменяемой. Shared state хранится в PostgreSQL/Redis/object storage, а не только в памяти процесса. In-memory cache допустим как ускорение, но не источник истины.

## Graceful shutdown

При `SIGTERM` production orchestrator даёт время завершиться. Nest:

```ts
app.enableShutdownHooks();
```

Database provider реализует lifecycle hook для закрытия pool. Server сначала перестаёт принимать новые requests, затем освобождает ресурсы.

## Request ID

Каждый request получает correlation ID. Он проходит через logs и response header. Нельзя использовать его как authentication или доверять непроверенному длинному входному header; валидируйте/генерируйте новый.

## Практика

Нарисуйте lifecycle:

1. корректный список;
2. invalid cursor;
3. match не найден;
4. database timeout;
5. shutdown во время request.

Для каждого укажите слой, где возникает решение, HTTP status и log fields.

## Самопроверка

- [ ] Server живёт дольше одного use case.
- [ ] Singleton provider не хранит request state.
- [ ] Pool имеет общий connection budget.
- [ ] Тяжёлый CPU не выполняется в HTTP handler.
- [ ] Ресурсы закрываются при shutdown.
