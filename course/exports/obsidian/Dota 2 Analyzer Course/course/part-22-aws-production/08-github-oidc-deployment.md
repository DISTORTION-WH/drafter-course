# Глава 8. CI/CD через GitHub OIDC без постоянных AWS-ключей

## Результат главы

Вы построите воспроизводимый pipeline: тесты, сборка одного image digest, staging, миграция, smoke-тест, ручное подтверждение production и контролируемый rollback.

## 1. Почему не AWS access key в GitHub

Долгоживущий `AWS_ACCESS_KEY_ID` сложно безопасно ротировать. GitHub Actions поддерживает OIDC: job получает короткоживущий токен, AWS проверяет репозиторий, branch/environment и выдаёт временную роль.

Доверительная policy должна ограничивать:

- конкретную GitHub organization и repository;
- audience `sts.amazonaws.com`;
- production environment или разрешённый ref;
- отдельные роли staging и production.

Wildcard на все репозитории организации без причины слишком широк.

## 2. Роли pipeline

Разделите права:

```text
ci-read/test      — AWS не нужен
ecr-push          — загрузка образа только в нужный repository
staging-deploy    — изменение staging ресурсов
production-deploy — production, защищённый GitHub Environment approval
```

CDK deployment иногда требует широких CloudFormation-прав. Используйте CDK bootstrap roles и permission boundaries, а не `AdministratorAccess` навсегда.

## 3. Путь одного артефакта

```text
commit
  -> lint/typecheck/unit/integration
  -> dependency and image scan
  -> build image once
  -> push ECR
  -> record digest
  -> deploy staging with digest
  -> migration task
  -> smoke tests
  -> manual production approval
  -> deploy same digest
  -> production migration
  -> smoke/metrics watch
```

Если staging и production получили разные сборки, staging уже не проверяет production-артефакт.

## 4. Workflow-каркас

```yaml
name: release

on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

concurrency:
  group: production-release
  cancel-in-progress: false

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm check

  deploy-staging:
    needs: verify
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_STAGING_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}
      - run: ./scripts/release-staging.sh
```

Это каркас, не готовый файл: action versions и scripts зафиксируйте и проверьте перед использованием. Не вставляйте shell-команду из пользовательского input без безопасной обработки.

## 5. Что делает release script

Скрипт обязан остановиться при ошибке и печатать не секреты, а идентификаторы релиза:

1. вычисляет commit SHA;
2. собирает image;
3. push в ECR;
4. получает digest из ECR;
5. записывает release manifest;
6. передаёт digest в CDK/ECS;
7. ждёт стабильности service;
8. запускает migration task;
9. выполняет smoke tests.

Release manifest:

```json
{
  "commit": "abc123...",
  "imageDigest": "sha256:...",
  "migration": "202607171200_add_entitlements",
  "builtAt": "2026-07-17T12:10:00Z"
}
```

Время и хеш — данные, а не секреты.

## 6. Миграция и порядок deployment

Не существует одного порядка для всех схем. Для backward-compatible миграции часто безопасно:

1. применить расширяющую миграцию;
2. обновить API/worker;
3. проверить метрики;
4. выполнить backfill;
5. контрактное удаление — отдельным будущим релизом.

Если migration неуспешна, rollout не продолжается. Автоматический rollback контейнера не отменит уже применённую схему; поэтому миграции проектируют совместимыми.

## 7. Smoke tests

Минимум после релиза:

```text
GET /health/live -> 200
GET /health/ready -> 200
GET public meta endpoint -> валидная схема и freshness
login test account -> access token
GET protected watchlist -> 200
enqueue safe synthetic sync -> completed exactly once
```

Тестовая учётная запись не должна иметь production-административных прав.

## 8. Rollback

Rollback приложения — это deployment предыдущего проверенного digest. Держите:

- last known good digest;
- совместимую схему базы;
- команду/кнопку rollback;
- критерии: рост 5xx, p95, crash loop, критическая бизнес-ошибка;
- ответственного за решение.

После rollback сохраните логи и timeline. Не исправляйте incident «вручную внутри контейнера» — Fargate task эфемерна, а изменение невоспроизводимо.

## Практика

1. Настройте GitHub OIDC для staging с ограничением репозитория.
2. Докажите отсутствие AWS access keys в GitHub Secrets.
3. Выпустите один digest в staging.
4. Сломайте health endpoint и проверьте остановку/rollback.
5. Одобрите production через GitHub Environment.
6. Откатитесь на last known good digest и измерьте время.

## Готово, если

- GitHub использует временную OIDC-role;
- production требует approval;
- staging и production получают один digest;
- migration и smoke test являются gates;
- два релиза не выполняются одновременно;
- rollback проверен практикой.

## Официальные материалы

- [Настройка OpenID Connect в AWS для GitHub Actions](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
- [AWS IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

