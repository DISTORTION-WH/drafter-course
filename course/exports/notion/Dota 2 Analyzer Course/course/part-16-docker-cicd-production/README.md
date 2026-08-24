# Часть 16. Docker, CI/CD и production

Код и тесты сами по себе ещё не являются работающим сервисом. Production требует воспроизводимой сборки, изолированных окружений, управляемых хранилищ, безопасных миграций, автоматических проверок, контролируемого выпуска mobile и реального rollback.

## Что мы построим

```text
git commit
  -> CI checks
  -> immutable backend/worker image
  -> registry digest + provenance
  -> deploy staging
  -> migrations (отдельный job)
  -> smoke tests
  -> approval
  -> deploy production canary/rolling
  -> health verification

mobile commit
  -> typecheck/tests
  -> EAS preview build
  -> device tests
  -> staging/store beta
  -> production build or compatible EAS Update
```

## Главы

1. [Images, containers и production process](01-containers-images.md)
2. [Multi-stage Dockerfile для Node.js monorepo](02-api-dockerfile.md)
3. [Локальный Docker Compose stack](03-compose-local-stack.md)
4. [Development, staging, production и managed services](04-environments-managed-services.md)
5. [Object storage и защита данных](05-object-storage-data-protection.md)
6. [Миграции при deployment](06-migrations-deployment.md)
7. [GitHub Actions CI](07-github-actions-ci.md)
8. [CD backend и EAS mobile releases](08-cd-eas-builds.md)
9. [Rollout, rollback и feature flags](09-release-rollback-feature-flags.md)
10. [Итоговая лабораторная staging/production](10-final-staging-production-lab.md)

## Принципы

- Один проверенный image продвигается между окружениями; production не пересобирается из другого кода.
- Configuration поступает при запуске, secrets не запекаются в image.
- Базы production не живут в Docker Compose на ноутбуке.
- API, ingestion worker, scheduler и migration job — отдельные процессы одного release.
- Миграции совместимы с одновременно работающей старой и новой версией.
- Deployment считается успешным только после smoke/health/data checks.
- Rollback репетируется до инцидента.
- EAS Update меняет только совместимый update layer; native change требует нового binary.
- Feature flag не заменяет authorization и удаляется после завершения rollout.

## Навигация

- [Назад: часть 15 — тестирование и безопасность](../part-15-testing-security/README.md)
- [Дальше: часть 17 — наблюдаемость и эксплуатация](../part-17-observability-operations/README.md)
