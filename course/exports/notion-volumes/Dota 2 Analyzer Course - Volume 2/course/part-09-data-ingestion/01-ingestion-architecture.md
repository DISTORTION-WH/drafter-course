# Глава 1. Архитектура ingestion pipeline

[← Оглавление](README.md) · [Глава 2 →](02-provider-adapter-canonical-model.md)

## Почему ingestion не находится в HTTP controller

Provider может отвечать 20 секунд, вернуть `429` или потребовать повтор. Если `GET /matches/:id` начинает такой fetch:

- пользователь ждёт чужой сервис;
- request timeout конфликтует с retry;
- десять пользователей запускают одинаковую загрузку;
- provider outage становится outage нашего чтения;
- невозможно спокойно выполнить backfill.

Поэтому API читает уже собранные данные, а worker обновляет их независимо.

## Процессы

```text
apps/api       public HTTP, read-heavy
apps/worker    BullMQ processors, provider I/O, normalize/write
PostgreSQL     canonical truth + ingestion state
Redis          queues, locks/rate coordination, short cache
object storage raw payload archive
```

Локально raw archive может быть ignored directory; production — bucket/object storage.

## Стадии

### Discovery

Находит identity ресурса: match ID, league ID, team ID. Не загружает полный match, если список уже даёт ID.

### Fetch

Получает provider response, метаданные HTTP и retrieval time.

### Archive

Сохраняет raw envelope и hash. После этого parser можно улучшать без нового API request.

### Normalize

Проверяет runtime schema, переводит provider values/units/IDs в canonical model.

### Persist

Одной транзакцией upsert-ит match, participants, draft, mappings и status.

### Publish freshness

Обновляет watermark/status, по которым API сообщает свежесть.

## Command и event

- Command: `ingest this match` — желаемое действие, может завершиться ошибкой.
- Event: `match ingestion completed` — факт, который уже произошёл.

В MVP BullMQ job — command. Не называйте job «completed», пока работа не завершена.

## Backpressure

Если discovery находит 100 000 IDs, а provider разрешает мало requests, очередь растёт. Это нормально до установленного предела. Нужны:

- batch discovery;
- queue depth alert;
- pause backfill при росте live lag;
- priority для свежих pro matches;
- disk/object storage budget;
- provider quota budget.

Нельзя ускорить ingestion только увеличением concurrency: provider и PostgreSQL имеют пределы.

## Data flow ownership

Каждая стадия имеет input/output:

| Стадия | Input | Output |
|---|---|---|
| discover | cursor/watermark | resource IDs |
| fetch | provider + ID | raw HTTP result |
| archive | raw result | object key + hash |
| normalize | raw payload | canonical match |
| persist | canonical match | internal IDs/version |

Это позволяет повторять стадию и тестировать её отдельно.

## Практика

Для сбоев «Redis down», «OpenDota 429», «raw storage down», «parser error», «PostgreSQL deadlock» укажите:

- стадия;
- потеряны ли данные;
- можно ли retry;
- где записан status;
- что видит API.

## Самопроверка

- [ ] Public read не зависит от live provider.
- [ ] Raw archive идёт до normalize.
- [ ] Каждая стадия имеет явный contract.
- [ ] Рост queue измеряется и ограничивается.
- [ ] Concurrency не считается бесплатной скоростью.
