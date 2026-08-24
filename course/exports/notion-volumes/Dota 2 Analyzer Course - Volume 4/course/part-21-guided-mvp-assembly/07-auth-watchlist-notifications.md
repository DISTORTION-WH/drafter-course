# Глава 7. Steam, watchlist и уведомления

## Цель

Добавить пользовательское состояние после того, как публичная ценность уже работает. Guest может изучать матчи; account нужен для синхронизации watchlist и уведомлений.

## 1. Guest-first

Без входа доступны:

- matches/details;
- teams/players;
- meta/search;
- local watchlist по принятой policy.

Вход предлагается, когда пользователь хочет sync/notifications, а не блокирует первый экран.

## 2. Steam OpenID boundary

```text
mobile -> backend start URL
-> system browser/Steam OpenID
-> backend verifies provider response
-> one-time app exchange code
-> mobile exchanges code
-> access + rotating refresh session
```

Mobile не получает Steam API key, не собирает Steam password и не принимает identity assertion без server verification.

## 3. Deep/universal links

- allowlisted scheme/host/path;
- one-time code короткоживущий;
- no access/refresh token in URL;
- state/nonce/replay protection;
- cancellation/error states;
- staging/prod redirects separated;
- malicious parameter tests.

## 4. Sessions

Backend:

- random refresh secret hash;
- short access lifetime;
- refresh rotation transaction;
- reuse detection/family revoke;
- per-device session;
- logout one/all;
- rate limits;
- audit event without raw token.

Mobile хранит refresh credential в SecureStore и не пишет его в Zustand/AsyncStorage/log.

## 5. Watchlist

```text
user_watchlist
  user_id
  subject_type team|player|tournament
  subject_id
  notification_preference
  created_at
  unique(user, type, id)
```

Authorization берёт `userId` из verified session, не из request body.

Mutation идемпотентна. Optimistic UI имеет rollback при error.

## 6. Local merge

При первом login спросите, переносить ли local watchlist. Merge:

- preview;
- idempotent operation ID;
- server unique constraint;
- no deletion local до success;
- conflict policy;
- audit/count.

## 7. Push registration

Installation model:

```text
installation_id
user_id/session
platform
push_token encrypted/protected
app/environment/version
status
last_seen
```

Staging не отправляет production users. Token rotation/reinstall/logout handled.

## 8. Notification pipeline

```text
canonical match schedule/change
-> domain notification intent
-> recipient expansion/watchlist
-> outbox
-> delivery attempt
-> provider receipt
-> invalid token cleanup
```

Dedup key включает event/user/installation/template version. Schedule correction отменяет/заменяет старое intent.

## 9. Preferences/time

- event types;
- quiet hours with timezone;
- enabled subject;
- reminder offset;
- marketing consent separate from service notifications;
- no unsolicited Steam marketing.

## 10. Account deletion

In-app flow:

```text
reauth/confirmation
-> revoke sessions immediately
-> disable installations
-> idempotent deletion workflow
-> delete/anonymize app-account data by policy/law
-> completion/audit without retaining forbidden personal data
```

Professional match facts are not automatically user-account data, но связь пользователя с ними/watchlist является пользовательской.

Web deletion request понадобится для Google Play и описан в части 23.

## 11. E2E

Используйте test identity adapter в staging:

```text
guest opens match
-> test login
-> merge/add team
-> register test device
-> emit synthetic upcoming match
-> receive push/deep link
-> logout
-> token cannot refresh
-> delete account
```

Не автоматизируйте production Steam credential в public CI.

## Definition of Done

- guest critical path работает;
- OpenID verified backend-side;
- token не попадает в URL/log/plain storage;
- refresh reuse revokes family;
- watchlist server authorization/unique;
- local merge safe;
- push environments isolated;
- notification dedup/receipts tested;
- preferences/quiet hours applied;
- logout/account deletion E2E;
- public screens не зависят от auth availability.

[Предыдущая глава](06-meta-search-freshness.md) · [Оглавление](README.md) · [Следующая глава](08-quality-security-operations.md)
