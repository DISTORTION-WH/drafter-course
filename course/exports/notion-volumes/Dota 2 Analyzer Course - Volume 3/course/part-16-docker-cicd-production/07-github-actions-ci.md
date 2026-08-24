# Глава 7. GitHub Actions CI

## 1. CI-контракт

Каждый pull request доказывает:

```text
lockfile устанавливается
format/lint/typecheck проходят
unit/integration/E2E проходят
OpenAPI/generated client синхронны
production image собирается
security checks не имеют непроанализированного blocker
```

Deployment credentials не нужны PR job, особенно для fork/untrusted contribution.

## 2. Минимальный workflow

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Set up Node
        uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc

      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Static checks
        run: pnpm check

      - name: Unit tests
        run: pnpm test:unit

      - name: Integration and API E2E
        run: pnpm test:integration

      - name: Verify generated contracts
        run: pnpm api:contract:check
```

Версии Actions здесь соответствуют актуальной на момент главы major-линии из официальных примеров. В реальном репозитории обновляйте контролируемо и, для усиленной supply-chain policy, pin action на reviewed commit SHA с автоматическим обновлением.

## 3. Testcontainers в Actions

Ubuntu hosted runner имеет Docker environment для Testcontainers. Test сам запускает нужные image и получает mapped ports. Не добавляйте одновременно service container и Testcontainer для одной базы.

Альтернатива GitHub service containers полезна, когда suite ожидает фиксированную БД. Выберите один подход на job. Testcontainers лучше изолирует versions/lifecycle в коде теста.

## 4. Разделение jobs

После базовой версии:

```text
quality:     format/lint/typecheck/openapi
unit:        быстрые packages matrix
integration: Testcontainers
mobile:      RNTL
image:       Docker build + scan
device:      selected trigger/nightly
```

Jobs выполняются параллельно. Не дробите слишком рано: пять минут startup ради десятисекундного теста увеличивают стоимость и сложность.

## 5. Cache

Кэш ускоряет, но не меняет correctness:

- pnpm store keyed by OS/lockfile;
- Turbo task cache с доверенной конфигурацией;
- Docker BuildKit registry/GHA cache;
- никогда не кэшировать `.env`, raw tokens, signing files;
- периодически подтверждать clean build без cache.

`node_modules` целиком часто хуже переносится, чем pnpm store + frozen install.

## 6. Artifacts

При необходимости сохраняйте на ограниченный retention:

- JUnit/test report;
- coverage summary;
- Maestro screenshots/video failure;
- OpenAPI diff;
- image scan/SBOM;
- migration dry-run report.

Artifacts проходят redaction. Не загружайте `.env`, full database dump или push tokens.

## 7. Image build

На main/tag:

```yaml
  image:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v6
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/example/dota-backend:git-${{ github.sha }}
          provenance: true
          sbom: true
```

Перед production адаптируйте registry/name и pin policy. Image deploy идентифицируется digest из build output, а не только tag.

## 8. Secrets и permissions

- root `permissions` = минимум;
- job повышает только нужное;
- PR tests не получают production secrets;
- environment secrets выдаются deploy job после protection/approval;
- cloud access предпочтительно через OIDC short-lived identity;
- `pull_request_target` не исполняет недоверенный checkout с secrets;
- third-party actions проходят review/pinning.

## 9. Required checks

Branch protection/ruleset требует успешные стабильные checks и review. Не называйте job случайно при каждом refactor — required check может исчезнуть. Emergency bypass имеет audit и последующий incident/review.

## 10. CI failure

Flaky test не перезапускается до зелёного без анализа. Сохраните seed, container logs, request ID, screenshot. Quarantine — временно, с owner/deadline и отдельным сигналом.

## 11. Официальные источники

- [GitHub Actions deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments)
- [PostgreSQL service containers](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers)

[Предыдущая глава](06-migrations-deployment.md) · [Оглавление](README.md) · [Следующая глава](08-cd-eas-builds.md)

