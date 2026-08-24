# Глава 1. Guest-first и модель пользователя

## 1. Не заставляйте регистрироваться ради аналитики

Гость может:

- смотреть профессиональные матчи;
- искать команды и игроков;
- изучать meta snapshots;
- открывать детали матча;
- пользоваться фильтрами.

Авторизованный пользователь дополнительно может:

- синхронизировать watchlist;
- связать Steam identity;
- настроить push;
- хранить персональные настройки на сервере;
- управлять сессиями и удалить аккаунт.

Такое разделение уменьшает объём персональных данных и позволяет сначала доказать ценность продукта.

## 2. Пользователь — не SteamID

Внутренний `user.id` не должен равняться SteamID. Сегодня вход выполняется через Steam, позже могут появиться другие identity providers или вход без Steam. Модель:

```text
users.id (наш UUID)
  1 -> 0..1 steam_links.steam_id
  1 -> many user_sessions
  1 -> many watchlist_entries
  1 -> many push_devices
  1 -> 1 notification_preferences
```

SteamID64 — внешний идентификатор, хранимый строкой. Display name и avatar могут меняться и не являются ключом авторизации.

## 3. Минимальная схема

Упрощённый PostgreSQL DDL:

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('active', 'deleting', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE steam_links (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  steam_id text NOT NULL UNIQUE,
  verified_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (steam_id ~ '^[0-9]+$')
);
```

Почему `steam_id text`:

- SteamID — 64-битное значение;
- JavaScript `number` не гарантирует точность всех 64-битных целых;
- над ID не выполняют арифметику;
- строка одинакова в БД API и mobile.

Regex проверяет только форму. Доказательство владения появляется после успешной OpenID-проверки.

## 4. Состояния клиента

Не храните один boolean `isLoggedIn`. Реальность богаче:

```ts
export type AuthState =
  | { status: 'bootstrapping' }
  | { status: 'guest' }
  | { status: 'authenticated'; userId: string }
  | { status: 'refreshing'; userId?: string }
  | { status: 'recoverable-error'; message: string };
```

При старте приложение ещё не знает, есть ли защищённый refresh token. Это `bootstrapping`, а не guest. Иначе UI на мгновение покажет «Войти», а потом личный профиль.

## 5. Какие данные можно хранить у гостя

Локально допустимы:

- история последних открытых экранов;
- применённые фильтры;
- тема;
- небольшой guest watchlist, если продукт этого хочет.

Если guest watchlist синхронизируется после входа, приложение заранее объясняет политику merge. Не создавайте скрытый серверный «анонимный аккаунт» с вечным tracking ID без необходимости.

## 6. Threat model до кода

Минимальные угрозы:

| Угроза | Защита |
|---|---|
| злоумышленник подделал SteamID в callback | серверная OpenID verification |
| украден redirect с токеном | токены не находятся в URL, только short-lived code |
| украден refresh token из БД | хранится hash, rotation и revoke |
| custom scheme перехватило другое приложение | HTTPS universal/app links в production |
| пользователь дважды добавил команду | уникальный индекс и идемпотентность |
| push ушёл старому владельцу устройства | logout/revoke устройства, invalid token handling |
| payload открыл внешний вредоносный URL | allowlist внутренних действий |

Threat model обновляется при изменении потока, а не хранится как формальный документ без связи с кодом.

## 7. API-грань

Публично:

```text
GET /v1/matches
GET /v1/teams/{id}
GET /v1/meta/snapshot
```

Требует пользователя:

```text
GET    /v1/me
GET    /v1/me/watchlist
POST   /v1/me/watchlist
DELETE /v1/me/watchlist/{entryId}
PUT    /v1/me/notification-preferences
POST   /v1/me/push-devices
DELETE /v1/me/push-devices/{installationId}
POST   /v1/auth/refresh
POST   /v1/auth/logout
DELETE /v1/me
```

Маршруты `/me` получают `userId` только из проверенной сессии, никогда из body клиента.

## 8. Упражнение

Составьте таблицу всех функций текущего приложения и отметьте `guest`, `authenticated` или `admin/internal`. Если публичному просмотру матча вдруг нужна авторизация, объясните конкретную причину. Если причины нет — оставьте его публичным.

[Назад к оглавлению](README.md) · [Следующая глава](02-steam-openid-flow.md)

