# Глава 7. Кэш, S3, CloudFront и секреты

## Результат главы

Вы отделите временный кэш от долговременных данных, закроете S3 от прямого публичного доступа и передадите секреты контейнерам без записи в репозиторий.

## 1. Сначала классифицируйте данные

| Тип | Пример | Где хранить | Можно потерять? |
|---|---|---|---|
| транзакционные | пользователи, entitlement, матчи | RDS | нет |
| кэш | готовый ответ meta endpoint | Redis | да, можно пересчитать |
| очередь | задание синхронизации | Redis/SQS | нет без контролируемой повторной доставки |
| raw object | разрешённый ответ провайдера/replay | private S3 | зависит от политики |
| статический public | privacy/support web | S3 за CloudFront | да, восстанавливается из build |
| секрет | API key, пароль БД | Secrets Manager | нет |

Фраза «положим всё в Redis» опасна. Кэш и очередь имеют разные требования к потере данных.

## 2. ElastiCache только при доказанной необходимости

Если приложение уже использует BullMQ или кэш даёт измеримую пользу, ElastiCache for Redis/Valkey может быть оправдан. Настройте:

- закрытые подсети;
- Security Group только от API/worker;
- encryption at rest;
- encryption in transit;
- аутентификацию/RBAC;
- alarms на память, evictions, connections и replication lag;
- TTL у кэш-ключей;
- обработку cache miss без падения API.

AWS повышает минимальные требования TLS: всегда сверяйте актуальную документацию и версии клиента перед обновлением. Никогда не отключайте проверку TLS ради быстрого запуска.

Если Redis используется как очередь, протестируйте:

- повторную доставку после restart;
- stalled jobs;
- failover;
- maxmemory policy;
- совместимость BullMQ с topology выбранного кластера.

SQS часто проще как долговременная очередь в AWS, но требует адаптера и иной семантики. Оформите смену как ADR и integration test.

## 3. Два назначения S3

Не смешивайте разные классы данных в одном ведре без причины.

```text
dota-raw-private-<env>   приватные разрешённые raw payload/replay
dota-site-<env>          build privacy/support/landing сайта
dota-logs-<env>          при необходимости access/audit logs
```

Для каждого bucket задайте:

- Block Public Access;
- encryption;
- versioning там, где это оправдано;
- lifecycle policy;
- retention по категории данных;
- запрет удаления production через случайный `cdk destroy`;
- отдельные IAM permissions.

Имена bucket глобально уникальны. Не включайте email, Steam ID или секрет в имя объекта. Лучше случайный внутренний ID и metadata в базе.

## 4. CloudFront и Origin Access Control

Статический сайт должен отдаваться через CloudFront. S3 остаётся непубличным, а CloudFront получает доступ через Origin Access Control (OAC). Не используйте публичный S3 website endpoint вместе с OAC.

Поток:

```text
user -> HTTPS CloudFront -> OAC -> private S3
```

Добавьте:

- ACM certificate для custom domain CloudFront в `us-east-1`;
- redirect HTTP to HTTPS;
- security headers;
- корректные cache-control для immutable assets и HTML;
- invalidation только когда она действительно нужна.

Для private raw objects не создавайте общий публичный distribution. Если пользователю разрешено скачать файл, API проверяет authorization и выдаёт короткоживущий signed URL. URL не заменяет проверку прав.

## 5. Secrets Manager

Секреты:

```text
provider API key
database credentials
Redis credentials
notification provider token
Apple/Google server credentials, когда появится billing
```

ECS может подставить секрет в переменную процесса. Важное ограничение: обновление секрета не всегда автоматически обновляет уже запущенную task. После rotation нужен контролируемый новый deployment.

Не делайте:

- `console.log(process.env)`;
- secret в Dockerfile `ARG` или `ENV`;
- secret в CDK output;
- secret в mobile `.env` — всё в приложении пользователя извлекаемо;
- один общий production key для всех окружений.

Мобильное приложение содержит только публичную конфигурацию: API URL, environment name, public DSN с ограничениями. Приватные provider keys живут на backend.

## 6. KMS и ротация

AWS-managed keys достаточны для многих MVP. Customer-managed KMS key нужен, если есть конкретные требования к контролю, audit или cross-account. Он добавляет стоимость и риск блокировки данных неверной policy.

Таблица ротации:

| Секрет | Период | Владелец | Проверка после ротации |
|---|---:|---|---|
| provider key | по договору/инциденту | backend owner | один sync job |
| DB password | по политике | platform owner | API + worker health |
| store server credential | по правилам магазина | billing owner | sandbox notification |

## Практика

1. Создайте private raw bucket и lifecycle rule.
2. Опубликуйте privacy/support сайт через CloudFront + OAC.
3. Докажите, что прямой S3 URL возвращает отказ.
4. Поместите тестовый secret в Secrets Manager и передайте ECS task.
5. Поверните secret и выполните новый deployment без простоя.
6. При наличии Redis имитируйте failover и cache flush.

## Готово, если

- публичных S3 buckets нет;
- кэш можно очистить без потери источника истины;
- очередь переживает согласованный сценарий отказа;
- секреты отсутствуют в Git, image, логах и mobile build;
- сроки хранения raw data оформлены явно.

## Официальные материалы

- [CloudFront OAC для private S3](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [ElastiCache encryption in transit](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html)
- [Передача Secrets Manager secrets в ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-app-secrets-manager.html)

