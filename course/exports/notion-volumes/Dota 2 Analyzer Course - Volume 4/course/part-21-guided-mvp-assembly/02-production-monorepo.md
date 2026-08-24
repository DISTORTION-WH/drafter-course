# Глава 2. Создать production monorepo и общий контракт

## Цель

Создать один repository, в котором backend, worker, mobile и общие TypeScript contracts собираются согласованно.

## 1. Перед началом

Проверьте инструменты командами:

```powershell
git --version
node --version
pnpm --version
docker --version
```

Используйте поддерживаемый Node.js LTS и совместимую версию pnpm. Не копируйте номера версий из курса: зафиксируйте фактически проверенные значения в `package.json`, lockfile, CI и Docker.

## 2. Создание repository

```powershell
New-Item -ItemType Directory -Path dota-analytics
Set-Location dota-analytics
git init
pnpm init
```

После каждой команды выполните `Get-Location` и `git status`. Не запускайте scaffold в случайной родительской папке.

## 3. Папки

```powershell
New-Item -ItemType Directory -Path apps, packages, infra, db, docs, learning
New-Item -ItemType Directory -Path apps\api, apps\worker, apps\mobile, apps\web-public
New-Item -ItemType Directory -Path packages\contracts, packages\domain, packages\config, packages\testing
New-Item -ItemType Directory -Path infra\docker, infra\aws-cdk
New-Item -ItemType Directory -Path docs\adr, docs\legal, docs\product, docs\runbooks
```

PowerShell создаёт только directories; файлы далее создаются editor/scaffold tools.

## 4. Workspace

`pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/*
  - infra/*
```

Root `package.json` содержит:

```json
{
  "name": "dota-analytics",
  "private": true,
  "packageManager": "pnpm@<exact-reviewed-version>",
  "engines": {
    "node": "<reviewed-supported-range>"
  },
  "scripts": {
    "check": "pnpm format:check && pnpm lint && pnpm typecheck",
    "test": "pnpm test:unit && pnpm test:integration",
    "build": "pnpm -r build",
    "dev:api": "pnpm --filter @dota/api start:dev",
    "dev:worker": "pnpm --filter @dota/worker start:dev",
    "dev:mobile": "pnpm --filter @dota/mobile start"
  }
}
```

Placeholder version заменяется реальным exact value. JSON не допускает comments/trailing commas.

## 5. Не начинайте с task orchestrator

Turborepo/Nx можно добавить после измеренной проблемы build graph. `pnpm -r` достаточно для первого MVP. Каждая новая технология увеличивает количество ошибок, которые новичку надо различать.

## 6. Package responsibilities

```text
@dota/contracts
  API DTO schemas, generated types, stable enums

@dota/domain
  Match/Team/Player IDs, pure calculations, domain errors

@dota/config
  runtime config schemas, no secrets values

@dota/testing
  builders/fixtures/test helpers, no production imports from tests
```

Не импортируйте NestJS/React Native/Drizzle в `domain` без необходимости. Domain должен тестироваться обычным TypeScript.

## 7. App responsibilities

```text
api       HTTP, auth, use cases, repositories, OpenAPI
worker    provider calls, raw archive, normalization, jobs
mobile    navigation, screens, API client, local UI state
web-public privacy, terms, support, account deletion request
```

Scheduler может сначала быть отдельной command внутри worker image. В production AWS он запускается отдельным scheduled task.

## 8. Configuration

Создайте `.env.example` только с именами:

```dotenv
APP_ENV=development
PORT=3000
DATABASE_URL=postgresql://app:app@localhost:5432/dota
REDIS_URL=redis://localhost:6379
OBJECT_STORAGE_BUCKET=local-raw
PROVIDER_MODE=fixture
```

В настоящем `.env` могут быть локальные secrets, но файл игнорируется. Production secrets не копируются из `.env` в AWS вручную как постоянный процесс.

Runtime schema останавливает boot при неверной конфигурации. Не используйте `process.env.X!` по всему коду.

## 9. Git ignore

Проверьте минимум:

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
.expo/
coverage/
artifacts/
*.dem
*.log
cdk.out/
```

Не игнорируйте migrations, lockfile и `.env.example`.

## 10. Общий ID contract

```ts
export type MatchId = string & { readonly __brand: 'MatchId' };

export function parseMatchId(input: unknown): MatchId {
  if (typeof input !== 'string' || !/^\d+$/.test(input)) {
    throw new Error('Match ID must be a decimal string');
  }

  return input as MatchId;
}
```

64-bit IDs не превращаются в JavaScript `number`. На DB boundary используется `bigint/numeric` согласно схеме/driver, на JSON boundary — string.

## 11. Первый CI до функций

CI запускает:

```text
frozen install
format check
lint
typecheck
unit tests
secret scan
build
```

Пока apps пусты, добавьте маленький test `parseMatchId`. CI должен упасть при намеренной ошибке и пройти после исправления.

## 12. Commit

```text
chore(repo): initialize pnpm production workspace
```

Проверьте diff:

- нет `.env`;
- нет `node_modules`;
- один lockfile;
- команды root scripts существуют;
- README объясняет запуск.

## Definition of Done

- один Git repository;
- pnpm workspace и exact lockfile;
- apps/packages boundaries описаны;
- strict TypeScript base config;
- runtime config package;
- secrets/artifacts игнорируются;
- common ID contract протестирован;
- root check/test/build commands работают;
- CI реально ловит ошибку;
- первый atomic commit создан.

[Предыдущая глава](01-scope-user-data-gate.md) · [Оглавление](README.md) · [Следующая глава](03-first-vertical-slice.md)

