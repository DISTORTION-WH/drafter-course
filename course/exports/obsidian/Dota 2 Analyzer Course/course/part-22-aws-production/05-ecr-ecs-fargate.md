# Глава 5. ECR, ECS Fargate и процессы приложения

## Результат главы

Вы упакуете API и worker в Docker-образы, загрузите их в ECR и запустите как разные ECS Fargate-сервисы. Плановые импорты и миграции будут отдельными задачами.

## 1. Почему процессы разделены

У приложения четыре разных режима:

```text
api        долго живёт, отвечает на HTTP
worker     долго живёт, обрабатывает фоновые задания
scheduler  по расписанию создаёт/запускает работу
migrate    запускается один раз и завершает Prisma migration
```

Если поместить всё в один процесс, сбой импорта может уронить API, а масштабирование HTTP случайно увеличит число планировщиков. Используйте один репозиторий и, если удобно, один образ, но разные команды запуска.

Пример scripts:

```json
{
  "scripts": {
    "start:api": "node dist/apps/api/main.js",
    "start:worker": "node dist/apps/worker/main.js",
    "migrate:deploy": "prisma migrate deploy"
  }
}
```

## 2. ECR — реестр образов

Создайте отдельные ECR repositories либо один репозиторий с понятными именами образов. Включите:

- immutable tags, если процесс релиза их поддерживает;
- сканирование уязвимостей;
- lifecycle policy для удаления старых, неиспользуемых образов;
- шифрование;
- запрет публичного доступа.

Тег `latest` не доказывает, какой код запущен. Релиз должен ссылаться на digest:

```text
123456789012.dkr.ecr.eu-central-1.amazonaws.com/dota-api@sha256:...
```

Один и тот же digest проходит staging и production. Повторная сборка «того же коммита» уже является новым артефактом.

## 3. Task Definition

Task Definition описывает запуск контейнера:

- image digest;
- CPU и память;
- команду;
- порт;
- environment без секретов;
- ссылки на Secrets Manager;
- CloudWatch log group;
- health check;
- task role и execution role.

Не путайте роли:

- execution role позволяет ECS получить образ, секреты и настроить логирование;
- task role — права уже работающего приложения на S3, SQS и другие AWS API.

Давайте каждой роли только нужные действия и ресурсы.

## 4. API service

API service:

- имеет минимум одну задачу в staging и нужное число в production;
- регистрируется в target group ALB;
- использует deployment circuit breaker с rollback;
- имеет health check grace period;
- получает `SIGTERM` и завершает HTTP/DB-соединения корректно;
- не выполняет миграцию при каждом старте.

Пример корректного завершения в Node.js:

```ts
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'shutdown started');
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
```

Функция получает имя сигнала, закрывает сервер, затем соединение Prisma. `void` перед вызовом показывает, что обработчик события сам не ожидает Promise; ошибки shutdown всё равно нужно логировать.

## 5. Worker service

Worker не подключается к ALB и не принимает входящий интернет-трафик. Он должен:

- ограничивать параллелизм;
- продлевать lease/visibility timeout долгих заданий;
- повторять временные ошибки с backoff и jitter;
- отправлять неисправимые задания в DLQ или состояние `failed`;
- быть идемпотентным;
- публиковать метрики возраста очереди и ошибок провайдера.

Если BullMQ требует Redis, сначала проверьте версию клиента и совместимость с выбранным ElastiCache. Для раннего дешёвого AWS-релиза можно рассмотреть SQS, но это отдельное архитектурное решение, а не механическая замена.

## 6. Scheduler

Для периодических импортов используйте EventBridge Scheduler, который запускает ECS task или отправляет сообщение в очередь. Он не должен содержать бизнес-логику. Его задача — инициировать команду:

```text
sync_recent_matches
recompute_meta_snapshot
clean_expired_raw_payloads
```

У каждой команды есть уникальный ключ окна, например `sync_recent_matches:2026-07-17T10:00Z`. Повторный запуск не должен создавать дубликаты.

## 7. Migration task

Миграция запускается отдельной one-off task из того же release digest:

```text
command: pnpm migrate:deploy
desired count: 0
network: доступ только к RDS
role: без лишних прав
```

Pipeline ждёт exit code 0 и только затем обновляет API. Для несовместимых изменений применяйте expand/migrate/contract:

1. добавить новую структуру без удаления старой;
2. выпустить код, пишущий совместимо;
3. перенести данные;
4. переключить чтение;
5. удалить старое в последующем релизе.

## 8. Масштабирование

Не масштабируйте только по CPU. Полезные сигналы:

- API: request count per target, p95 latency, CPU, memory;
- worker: длина и возраст очереди, время задания, rate limit провайдера;
- база: connections, CPU, storage, slow queries.

Задайте минимумы, максимумы и cooldown. Провайдер данных может запрещать увеличение запросов, даже если AWS способен создать больше worker-задач.

## Практика

1. Соберите образ локально и запустите API/worker разными командами.
2. Загрузите образ в staging ECR и сохраните digest.
3. Запустите API за ALB, затем worker без ALB.
4. Выполните migration task и сохраните её exit code.
5. Настройте одно расписание EventBridge и докажите идемпотентность повтором.
6. Остановите API-задачу и проверьте автоматическую замену.

## Готово, если

- можно назвать точный digest production-релиза;
- API, worker, scheduler и migrate не смешаны;
- rollout откатывается при нездоровой новой версии;
- секретов нет в image, task definition text и логах;
- повтор scheduled task не создаёт дубликаты.

## Официальные материалы

- [ECS Fargate: getting started](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/getting-started-fargate.html)
- [ECS Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)
- [Использование ECR с ECS](https://docs.aws.amazon.com/AmazonECR/latest/userguide/ECR_on_ECS.html)
- [EventBridge Scheduler](https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-schedule.html)

