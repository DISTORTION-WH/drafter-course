# Глава 3. Локальный Docker Compose stack

## 1. Роль Compose

Compose описывает локальные зависимости и интеграционную среду:

```text
api
worker
scheduler
postgres
redis
S3-compatible local object storage (optional)
```

Compose не является автоматически production orchestration. Production использует managed platform/service contracts из следующих глав.

## 2. `compose.yaml`

```yaml
services:
  postgres:
    image: postgres:18-bookworm
    environment:
      POSTGRES_DB: dota
      POSTGRES_USER: dota
      POSTGRES_PASSWORD: local-only-password
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dota -d dota"]
      interval: 5s
      timeout: 3s
      retries: 20

  redis:
    image: redis:8-bookworm
    ports:
      - "127.0.0.1:6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 20

  api:
    build:
      context: .
      target: runtime
    command: ["node", "dist/apps/api/main.js"]
    env_file:
      - .env.compose.local
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    build:
      context: .
      target: runtime
    command: ["node", "dist/apps/worker/main.js"]
    env_file:
      - .env.compose.local
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
```

Image tags — примеры для выбранной major-линии. Зафиксируйте конкретную поддерживаемую версию и обновляйте контролируемо.

## 3. Сетевые адреса внутри Compose

Из container:

```text
PostgreSQL host = postgres
Redis host      = redis
API host        = api
```

`localhost` внутри API container — сам API container. С host компьютера база доступна через `127.0.0.1:5432`, потому что port опубликован только на loopback.

Пример local URL внутри services:

```env
DATABASE_URL=postgresql://dota:local-only-password@postgres:5432/dota
REDIS_URL=redis://redis:6379
```

Файл `.env.compose.local` игнорируется Git. В репозитории хранится `.env.compose.example` без secrets.

## 4. `depends_on` не заменяет retry

Health condition помогает startup order, но dependency может упасть после запуска. API всё равно имеет connection timeout/retry/backoff и корректный degraded health. Worker не теряет jobs при reconnect согласно queue semantics.

## 5. Миграция отдельной командой

```yaml
  migrate:
    build:
      context: .
      target: runtime
    command: ["node", "dist/tools/migrate.js"]
    env_file:
      - .env.compose.local
    depends_on:
      postgres:
        condition: service_healthy
    profiles: ["tools"]
```

Запуск:

```bash
docker compose --profile tools run --rm migrate
docker compose up --build api worker
```

Сначала migration, затем processes. Для local convenience можно script, но порядок остаётся видимым.

## 6. Volumes и очистка

Named volume сохраняет данные после `docker compose down`. Команда с удалением volumes уничтожает local DB и требует осознанного подтверждения. Не включайте её в обычный `start` script.

Seed выполняется отдельной idempotent командой для development environment, никогда автоматически в production.

## 7. Development mode

Для быстрого hot reload можно запускать Node на host, а PostgreSQL/Redis — Compose. Это нормально:

```text
host pnpm dev -> localhost:5432/6379
Expo device   -> LAN IP API
```

Production image обязательно тестируется отдельно до merge/release.

## 8. Логи

Services пишут structured logs в stdout/stderr. Не монтируйте бесконечные log files. `docker compose logs api` помогает local diagnosis. Redaction применяется как в production.

## 9. Практика

Проверьте:

1. чистый `compose up` поднимает dependencies;
2. migration создаёт schema;
3. seed добавляет deterministic matches;
4. API health/readiness работают;
5. worker получает одну job;
6. stop/restart не теряет PostgreSQL volume;
7. Redis outage не портит canonical data;
8. production secret отсутствует в config/image/log.

[Предыдущая глава](02-api-dockerfile.md) · [Оглавление](README.md) · [Следующая глава](04-environments-managed-services.md)

