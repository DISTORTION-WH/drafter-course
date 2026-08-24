# Часть 14. Пользователи, Steam, watchlist и уведомления

Основная аналитика должна оставаться доступной гостю. Учётная запись нужна не ради искусственной регистрации, а для синхронизации персональных функций между устройствами: Steam identity, избранных команд и игроков, настроек и push-уведомлений.

## Что мы построим

```text
гость
  -> нажимает «Войти через Steam»
  -> системная auth-сессия открывает наш backend
  -> backend перенаправляет на Steam OpenID
  -> Steam возвращает проверенный ответ backend
  -> backend создаёт одноразовый exchange code
  -> universal/app link возвращает код приложению
  -> приложение обменивает код на session tokens
  -> пользователь сохраняет команду
  -> backend создаёт notification event
  -> worker отправляет push через Expo -> FCM/APNs
  -> приложение открывает разрешённый экран команды/матча
```

## Что вы изучите

1. Guest-first модель и внутренний user ID.
2. Безопасный серверный поток Steam OpenID 2.0.
3. Access token, refresh token, rotation и reuse detection.
4. Хранение сессии в Expo SecureStore и координацию refresh.
5. Привязку Steam identity, конфликты и приватность.
6. Server-owned watchlist и синхронизацию гостевых избранных.
7. Разрешение уведомлений, push token и настройки пользователя.
8. Очередь уведомлений, tickets, receipts, retry и дедупликацию.
9. Deep links, logout, удаление аккаунта и security-тесты.
10. Итоговый вертикальный сценарий.

## Неподвижные правила безопасности

- Пользователь вводит Steam-пароль только на странице Steam.
- Steam Web API key и ключи подписи существуют только на backend/secret manager.
- Mobile не доверяет одному лишь `claimed_id`; OpenID response проверяет backend.
- Access/refresh tokens не помещаются в redirect URL.
- Refresh token хранится защищённо, а его серверная копия — только в виде hash.
- Один SteamID64 привязан максимум к одному активному пользователю.
- Все 64-битные внешние ID передаются как строки.
- Push token не является паролем, но его нельзя писать в обычные логи.
- Push-доставка может повториться; события должны быть идемпотентными.
- Payload открывает только разрешённые внутренние маршруты.

## Навигация

- [Назад: часть 13 — mobile и backend](../part-13-mobile-backend/README.md)
- [Глава 1. Guest-first и модель пользователя](01-guest-and-identity-model.md)
- [Глава 2. Серверный Steam OpenID flow](02-steam-openid-flow.md)
- [Глава 3. Сессии и rotation токенов](03-sessions-and-token-rotation.md)
- [Глава 4. Авторизация в mobile и SecureStore](04-mobile-auth-and-securestore.md)
- [Глава 5. Steam linking и приватность](05-steam-linking-and-privacy.md)
- [Глава 6. Watchlist и синхронизация](06-watchlist-and-sync.md)
- [Глава 7. Регистрация push-устройства](07-push-device-registration.md)
- [Глава 8. Pipeline отправки уведомлений](08-notification-pipeline.md)
- [Глава 9. Deep links, выход, удаление и безопасность](09-deep-links-logout-deletion-security.md)
- [Глава 10. Итоговая лабораторная](10-final-auth-notifications-lab.md)
- [Дальше: часть 15 — тестирование и безопасность](../part-15-testing-security/README.md)
