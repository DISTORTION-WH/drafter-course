# Глава 10. Итоговая лабораторная: staging и production deployment

## Цель

Развернуть безопасный production-like vertical slice:

```text
GitHub commit
-> CI
-> backend image digest
-> managed staging stores
-> migration
-> API/workers
-> preview mobile build
-> smoke/device tests
-> controlled production rollout
-> rollback drill
```

Если вы пока не готовы оплачивать production services, выполните лабораторную на staging/trial infrastructure, но сохраните разделение окружений и runbooks.

## 1. Release inventory

Создайте документ без секретов:

| Компонент | Artifact | Command | Store | Health | Rollback |
|---|---|---|---|---|---|
| API | backend digest | api main | PG/Redis | live/ready | old digest |
| worker | same digest | worker main | PG/Redis/object | queue heartbeat | old digest/flag |
| migrate | same digest | migrate | PG | exit/schema | forward fix |
| mobile | EAS build ID/runtime | native app | SecureStore | device smoke | flag/update/new binary |

## 2. Infrastructure checklist

- separate staging/production projects/accounts where practical;
- managed PostgreSQL with TLS, backups/PITR;
- managed Redis appropriate to queue/cache semantics;
- private object storage prefixes/buckets;
- workload/deployment identities;
- DNS/TLS;
- registry;
- log/metric destination;
- budgets;
- secret manager;
- restore and access runbooks.

## 3. Backend artifact

Pipeline:

1. frozen install;
2. all part-15 checks;
3. multi-stage image build;
4. scan/SBOM/provenance;
5. push commit tag;
6. capture immutable digest;
7. create release manifest;
8. no rebuild during promotion.

Проверьте non-root, graceful shutdown, read-only filesystem compatibility и отсутствие secret/source fixture leakage.

## 4. Staging deployment

1. preflight capacity/backup;
2. run migration job;
3. deploy API/worker/scheduler exact digest;
4. wait startup/readiness;
5. run public API smoke;
6. run test auth/watchlist;
7. enqueue deterministic ingestion/notification test;
8. check raw object + canonical row + queue completion;
9. run Maestro preview build;
10. verify no production credential/recipient.

## 5. Mobile release

- development/preview/production profiles separated;
- API URL matches environment;
- app identifiers allow side-by-side variants;
- native permissions/links/push credentials verified;
- build/runtime versions recorded;
- preview build passes device suite;
- store beta receives production-like binary;
- EAS Update tested only against compatible runtime;
- signing/recovery owners documented.

## 6. Production rollout

Перед gate:

- change summary;
- risk level;
- migration compatibility;
- dashboard links;
- owner/on-call availability;
- rollback digest/flag;
- provider quota/status;
- store/mobile compatibility;
- maintenance communication при необходимости.

Deploy малой долей/rolling, проверяйте health, 5xx, latency, DB/queue/data quality. Продолжайте только по явным success criteria.

## 7. Rollback drill

В staging намеренно включите безопасный defect flag. Выполните runbook, верните прошлый digest, подтвердите:

- API снова здоров;
- expanded schema совместима;
- jobs не потеряны/не задублированы;
- mobile видит safe state;
- recovery time записано;
- каждый ручной шаг можно автоматизировать или уточнить.

## 8. Production smoke

Только безопасные операции:

- health/readiness;
- public seeded/known match read;
- meta freshness timestamp;
- internal synthetic check с отдельной identity;
- queue lag/worker heartbeat;
- object storage controlled read;
- no destructive mutation реальных пользователей.

## 9. Definition of Done части 16

- process boundaries и ownership определены;
- Docker image multi-stage, non-root и reproducible;
- local Compose stack поднимается с чистого состояния;
- environments не делят DB, tokens и push recipients;
- managed store backup/restore policy известна;
- object storage private, limited и reconciled;
- migrations используют expand-contract и отдельный job;
- GitHub Actions имеет minimal permissions и required checks;
- exact image digest проходит staging перед production;
- EAS profiles/channels/runtime compatibility настроены;
- rollback backend/mobile/schema различается и репетирован;
- feature flags имеют safe default, owner и expiry;
- release manifest связывает commit, image, schema и mobile runtime;
- секреты отсутствуют в Git, image, mobile bundle и artifacts.

## Что дальше

Система уже может выпускаться, но без качественной наблюдаемости вы узнаете о проблеме от пользователя. Следующая часть курса будет посвящена structured logs, traces, метрикам, SLO, data freshness, queue depth, alerts, incident runbooks и восстановлению.

[Предыдущая глава](09-release-rollback-feature-flags.md) · [Оглавление части](README.md) · [Перейти к части 17](../part-17-observability-operations/README.md)
