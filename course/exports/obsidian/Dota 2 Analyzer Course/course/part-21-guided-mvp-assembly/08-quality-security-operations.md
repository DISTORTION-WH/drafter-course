# Глава 8. Quality gate, безопасность и внутренние операции

## Цель

Подготовить продукт к чужим устройствам и реальным ошибкам. Release candidate строится не из фразы «у меня работает», а из автоматических checks, threat model и операционного control plane.

## 1. Critical path test map

```text
provider fixture -> adapter contract
-> normalization unit
-> PostgreSQL integration
-> worker/job integration
-> API E2E/OpenAPI
-> mobile component
-> device E2E
```

Для auth/watchlist/notification добавляется отдельный vertical E2E.

## 2. Required CI

```text
frozen dependencies
format/lint/typecheck
unit
integration with PostgreSQL/Redis if used
API contract generation diff
backend E2E
mobile component tests
dependency/license/security scan
secret scan
Docker build/scan
```

Flaky test не отключается молча. Он quarantined с owner/issue/expiry либо исправляется до release.

## 3. Threat model

Активы:

- Steam/API/provider keys;
- sessions/push tokens;
- user/watchlist/deletion data;
- production DB/backups;
- raw artifacts;
- AWS/store/signing accounts;
- billing entitlement;
- source/data rights evidence.

Границы:

```text
mobile untrusted
public API
provider Internet
worker/raw files
database
object storage
CI/CD
admin/support
```

Для каждой угрозы: prevention, detection, response, owner.

## 4. Required controls

- runtime validation всех external inputs;
- parameterized SQL;
- authorization by verified subject;
- rate/body/range limits;
- timeout/retry/circuit policies;
- safe error contract;
- dependency lock/scanning;
- secret manager and rotation;
- encryption in transit/at rest;
- least privilege;
- audit events;
- backup/restore;
- deletion/retention;
- SSRF/path traversal/archive-bomb controls для downloads.

## 5. Internal operations

Не нужен большой admin SPA. Начните с protected commands/pages:

```text
ingestion freshness/backlog
failed/quarantined jobs
reconciliation trigger with scope/dry-run
notification delivery status
user account deletion status
feature flags
release/version
data rights expiry reminders
```

Admin actions требуют separate role, strong auth, audit и confirmation. Нельзя сделать `/admin/retry-all` публичным «временно».

## 6. Logs/metrics/traces

Every request/job:

```text
requestId/jobId
route/job type
status/error category
duration
release/environment
safe domain IDs by reviewed policy
```

Never:

```text
tokens/passwords/API keys
full OpenID query
raw provider body
push token
database URL
signed object URL
purchase token
```

## 7. SLO for beta

Starting hypothesis:

```text
API availability
critical endpoint latency
data freshness
successful ingestion
notification delivery acceptance
crash-free sessions
account deletion completion
```

Exact targets depend on beta. Error budget controls release pace.

## 8. Backup drill local/staging

1. seed realistic synthetic data;
2. take backup/snapshot;
3. delete/corrupt controlled rows;
4. restore to a separate DB;
5. run migrations/consistency checks;
6. compare counts/checksums;
7. redirect only test instance;
8. record RPO/RTO;
9. destroy temporary restore after verification.

Backup without restore evidence is unverified.

## 9. Release flag inventory

```text
flag
owner
default
staging/prod state
failure behavior
metrics
expiry/removal issue
```

Examples:

- notifications;
- Steam login;
- provider adapter v2;
- premium block later;
- replay/ML off.

Flag does not replace authorization.

## 10. Dependency/data failure day

Simulate:

- provider 429/outage;
- PostgreSQL restart;
- Redis loss if cache/queue;
- object storage failure;
- push provider error;
- expired secret;
- invalid schema spike;
- mobile on old API-compatible version;
- rollback release.

For each: user effect, detection, operator action, recovery evidence.

## Definition of Done

- critical paths mapped across test levels;
- CI gates enforced;
- threat model reviewed;
- external inputs/SQL/auth protected;
- internal actions strongly protected/audited;
- secrets absent from logs/artifacts;
- beta SLO/dashboard exists;
- restore performed;
- flags owned/expiring;
- dependency failure day passed;
- unresolved critical/high findings block release.

[Предыдущая глава](07-auth-watchlist-notifications.md) · [Оглавление](README.md) · [Следующая глава](09-beta-release-candidate.md)

