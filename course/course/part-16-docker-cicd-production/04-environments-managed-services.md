# Глава 4. Development, staging, production и managed services

## 1. Окружение — не одна переменная

Полное окружение включает:

- compute/API/workers;
- PostgreSQL;
- Redis/queue;
- object storage;
- secrets/keys;
- DNS/TLS;
- auth/push redirect credentials;
- observability;
- backups;
- quotas/alerts;
- mobile API URL/channel.

`APP_ENV=production` не делает development ресурсы production-ready.

## 2. Матрица

| Свойство | Development | Staging | Production |
|---|---|---|---|
| данные | synthetic/local | synthetic/sanitized | реальные |
| domain | LAN/localhost | отдельный HTTPS | production HTTPS |
| Steam redirect | dev allowlist | staging | production |
| push | dev/staging project | staging credentials | production credentials |
| DB | local container | managed small | managed HA по требованиям |
| backup | disposable/manual | автоматический тест | PITR + restore drill |
| доступ | developer local | team/reviewers | least privilege |

Staging не содержит копию production user sessions/push tokens. Если нужны похожие данные, используйте synthetic generator или юридически/технически утверждённую sanitization pipeline.

## 3. Managed PostgreSQL

Для небольшой команды managed database обычно снижает операционный риск:

- automated backups/PITR;
- monitoring;
- patching options;
- TLS;
- replicas/HA по тарифу;
- controlled upgrades;
- maintenance windows.

Но ответственность остаётся:

- schema/migrations;
- indexes/queries;
- connection pool;
- backup retention/restore test;
- roles/permissions;
- cost/capacity;
- region/data policy.

Подключение использует TLS и runtime role без superuser/DDL. Migration role выдаётся только deployment job.

## 4. Managed Redis

Уточните роль Redis:

```text
cache -> потеря допустима, rebuild
rate limit -> outage policy важна
BullMQ queue -> persistence/failover semantics критичны
distributed lock -> TTL/correctness критичны
```

Один дешёвый ephemeral Redis без persistence может быть приемлем для cache, но не обязательно для незаменяемой очереди. Domain outbox в PostgreSQL позволяет восстановить отправку jobs.

## 5. Regions и latency

API, PostgreSQL и Redis размещаются близко друг к другу. Mobile пользователи глобальны, но DB round trips между regions дороже сложнее. Для MVP:

- один основной region;
- CDN для публичных static assets;
- API caching;
- честная latency measurement;
- multi-region только при доказанной необходимости.

Не размещайте API в одном регионе, DB в другом случайно.

## 6. Configuration schema

```ts
type AppConfig = {
  environment: 'development' | 'staging' | 'production';
  port: number;
  databaseUrl: string;
  redisUrl: string;
  publicApiOrigin: string;
  allowedMobileRedirects: string[];
  objectStorageBucket: string;
};
```

При boot runtime parser проверяет URL, ranges, required fields и forbidden combinations:

- production origin только HTTPS;
- production redirect не custom dev scheme, если policy требует universal link;
- production не использует staging bucket/project;
- migrations не запускаются с runtime role;
- local provider key не требуется для fixture mode.

Error перечисляет отсутствующие имена, но не значения.

## 7. Secrets и identity

Предпочитайте workload identity/OIDC и короткоживущие credentials там, где platform поддерживает, вместо вечных access keys в GitHub secrets. Разделите roles:

```text
api runtime       -> read/write app tables, read allowed objects
worker runtime    -> jobs/data, provider secrets по необходимости
migration job     -> schema DDL на короткое время
backup job        -> backup destination
CI build          -> push image, не production DB
CD deploy         -> deploy target, approval protected
```

## 8. Cost guardrails

- budgets/alerts;
- max replicas/concurrency;
- storage lifecycle;
- log retention;
- object size limits;
- provider quota;
- staging schedule/scale down;
- egress awareness;
- DB slow query/index review.

Автоматический budget alert не останавливает production сам без заранее принятой политики.

## 9. Environment promotion

```text
commit -> image digest
-> deploy staging exact digest
-> migrations/smoke/load subset
-> approve
-> production deploy same digest
```

Configuration отличается, artifact нет. Если staging build и production build имеют разные source bytes, staging не проверил production artifact.

## 10. Упражнение

Заполните environment inventory: owner, region, endpoint, data class, secret source, backup, RPO/RTO, monthly budget, deletion procedure. Значения секретов в inventory не пишутся.

[Предыдущая глава](03-compose-local-stack.md) · [Оглавление](README.md) · [Следующая глава](05-object-storage-data-protection.md)

