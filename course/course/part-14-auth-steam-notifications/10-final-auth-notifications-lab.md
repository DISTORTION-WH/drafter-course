# Глава 10. Итоговая лабораторная: Steam → watchlist → push

## Цель

На staging physical device выполнить проверяемый сценарий:

```text
гость смотрит матчи
-> входит через настоящую страницу Steam
-> видит связанный аккаунт
-> добавляет тестовую команду в watchlist
-> сознательно включает уведомления
-> backend создаёт тестовое событие
-> устройство получает push
-> нажатие открывает правильный экран
-> logout удаляет private state
```

## 1. Backend-модули

Создайте или завершите:

```text
AuthModule
  SteamOpenIdAdapter
  AuthLoginTransactionService
  AuthExchangeService
  SessionService

UsersModule
  UsersService
  SteamLinksService

WatchlistModule
  WatchlistController
  WatchlistService

NotificationsModule
  PushDeviceController
  NotificationPreferencesController
  NotificationEventService
  ExpoPushAdapter
  NotificationWorker
  ReceiptWorker
```

Контроллеры тонкие. Транзакции, ownership и state transitions находятся в services/repositories.

## 2. Миграции

Нужны таблицы:

- `users`;
- `steam_links`;
- `auth_login_transactions`;
- `auth_exchange_codes`;
- `user_sessions`;
- `watchlist_entries`;
- `push_devices`;
- `notification_preferences`;
- `notification_events`;
- `notification_deliveries`;
- outbox/queue bookkeeping из предыдущих частей.

Добавьте unique/check/index constraints из глав. Миграция имеет rollback там, где он безопасен; необратимые изменения требуют backup/recovery плана.

## 3. Auth API

Проверьте:

```text
GET  /v1/auth/steam/start
GET  /v1/auth/steam/callback
POST /v1/auth/exchange
POST /v1/auth/refresh
POST /v1/auth/logout
POST /v1/auth/logout-all
GET  /v1/me
DELETE /v1/me
```

Обновите OpenAPI и generated client. Redirect endpoints документируются отдельно от обычного JSON-клиента, а exchange/refresh используют строгие DTO.

## 4. Mobile-модули

```text
src/features/auth/
  auth-provider.tsx
  auth-session-service.ts
  secure-token-store.ts
  steam-login.ts
  auth-callback.ts

src/features/watchlist/
  api/
  screens/
  guest-watchlist-store.ts
  merge-service.ts

src/features/notifications/
  permission-service.ts
  push-registration.ts
  notification-router.ts
  notification-listeners.ts
```

Auth provider проходит `bootstrapping -> guest/authenticated`. API transport добавляет access token и координирует единственный refresh.

## 5. Безопасная staging-конфигурация

Отдельно настройте:

- публичный HTTPS callback backend;
- Steam realm/return URL;
- staging universal/app link;
- EAS project ID;
- FCM/APNs credentials;
- backend secret/ключ provider;
- staging API URL;
- allowed redirects;
- staging push environment.

Ни один secret не начинается с `EXPO_PUBLIC_`. Не прикладывайте `.env`, токены или полный callback query к баг-репорту.

## 6. Тестовое notification event

Не создавайте публичный endpoint «send any push». Сделайте защищённую internal/admin команду или seed job, которая создаёт разрешённое тестовое событие только в staging.

```text
event_type: MATCH_REMINDER
entity: известный staging match
dedup key: test:<testRunId>:<matchId>
recipient: текущий staging user/watchlist
```

Worker всё равно проверяет preference и device. Так тестируется настоящий pipeline, а не обходная кнопка.

## 7. Автоматические тесты

### Backend

- OpenID verification adapter success/failure fixture;
- state/TTL/one-time exchange;
- concurrent refresh rotation;
- reuse отзывает family;
- уникальность SteamID;
- watchlist ownership/idempotency;
- push registration upsert и environment separation;
- scheduler dedup;
- retry и DeviceNotRegistered;
- deletion job idempotency.

### Mobile

- auth bootstrap;
- browser cancel;
- callback state mismatch;
- secure token write failure;
- single-flight refresh;
- guest watchlist merge;
- denied push permission;
- notification action parser;
- cold-start pending navigation;
- private cache cleared on logout/account switch.

## 8. Ручной сценарий

Зафиксируйте время, app build и request IDs, но не secrets:

1. Установить свежий staging development build.
2. Убедиться, что публичные матчи доступны гостю.
3. Добавить одну guest-команду.
4. Нажать вход; проверить домен Steam в системном browser UI.
5. Завершить вход и согласиться на merge.
6. Перезапустить приложение; сессия восстанавливается через rotation.
7. Включить match reminders и разрешить OS notifications.
8. Убедиться, что device active только в staging.
9. Создать тестовое событие.
10. Проверить ticket, затем receipt.
11. Нажать push; открыть конкретный match.
12. Повторно обработать event; второй watchlist/delivery эффект не создаётся.
13. Выполнить logout; private данные исчезают.
14. Войти другим staging account; кэш первого не виден.
15. Отдельно протестировать удаление тестового аккаунта.

## 9. Definition of Done части 14

- Guest analytics работает без входа.
- Steam credentials вводятся только у Steam.
- Backend проверяет OpenID и не доверяет callback query сам по себе.
- Redirect несёт одноразовый code, но не session tokens.
- Refresh token защищён, вращается и имеет reuse detection.
- Один refresh выполняется одновременно на устройстве.
- SteamID и другие 64-битные ID не превращаются в `number`.
- Watchlist server-owned, idempotent и изолирован по user.
- Guest merge не теряет данные и не включает push молча.
- Permission, preference, watchlist и active device проверяются раздельно.
- Worker сохраняет tickets и проверяет receipts.
- Invalid push tokens отключаются.
- Deep link parser разрешает только внутренние действия.
- Logout и account switch очищают private cache.
- Account deletion отзывает sessions/devices и запускает idempotent cleanup.
- Security/contract/integration tests проходят.

## После лабораторной

У вас появляется первая персональная вертикаль, которую можно отдать небольшой закрытой группе тестировщиков. До публичного production-релиза ещё потребуются части о качестве, безопасности, наблюдаемости, публикации stores, стоимости и эксплуатации.

[Предыдущая глава](09-deep-links-logout-deletion-security.md) · [Оглавление части](README.md) · [Перейти к части 15](../part-15-testing-security/README.md)
