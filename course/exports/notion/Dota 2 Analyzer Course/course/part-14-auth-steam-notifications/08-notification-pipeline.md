# Глава 8. Pipeline отправки уведомлений

## 1. Почему нельзя отправлять push из HTTP controller

Отправка зависит от внешних сервисов и может требовать retry. Если controller ждёт Expo/FCM/APNs:

- пользовательский запрос становится медленным;
- повтор POST способен отправить дубликат;
- временный сбой provider ломает основную операцию;
- receipt невозможно правильно обработать через минуты.

Используем event/outbox и очередь:

```text
match ingested/updated
  -> domain condition
  -> notification_event + outbox (одна DB transaction)
  -> BullMQ job
  -> resolve recipients/preferences/devices
  -> Expo Push API
  -> tickets saved
  -> delayed receipt-check job
  -> delivery status / disable invalid tokens
```

## 2. События и доставки

```sql
CREATE TABLE notification_events (
  id uuid PRIMARY KEY,
  deduplication_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification_deliveries (
  id uuid PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES notification_events(id),
  user_id uuid NOT NULL REFERENCES users(id),
  push_device_id uuid NOT NULL REFERENCES push_devices(id),
  status text NOT NULL,
  provider_ticket_id text,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error_code text,
  sent_at timestamptz,
  receipt_checked_at timestamptz,
  UNIQUE (event_id, push_device_id)
);
```

Пример deterministic deduplication key:

```text
match-reminder:<matchId>:<scheduledStartVersion>:<minutesBefore>
```

Если начало матча перенеслось, version помогает явно решить: отменить старую задачу и создать новую. Просто `matchId` недостаточен для разных типов уведомлений.

## 3. Планировщик напоминаний

Матчи переносятся. Поэтому cron «найти всё через 15 минут» должен учитывать:

- актуальную start time/version;
- уже созданные dedup keys;
- отменённый матч;
- изменение watchlist/preferences;
- timezone/quiet hours;
- задержку ingestion.

Перед самой отправкой worker повторно проверяет актуальность. Очередь могла содержать старую задачу.

## 4. Payload

Безопасный payload:

```json
{
  "title": "Скоро матч Team Spirit",
  "body": "Матч начнётся примерно через 15 минут",
  "data": {
    "eventId": "event-uuid",
    "action": "OPEN_MATCH",
    "matchId": "8173564281"
  }
}
```

Не кладите в payload токены, закрытые настройки, произвольный URL или подробную личную аналитику. У push services есть небольшой предел размера payload; держите его минимальным и загружайте свежие данные после открытия приложения.

## 5. Tickets не равны доставке

После отправки Expo Push Service возвращает push ticket. Успешный ticket означает, что сервис принял сообщение, но не доказывает, что ОС доставила или пользователь увидел его.

Затем worker запрашивает push receipts по ticket IDs. Receipt сообщает результат передачи к FCM/APNs. Даже хороший receipt не доказывает показ пользователю.

Храните состояния явно:

```text
queued -> submitted -> receipt-ok
queued -> retryable-error -> submitted
submitted -> device-not-registered
submitted -> permanent-error
```

## 6. Retry и ошибки

Политика:

- 429/временные 5xx/network errors — exponential backoff с jitter;
- invalid payload/credentials — не бесконечный retry, alarm разработчикам;
- `DeviceNotRegistered` — отключить token/device;
- истёкшее событие — skip;
- attempt limit — dead-letter/failed state для расследования.

Актуальная документация Expo рекомендует проверять receipts после отправки; окно хранения receipts и рекомендуемая задержка могут меняться, поэтому вынесите расписание в конфигурацию и сверяйте с текущей документацией, а не зашивайте навечно число из примера.

## 7. Дубликаты

Push — доставка с возможными повторами. Защиты:

- unique `deduplication_key` события;
- unique `(event_id, push_device_id)` доставки;
- стабильный BullMQ `jobId`;
- transaction/outbox;
- `eventId` в payload;
- mobile хранит небольшой bounded set недавно обработанных event IDs для навигации/аналитики.

Нельзя гарантировать exactly-once показ уведомления на всех уровнях. Проектируйте эффект как идемпотентный.

## 8. Batch и лимиты

Разбивайте messages и receipt IDs на batch размера, поддерживаемого текущим Expo API/SDK. Ограничьте concurrency worker, уважайте rate limiting и наблюдайте:

- очередь/lag;
- submitted/receipt error rate;
- invalid-token rate;
- среднее число попыток;
- время от события до отправки;
- долю подавленных quiet hours/preferences;
- дубликаты по dedup constraint.

## 9. Тесты

Provider adapter подменяется fake:

- успешные tickets;
- частичная ошибка batch;
- 429, затем успех;
- DeviceNotRegistered;
- receipt отсутствует/задержан;
- duplicate job;
- пользователь отключил preference между schedule и send;
- матч перенесён;
- device относится к другому environment.

Smoke test реального push выполняется отдельно на staging physical device и не входит в обычные unit-тесты.

## 10. Официальный источник

Актуальные правила tickets, receipts и error handling: [Sending notifications with Expo Push Service](https://docs.expo.dev/push-notifications/sending-notifications/).

[Предыдущая глава](07-push-device-registration.md) · [Оглавление](README.md) · [Следующая глава](09-deep-links-logout-deletion-security.md)

