# Глава 10. Итоговая лабораторная: полностью работающий MVP

## Цель

С чистого checkout воспроизвести приложение, прогнать один match end-to-end и завершить beta critical path на физическом Android/iOS устройстве.

## 1. Clean-room setup

На чистой машине/VM или после подтверждённого clean clone:

```powershell
git clone <your-repository-url>
Set-Location dota-analytics
pnpm install --frozen-lockfile
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm check
pnpm test
pnpm build
```

Затем запустите API/worker/mobile по README. Не передавайте `.env` через Git; используйте documented local setup.

## 2. Required repository

```text
apps/api
apps/worker
apps/mobile
apps/web-public
packages/contracts
packages/domain
packages/config
packages/testing
db/migrations
infra/docker
infra/aws-cdk placeholder for next part
docs/product/legal/adr/runbooks
```

## 3. Data path

Для одного разрешённого/synthetic match:

```text
discover
-> job claimed
-> provider fixture/live response
-> raw permitted archive/hash
-> runtime validation
-> canonical transaction
-> analytics refresh/update
-> API query
-> mobile render
```

Сохраните IDs/timestamps/counts каждого шага без secrets.

## 4. User acceptance

На physical device:

1. открыть match list;
2. применить date/team filter;
3. открыть details/draft;
4. перейти в team/player;
5. открыть meta и patch/tier filter;
6. выполнить search;
7. войти test identity/Steam staging policy;
8. добавить watchlist;
9. получить synthetic push и deep link;
10. выйти, повторно войти, удалить test account.

## 5. Data correctness

- match/draft fixture exact;
- meta hand calculations exact;
- denominator/freshness visible;
- correction updates affected views;
- duplicate provider delivery no duplicates;
- unknown provider value quarantined/quality;
- stale provider state shown honestly.

## 6. Quality evidence

```text
CI URL/result
test counts
coverage where meaningful
OpenAPI diff clean
image scan/SBOM
secret scan
dependency scan
device E2E
accessibility checklist
load smoke p95/response bytes
restore drill
failure game-day record
```

## 7. Product/legal evidence

- MVP/version/user/critical path;
- interview summaries;
- data rights register;
- attribution list;
- privacy data inventory;
- retention/deletion;
- independent branding review;
- provider quota/cost estimate;
- no betting claims.

## 8. Operator evidence

- dashboard screenshots/links;
- SLO/freshness;
- alerts tested;
- runbooks;
- feature flag inventory;
- on-call/support contact;
- backup restore RPO/RTO;
- previous release rollback.

## 9. Definition of Done части 21

- один repository воспроизводится clean clone;
- core domain/ingestion/API/mobile связаны;
- real/synthetic data source clearly marked;
- critical user path completed on device;
- auth/watchlist/push/deletion tested;
- stats mathematically verified;
- rights/privacy register has no hidden assumptions;
- quality/security gates green;
- beta feedback collected;
- P0/P1 closed;
- RC manifest immutable;
- advanced expensive features remain off;
- проект готов к AWS, а не уже считается production только из-за Docker.

## Следующий шаг

В части 22 вы развернёте именно этот RC в AWS. Не меняйте product scope во время cloud migration.

[Предыдущая глава](09-beta-release-candidate.md) · [Оглавление](README.md) · [Дальше: AWS production](../part-22-aws-production/README.md)
