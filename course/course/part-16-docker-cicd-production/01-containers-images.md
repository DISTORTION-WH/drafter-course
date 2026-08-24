# Глава 1. Images, containers и production process

## 1. Image и container

Docker image — неизменяемый шаблон filesystem/config запуска. Container — конкретный процесс, запущенный из image.

```text
Dockerfile + build context
       -> image layers
       -> registry: tag + immutable digest
       -> container instance 1
       -> container instance 2
```

Один image можно запустить как API или worker с разной командой и configuration. Это уменьшает вероятность, что worker содержит другой domain code.

## 2. Что container решает

- фиксирует OS/runtime/dependencies;
- повторяет production process локально и в CI;
- изолирует процессы;
- упрощает rollout нескольких экземпляров;
- даёт immutable artifact с digest;
- позволяет сканировать runtime filesystem.

Что не решает:

- архитектурные ошибки;
- backup;
- secrets;
- observability;
- SQL migrations;
- autoscaling policy;
- безопасность host/cluster;
- сохранность данных внутри writable container layer.

## 3. Процессы Dota Analyzer

```text
api       -> HTTP /v1, stateless кроме внешних stores
worker    -> BullMQ ingestion/notifications
scheduler -> создаёт due jobs, leader-safe/idempotent
migrate   -> одноразово применяет DB migrations
```

Можно использовать один image и разные commands:

```text
node dist/apps/api/main.js
node dist/apps/worker/main.js
node dist/apps/scheduler/main.js
node dist/tools/migrate.js
```

Не запускайте migrations автоматически каждым API replica: два экземпляра могут бороться, а ошибка schema остановит весь rollout без контроля.

## 4. Stateless API

API replica не хранит важное состояние в local memory/filesystem:

- sessions — PostgreSQL/Redis по принятой модели;
- cache — Redis;
- raw data/replays — object storage;
- canonical data — PostgreSQL;
- jobs — queue/outbox;
- config/secrets — platform injection.

In-memory cache разрешён только как необязательная оптимизация: его потеря или различие между replicas не меняет correctness.

## 5. Container lifecycle

Platform:

1. создаёт container;
2. запускает process;
3. проверяет startup/readiness;
4. направляет traffic;
5. при обновлении посылает termination signal;
6. ждёт grace period;
7. завершает process.

Приложение обрабатывает shutdown:

```ts
app.enableShutdownHooks();
```

При сигнале API перестаёт принимать новые запросы, завершает активные в пределах deadline, закрывает DB/Redis connections. Worker перестаёт брать новые jobs и корректно завершает/возвращает текущие по семантике BullMQ.

## 6. Health probes

Разделите:

| Probe | Вопрос | Failure action |
|---|---|---|
| startup | процесс закончил boot/migrations expectation? | ещё ждать/перезапустить |
| liveness | event loop/process жив? | перезапустить container |
| readiness | можно направлять новый traffic? | убрать из load balancer |

Liveness не должна падать из-за краткого сбоя внешнего Steam: перезапуск API не починит provider и создаст storm. Readiness может учитывать критические зависимости осторожно; часто DB недоступна — не принимать traffic, а provider outage отражается degraded status.

## 7. Resources

Задайте requests/limits по измерениям:

- API CPU/memory;
- worker concurrency;
- Node heap;
- DB pool на instance;
- graceful shutdown timeout;
- maximum request/replay size;
- temp disk.

Если 10 replicas имеют pool по 30, база увидит до 300 connections. Autoscaling и pool рассчитываются вместе.

## 8. Tag и digest

```text
registry.example.com/dota/api:git-abc123
registry.example.com/dota/api@sha256:...
```

Tag удобен человеку и может быть перемещён. Digest идентифицирует точные bytes. Deployment record хранит commit, image digest, migration version и config/flag revision.

Не используйте `latest` для production release.

## 9. Упражнение

Нарисуйте process map: command, dependencies, health, data ownership, shutdown, scaling dimension для API, worker, scheduler и migration job. Если процесс пишет важный файл внутрь container, перенесите его в подходящее хранилище.

[Назад к оглавлению](README.md) · [Следующая глава](02-api-dockerfile.md)

