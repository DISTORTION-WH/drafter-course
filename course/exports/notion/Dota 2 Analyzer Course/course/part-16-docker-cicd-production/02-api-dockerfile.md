# Глава 2. Multi-stage Dockerfile для Node.js monorepo

## 1. Цель Dockerfile

Production image содержит только необходимое для запуска:

- Node.js runtime зафиксированной LTS-линии;
- compiled JavaScript/source maps согласно policy;
- production dependencies;
- package metadata/licences;
- non-root user;
- entry process.

Не содержит TypeScript compiler, test fixtures, `.git`, local `.env`, coverage, docs, provider keys и package-manager cache.

## 2. `.dockerignore`

```dockerignore
.git
.github
node_modules
**/node_modules
**/dist
coverage
.turbo
.env
.env.*
!.env.example
*.log
outputs
docs/private
```

Проверьте, что исключение не удаляет source, нужный build. `.dockerignore` уменьшает context и риск случайно передать secret builder daemon.

## 3. Multi-stage template

Ниже учебный шаблон; пути адаптируются к фактическому output monorepo:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/database/package.json packages/database/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN pnpm typecheck
RUN pnpm build:backend
RUN pnpm --filter @dota/api --prod deploy /runtime/api
RUN cp -R dist /runtime/dist

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app app
COPY --from=build --chown=app:app /runtime/api ./
COPY --from=build --chown=app:app /runtime/dist ./dist
USER app
EXPOSE 3000
CMD ["node", "dist/apps/api/main.js"]
```

`pnpm deploy` и output layout зависят от вашей pnpm/build конфигурации. Сначала выполните image и `node ...` локально. Если deploy package уже включает dist иначе, не копируйте дубликат.

## 4. Разбираем инструкции

- `FROM ... AS name` создаёт именованный stage.
- `WORKDIR` задаёт текущую директорию.
- сначала копируются manifests/lockfile — dependency layer кэшируется, пока они не изменились;
- `--frozen-lockfile` запрещает тихо переписать lock;
- BuildKit cache mount ускоряет downloads, но не попадает в final image;
- build stage содержит dev dependencies/compiler;
- runtime получает только artifacts;
- `USER app` убирает root по умолчанию;
- exec-form `CMD [...]` корректнее принимает signals.

## 5. Pinning base image

`node:24-bookworm-slim` со временем обновляется. Для воспроизводимого release можно фиксировать digest и обновлять его ботом/review:

```dockerfile
FROM node:24-bookworm-slim@sha256:<reviewed-digest>
```

Не копируйте placeholder digest. Получите актуальный multi-architecture digest из доверенного registry и подтвердите поддерживаемые платформы.

Обновления base image обязательны: вечный pin сохраняет уязвимости. Воспроизводимость и patching работают вместе через контролируемый PR.

## 6. Secrets во время build

Нельзя:

```dockerfile
ARG STEAM_API_KEY
ENV STEAM_API_KEY=$STEAM_API_KEY
```

Build args/history/layers не являются secret store. Если private registry требует token, используйте BuildKit secret mount/CI credential mechanism и убедитесь, что token не копируется в layer. Runtime secrets инжектирует deployment platform.

## 7. Worker из того же image

```text
API deployment command:    node dist/apps/api/main.js
Worker deployment command: node dist/apps/worker/main.js
Migration job command:     node dist/tools/migrate.js
```

Dockerfile `CMD` — default, platform может безопасно override command. Если API и worker имеют radically different native dependencies/attack surface, позже разделите images, сохранив один commit/release manifest.

## 8. Проверки image

```bash
docker build --target runtime -t dota-backend:test .
docker run --rm dota-backend:test node --version
docker image inspect dota-backend:test
docker history dota-backend:test
```

Затем:

- image scanner;
- запустить как non-root;
- read-only root filesystem, если приложение совместимо;
- health endpoint;
- graceful stop;
- проверить отсутствие `.env`, fixtures и исходных secrets;
- SBOM/provenance средствами build platform.

## 9. Source maps

Source maps улучшают stack traces, но могут раскрывать source. Варианты:

- хранить private maps в error tracker/build artifacts;
- включать maps в закрытом image, не отдавая HTTP;
- удалять sources content согласно policy.

Решение должно сохранять возможность расследования production error.

## 10. Официальный источник

- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Node.js guide](https://docs.docker.com/guides/nodejs/)

[Предыдущая глава](01-containers-images.md) · [Оглавление](README.md) · [Следующая глава](03-compose-local-stack.md)

