# Часть 8. Backend на Node.js, NestJS и Fastify

[← Часть 7. PostgreSQL](../part-07-postgresql/README.md) · [Карта курса](../01-course-map.md) · [Часть 9. Ingestion →](../part-09-data-ingestion/README.md)

## Что мы строим

Долгоживущий backend читает PostgreSQL и выдаёт мобильному приложению собственный versioned REST API:

```http
GET /v1/matches
GET /v1/matches/:id
GET /v1/teams/:id
GET /health
GET /docs
```

OpenDota не вызывается внутри пользовательского request. Телефон получает быстрый, стабильный контракт нашей системы.

## Главы

1. [Серверный процесс и lifecycle запроса](01-server-and-request-lifecycle.md)
2. [Создание NestJS-приложения с Fastify](02-nestjs-fastify-bootstrap.md)
3. [Module, controller, service и dependency injection](03-modules-controllers-services-di.md)
4. [DTO, validation и serialization](04-dto-validation-serialization.md)
5. [Единый контракт ошибок](05-error-contract.md)
6. [REST versioning, filters и cursor pagination](06-rest-versioning-pagination.md)
7. [Repository и PostgreSQL](07-repository-and-database.md)
8. [OpenAPI и проверяемый контракт](08-openapi-contract.md)
9. [Config, logs, health и тесты](09-operations-and-testing.md)
10. [Итоговая лабораторная: API матчей](10-final-backend-lab.md)

## Архитектурная граница

```text
HTTP/Fastify
→ controller: разобрать transport input
→ service: выполнить use case
→ repository: прочитать PostgreSQL
→ mapper: собрать public DTO
```

Controller не выполняет SQL. Repository не знает HTTP. Public DTO не является Drizzle row.

## Официальные справочники

- [NestJS documentation](https://docs.nestjs.com/)
- [NestJS Fastify adapter](https://docs.nestjs.com/techniques/performance)
- [NestJS validation](https://docs.nestjs.com/techniques/validation)
- [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction)

CLI и пакеты устанавливаются по актуальной stable documentation и фиксируются lockfile. Курс не требует глобальной установки CLI.
