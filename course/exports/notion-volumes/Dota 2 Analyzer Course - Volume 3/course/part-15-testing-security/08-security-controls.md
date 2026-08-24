# Глава 8. Security controls: ввод, SQL, rate limits и секреты

## 1. Безопасность — система слоёв

```text
edge/reverse proxy limits
-> HTTP DTO validation
-> authentication/authorization
-> service invariants
-> parameterized repository
-> database constraints
-> audit/alerts
```

Ни один слой не заменяет остальные. Mobile validation улучшает UX, но атакующий вызывает API напрямую.

## 2. Input validation

Каждый внешний input считается `unknown`:

- path/query/body/header;
- OpenID callback;
- provider JSON;
- queue job;
- environment variables;
- deep link/push payload;
- uploaded replay metadata.

DTO задаёт:

```text
type
required/optional
format
min/max length
numeric range
enum
unknown-field policy
body size
normalization
```

Пример:

```ts
export class ListMatchesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;
}
```

Transform query string в number включается осознанно и покрывается E2E. ID остаётся decimal string и имеет ограничение длины.

## 3. SQL injection и authorization

Только parameterized queries/query builder:

```ts
await db.execute(sql`
  SELECT id, entity_type, entity_id
  FROM watchlist_entries
  WHERE user_id = ${userId}
    AND id = ${entryId}
`);
```

Никогда:

```ts
`... WHERE id = '${entryId}'`
```

Но параметризация не решает ownership. Запрос `/me` должен фильтровать одновременно `user_id` и resource ID. Не сначала находить запись globally, а потом забывать проверку.

## 4. Database constraints

Последняя линия:

- primary/foreign keys;
- `NOT NULL`;
- `CHECK` статуса/диапазона;
- unique `(user_id, entity_type, entity_id)`;
- unique SteamID;
- transaction/outbox atomicity;
- least-privileged DB role;
- миграции отдельной ролью, runtime без `DROP`/superuser.

Service выдаёт дружелюбную domain error, но constraint защищает от concurrency и будущего ошибочного кода.

## 5. Rate limiting

Лимиты различаются по стоимости и риску:

| Endpoint | Ключ | Политика |
|---|---|---|
| public match read | IP + route | умеренный burst/cache |
| search | IP/device | строже из-за DB cost |
| auth start/exchange | IP + transaction | жёсткий anti-abuse |
| refresh | session/IP signal | без блокировки всех shared NAT |
| watchlist mutation | user | небольшой burst |
| internal ingestion | service identity | отдельный quota |

Distributed instances используют общий store/edge limiter. `X-Forwarded-For` доверяется только от настроенного proxy, иначе атакующий подделает IP.

Ответ 429 возвращает стабильный code и разумный `Retry-After`. Не раскрывайте точные антифрод-сигналы.

## 6. Secrets

Секреты:

- DB/Redis credentials;
- Steam API key;
- signing/private keys;
- Expo access credentials/API tokens;
- object storage credentials;
- Sentry/observability ingest credentials по уровню чувствительности;
- backup encryption keys.

Политика:

```text
local -> ignored .env.local / local secret tool
CI    -> environment-scoped encrypted secrets/OIDC
prod  -> managed secret manager/workload identity
code/image/log -> никогда
```

Приложение валидирует наличие секретов при boot, но не печатает значения. Rotation документирован и репетируется. Один секрет не используется во всех окружениях.

## 7. SSRF и outbound providers

Backend не запрашивает arbitrary URL из пользовательского body. Provider base URLs фиксированы конфигурацией, IDs кодируются как path/query параметры, redirect URL разрешены allowlist. Outbound network egress по возможности ограничен известными сервисами.

Replay download:

- allowlist host/protocol;
- DNS/IP revalidation согласно threat model;
- запрет private/loopback destinations;
- size/time limits;
- content type не является единственной проверкой;
- файл обрабатывается в изолированном worker без secrets.

## 8. Ошибки и логи

Внешний ответ:

```json
{
  "code": "INVALID_CURSOR",
  "message": "Request cannot be processed",
  "requestId": "01J..."
}
```

Внутренний log может иметь safe stack/constraint name, но redaction удаляет authorization, cookie, refresh/code/state, provider keys, push tokens и raw personal payload.

## 9. Security headers и CORS

Для web/docs/admin surfaces настройте CSP/secure headers, HTTPS/HSTS после правильного rollout, cookie policy если используются cookies, строгий CORS allowlist. CORS не защищает native API от прямого клиента и не заменяет auth.

## 10. Security tests

- boundary values каждого DTO;
- unknown fields;
- oversized body;
- SQL metacharacters остаются обычной строкой;
- cross-user resource access;
- replayed auth code/refresh;
- forged forwarded IP не обходит limiter;
- redirect/SSRF allowlist;
- secrets отсутствуют в error/log/image;
- runtime DB role не может DDL;
- rate-limit store outage имеет осознанный fail-open/fail-closed режим для разных endpoint.

Для auth/security-critical release нужен независимый review. Automated tests не заменяют threat modeling и аудит.

[Предыдущая глава](07-maestro-device-e2e.md) · [Оглавление](README.md) · [Следующая глава](09-backup-dependencies-security-ci.md)

