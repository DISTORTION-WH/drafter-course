# Глава 3. Сессии и rotation токенов

## 1. Два токена с разными задачами

Стартовая модель:

| Артефакт | Срок | Где находится | Назначение |
|---|---|---|---|
| access token | короткий, например минуты | память mobile | доступ к `/me` endpoints |
| refresh token | длиннее, например недели | SecureStore | получить новую пару |

Конкретные сроки — продуктовая и риск-политика. Чем дольше токен, тем удобнее пользователю и больше окно злоупотребления при краже.

Access token может быть подписанным JWT или opaque token. Не пишите собственную криптографию: используйте проверенную библиотеку и управляйте ключами через secret manager. Для JWT проверяйте минимум подпись, алгоритм, `iss`, `aud`, `exp`, `sub`; поддерживайте rotation ключей через `kid`.

## 2. Серверная запись сессии

```sql
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  family_id uuid NOT NULL,
  refresh_token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  rotated_at timestamptz,
  revoked_at timestamptz,
  reuse_detected_at timestamptz,
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

CREATE INDEX user_sessions_user_active_idx
  ON user_sessions(user_id, expires_at)
  WHERE revoked_at IS NULL;
```

Каждое устройство получает отдельную session family. Выход с одного устройства не обязан отключать остальные. «Выйти везде» отзывает все families пользователя.

## 3. Почему хранится hash

Refresh token — длинная случайная строка. Backend показывает raw token только один раз при выдаче. В БД остаётся криптографический hash.

Поток:

```text
raw token от клиента
  -> hash тем же алгоритмом
  -> поиск активной session
  -> проверки expiry/revoke/rotation
```

Для высокоэнтропийного случайного токена быстрый SHA-256 hash допустим как lookup; дополнительный server-side pepper/HMAC уменьшает последствия чтения одной БД. Pepper хранится отдельно. Никогда не используйте человеческий пароль как refresh token.

## 4. Rotation при каждом refresh

Успешный `POST /v1/auth/refresh`:

```text
1. Получить raw refresh token по защищённому body/заголовку.
2. Вычислить hash.
3. В транзакции заблокировать session row.
4. Проверить expiry и revoked_at.
5. Пометить старую запись rotated/revoked.
6. Создать новую session запись в той же family с новым random token.
7. Выдать новый access + raw refresh token.
8. Mobile атомарно заменяет сохранённый refresh token.
```

Старый refresh token больше не должен работать. Если он появляется повторно, возможно, его украли.

## 5. Reuse detection

При повторном использовании уже вращавшегося токена:

- помечаем `reuse_detected_at`;
- отзываем всю family;
- не выдаём новую пару;
- записываем безопасное security event;
- mobile возвращается в guest и предлагает войти снова.

Гонки реальны: два запросa mobile могут одновременно получить 401 и попытаться refresh. Поэтому клиент обязан координировать один refresh promise, а backend — использовать транзакцию/row lock. Если вводите короткое grace window для нестабильной сети, документируйте точную семантику и не позволяйте старому токену создавать две независимые ветки.

## 6. Access token claims

Пример payload без лишних данных:

```json
{
  "sub": "our-user-uuid",
  "sid": "session-uuid",
  "iss": "https://api.example.com",
  "aud": "dota-analyzer-mobile",
  "iat": 1784200000,
  "exp": 1784200900,
  "jti": "unique-token-id"
}
```

Не помещайте в JWT Steam profile, watchlist или push token. JWT часто виден самому клиенту и может попадать в диагностику. Claims должны быть минимальны.

## 7. API endpoints

```text
POST /v1/auth/exchange
  body: { code, state, installationId }
  -> { accessToken, accessTokenExpiresAt, refreshToken, user }

POST /v1/auth/refresh
  body: { refreshToken }
  -> новая пара

POST /v1/auth/logout
  Authorization: Bearer <access>
  body: { refreshToken? }
  -> 204

POST /v1/auth/logout-all
  -> revoke всех sessions пользователя
```

Не возвращайте токены из GET query. Body проходит через HTTPS и redaction middleware.

## 8. Rate limiting и аудит

Жёстче ограничьте:

- auth start по IP/device signal;
- callback failures;
- exchange attempts;
- refresh failures;
- linking conflicts.

Security log содержит тип события, внутренний user/session ID, время, результат и request ID. Не содержит raw token или полный OpenID query.

## 9. Упражнение

Нарисуйте state machine сессии:

```text
active -> rotated -> reuse-detected
active -> expired
active -> revoked-by-user
active -> revoked-by-admin/security
```

Напишите service-тесты для каждого перехода, включая два одновременных refresh. Пока concurrency test не проходит, rotation нельзя считать готовой.

[Предыдущая глава](02-steam-openid-flow.md) · [Оглавление](README.md) · [Следующая глава](04-mobile-auth-and-securestore.md)

