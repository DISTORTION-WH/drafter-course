# Глава 10. Итоговая лабораторная: API матчей

[← Глава 9](09-operations-and-testing.md) · [Оглавление](README.md) · [Часть 9 →](../part-09-data-ingestion/README.md)

## Цель

Создать NestJS/Fastify API, которое читает только PostgreSQL и выдаёт стабильные `/v1` responses.

## Структура

```text
apps/api/src/
├─ main.ts
├─ app.module.ts
├─ config/
├─ common/
│  ├─ errors/
│  ├─ http/
│  └─ observability/
├─ database/
├─ health/
├─ matches/
└─ teams/
```

## Endpoint 1: список

```http
GET /v1/matches?patch=7.XX&limit=20&cursor=...
```

Response:

```json
{
  "items": [
    {
      "id": "8000000000",
      "startedAt": "2026-07-16T12:00:00.000Z",
      "durationSeconds": 2345,
      "patch": "7.XX",
      "winner": "radiant",
      "radiantTeam": null,
      "direTeam": null
    }
  ],
  "page": { "nextCursor": null, "hasMore": false, "limit": 20 },
  "meta": { "generatedAt": "2026-07-16T12:05:00.000Z" }
}
```

## Endpoint 2: деталь матча

`GET /v1/matches/:id` добавляет participants и draft, упорядоченные slot/sequence. Unknown player — `null`. Match отсутствует — единый `404`.

## Endpoint 3: команда

`GET /v1/teams/:id` возвращает public team fields. Текущий roster не подставляется в старый match detail; исторический факт берётся из match rows/snapshots.

## Реализация по вертикалям

Не пишите сначала все controllers, затем все repositories. Делайте:

```text
GET one match: DTO → controller → service → repository → E2E
→ list/pagination vertical slice
→ team vertical slice
→ OpenAPI/operations hardening
```

После каждого slice приложение работает.

## Обязательные проверки

| Сценарий | Status |
|---|---:|
| корректный list | 200 |
| пустой list | 200 |
| invalid limit/cursor | 400 |
| match найден | 200 |
| match не найден | 404 |
| DB временно недоступна | 503 |
| неизвестная ошибка | 500 без stack |
| readiness при DB down | 503 |

Проверьте content type, request ID, JSON schema и отсутствие internal fields.

## OpenAPI acceptance

- все operations имеют summary/operationId;
- params constraints совпадают с runtime validation;
- ID — string pattern digits;
- timestamps — date-time;
- nullable поля отмечены;
- error schema едина;
- exported spec проходит lint/diff policy.

## Performance baseline

На локальном seed dataset измерьте p50/p95 хотя бы простым controlled test. Цель не «рекорд», а baseline и отсутствие N+1. Запишите количество SQL queries на list и detail.

## Commit plan

```text
chore(api): bootstrap NestJS with Fastify
feat(matches): expose match detail endpoint
feat(matches): add cursor-paginated list
feat(teams): expose team detail
feat(api): add unified errors and OpenAPI
test(api): cover public v1 contract
```

## Definition of done

- [ ] API запускается с Fastify и strict TypeScript.
- [ ] Controllers не содержат SQL/provider calls.
- [ ] Services тестируются fake repositories.
- [ ] Repositories используют parameters и stable sort.
- [ ] IDs — strings, time — ISO UTC.
- [ ] Cursor validated/versioned.
- [ ] Ошибки имеют единую форму/requestId.
- [ ] OpenAPI экспортируется повторяемо.
- [ ] Liveness/readiness различаются.
- [ ] Unit, integration и E2E critical tests проходят.
- [ ] Shutdown закрывает DB pool.

## Результат

У мобильного приложения уже есть API для чтения. Но данные пока импортируются вручную. В части 9 создадим отдельный worker, который будет безопасно собирать, архивировать, нормализовать и обновлять матчи автоматически.
