# Глава 6. REST versioning, filters и cursor pagination

[← Глава 5](05-error-contract.md) · [Оглавление](README.md) · [Глава 7 →](07-repository-and-database.md)

## Resource-oriented пути

```http
GET /v1/matches
GET /v1/matches/{id}
GET /v1/teams/{id}
GET /v1/teams/{id}/matches
```

Используйте существительные. `/getMatches` дублирует HTTP method.

## Versioning

Major API version меняется при breaking contract: удалили поле, изменили смысл, тип или pagination. Добавление optional field часто совместимо, но mobile client должен терпеть незнакомые поля.

Не создавайте `/v2` для каждой внутренней refactor.

## List contract

```json
{
  "items": [],
  "page": {
    "nextCursor": null,
    "hasMore": false,
    "limit": 20
  },
  "meta": {
    "generatedAt": "2026-07-16T12:00:00.000Z"
  }
}
```

Empty list — `200` с `items: []`, не `404`.

## Cursor payload

Cursor может кодировать:

```ts
type MatchCursorV1 = {
  v: 1;
  startedAt: string;
  internalId: string;
};
```

Клиент должен считать cursor opaque. Backend base64url-кодирует JSON, проверяет version, shape и максимальную длину. Internal ID внутри cursor не становится публичным resource ID — это технический token.

Если cursor нельзя подделывать/менять, добавьте HMAC signature. Base64 не является шифрованием или подписью.

## Keyset query

```sql
WHERE ($1::timestamptz IS NULL)
   OR (m.start_time, m.id) < ($1::timestamptz, $2::bigint)
ORDER BY m.start_time DESC, m.id DESC
LIMIT $3 + 1;
```

Запросите `limit + 1`. Если лишняя строка есть, `hasMore=true`, лишнюю не отдавайте, а cursor строится по последней отданной.

Для optional cursor проще построить два параметризованных query variants, чем сложное условие, если planner даёт плохой plan.

## Filters

```http
GET /v1/matches?patch=7.XX&teamId=123&from=...&to=...&limit=20
```

Правила:

- `from < to`;
- range ограничен разумным максимумом;
- date-time требует offset;
- неизвестный patch может вернуть empty list;
- filters входят в cache key;
- cursor привязан к тем же filters.

Если пользователь меняет filter, старый cursor применять нельзя. Можно включить hash normalized filters в cursor и проверять его.

## Sorting

MVP предлагает фиксированный sort. Произвольное `sort` открывает много query plans и complexity. Добавляйте только whitelist:

```text
startedAtDesc
durationDesc
```

Не вставляйте user string в `ORDER BY`.

## Практика

Реализуйте encode/decode cursor как pure functions. Тесты: valid, invalid base64, invalid JSON, wrong version, missing field, слишком длинный cursor, changed filter hash.

## Самопроверка

- [ ] Empty collection возвращает `200`.
- [ ] Cursor opaque, versioned и validated.
- [ ] Sort имеет deterministic tie-breaker.
- [ ] Limit ограничен.
- [ ] Cursor нельзя переносить между filters.
