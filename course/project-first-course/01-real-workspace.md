# Модуль 1. Создаём настоящий monorepo и локальные сервисы

## Результат

У вас есть основной Git-репозиторий проекта. PostgreSQL и Redis запускаются одной командой. Пока API и mobile ещё не созданы — они появятся в следующих модулях.

## 1. Установить только необходимое

Нужно:

- Git;
- Node.js 24 LTS, а не Current;
- Docker Desktop;
- VS Code;
- Android Studio для Android emulator либо физический телефон;
- pnpm.

Проверьте PowerShell:

```powershell
git --version
node --version
docker --version
npm install --global pnpm@11.7.0
pnpm --version
```

Ожидается Node `v24.x`. Node 24 имеет LTS-статус; Node 26 на дату редакции имеет статус Current, поэтому в production-проекте мы не гонимся за самым большим номером.

## 2. Создать основной репозиторий

```powershell
New-Item -ItemType Directory -Path E:\projects\dota-analyzer
Set-Location E:\projects\dota-analyzer
git init
pnpm init
```

Это не временная папка. В ней останется финальный проект.

## 3. Корневой `package.json`

Замените содержимое:

```json
{
  "name": "dota-analyzer",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@11.7.0",
  "scripts": {
    "build:packages": "pnpm --filter \"./packages/*\" build",
    "dev:api": "pnpm build:packages && pnpm --filter @dota/api dev",
    "dev:worker": "pnpm build:packages && pnpm --filter @dota/worker dev",
    "dev:mobile": "pnpm build:packages && pnpm --filter @dota/mobile start",
    "check": "pnpm build:packages && pnpm -r typecheck && pnpm -r test",
    "infra:up": "docker compose up -d postgres redis",
    "infra:down": "docker compose down"
  }
}
```

Разбор реально используемых полей:

- `name` — имя всего monorepo;
- `private: true` запрещает случайную публикацию корня в npm;
- `packageManager` фиксирует одинаковый pnpm локально и в CI;
- `scripts` — команды проекта;
- `build:packages` компилирует существующие общие packages до запуска приложений;
- `pnpm --filter @dota/api dev` запускает только package с именем `@dota/api`;
- `pnpm -r` запускает команду рекурсивно во всех workspace packages, где она существует.

## 4. `pnpm-workspace.yaml`

```yaml
packages:
  - apps/*
  - packages/*
  - infra
```

`apps/*` означает: каждый непосредственный подпроект внутри `apps` становится package. Позже это будут `api`, `worker` и `mobile`.

Создайте корневой `tsconfig.base.json`, который действительно расширят backend packages и worker:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

`strict` запрещает молча обращаться к возможно отсутствующим данным, `sourceMap` связывает production stack trace с TypeScript source. React Native сохранит Expo-generated `tsconfig`, потому что Metro использует другой режим разрешения модулей.

## 5. Реальные локальные сервисы

Создайте `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: dota_analyzer
      POSTGRES_USER: dota
      POSTGRES_PASSWORD: local_only_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dota -d dota_analyzer"]
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:8-alpine
    ports:
      - "6379:6379"
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Что здесь реально используется:

- `postgres` хранит пользователей, матчи и агрегаты;
- `POSTGRES_DB` создаёт базу `dota_analyzer`;
- `ports` разрешает локальному API подключаться к контейнеру;
- `postgres_data` сохраняет данные после перезапуска;
- `healthcheck` позволяет скриптам понять, что база готова;
- `redis` хранит очередь BullMQ и короткоживущий кэш;
- `appendonly` повышает устойчивость локальной очереди после restart.

`local_only_password` допустим только в локальном compose. В AWS пароль будет находиться в Secrets Manager.

## 6. Настоящие переменные окружения

Создайте `.env.example`:

```dotenv
NODE_ENV=development
API_PORT=3000
DATABASE_URL=postgresql://dota:local_only_password@localhost:5432/dota_analyzer
REDIS_URL=redis://localhost:6379
OPENDOTA_BASE_URL=https://api.opendota.com/api
APP_VERSION=0.1.0
```

Затем создайте локальный `.env` как копию. `.env.example` попадает в Git и показывает названия. `.env` не попадает, потому что позднее в нём будут ключи.

`.gitignore`:

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
.expo/
.turbo/
coverage/
*.log
```

## 7. Аналогичная задача

Мы создали команды `infra:up` и `infra:down`. Теперь добавьте реально нужную команду просмотра логов.

Точные действия:

1. Откройте корневой `package.json`.
2. В объект `scripts` добавьте переменную-свойство `infra:logs`.
3. Значение — команда `docker compose logs -f postgres redis`.
4. Не удаляйте существующие scripts.
5. Запустите `pnpm infra:logs`, затем остановите просмотр `Ctrl+C`.

Эталон строки:

```json
"infra:logs": "docker compose logs -f postgres redis"
```

Это не декоративное упражнение: команда будет использоваться при ошибках базы и очереди.

## 8. Проверка

```powershell
pnpm infra:up
docker compose ps
docker compose exec postgres pg_isready -U dota -d dota_analyzer
docker compose exec redis redis-cli ping
```

Ожидается:

```text
postgres ... healthy
redis ... running
accepting connections
PONG
```

## 9. Commit

```powershell
git add package.json pnpm-workspace.yaml docker-compose.yml .env.example .gitignore
git commit -m "chore: initialize monorepo and local infrastructure"
```

## Готово, если

- репозиторий один;
- PostgreSQL и Redis запускаются;
- `.env` игнорируется;
- каждая root script имеет реальное назначение;
- вы можете объяснить, почему база и Redis не заменяют друг друга.

[Следующий модуль](02-api-bootstrap.md)
