# Глава 9. Deep links, выход, удаление и безопасность

## 1. Два источника deep link

Приложение открывается ссылкой:

- после Steam auth callback;
- после нажатия на push.

Оба входа считаются недоверенными данными. Даже если payload создал наш backend, пользователь или другое приложение может сконструировать собственную ссылку.

## 2. Allowlist действий

Не принимайте `url` и не передавайте его напрямую router. Определите union:

```ts
type NotificationAction =
  | { action: 'OPEN_MATCH'; matchId: string }
  | { action: 'OPEN_TEAM'; teamId: string }
  | { action: 'OPEN_WATCHLIST' };
```

Parser:

```ts
export function parseNotificationAction(data: unknown): NotificationAction | null {
  if (!data || typeof data !== 'object') return null;

  const value = data as Record<string, unknown>;

  if (value.action === 'OPEN_MATCH' && isDecimalId(value.matchId)) {
    return { action: 'OPEN_MATCH', matchId: value.matchId };
  }

  if (value.action === 'OPEN_TEAM' && isDecimalId(value.teamId)) {
    return { action: 'OPEN_TEAM', teamId: value.teamId };
  }

  if (value.action === 'OPEN_WATCHLIST') {
    return { action: 'OPEN_WATCHLIST' };
  }

  return null;
}

function isDecimalId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9]+$/.test(value);
}
```

Только после parse выполняется `router.push`. Private route проверяет текущую сессию; гость видит вход, а не чужие данные.

## 3. Cold start и foreground

Уведомление может прийти:

- когда приложение активно;
- в фоне;
- при завершённом процессе, вызывая cold start.

Навигация выполняется только после готовности auth bootstrap и router. Сохраните одно pending action в памяти, дождитесь готовности, проверьте его и затем откройте экран. Не выполняйте одну и ту же навигацию одновременно из initial response и listener.

Foreground notification не обязано показывать системный banner; поведение задаётся notification handler и продуктовым решением. Если пользователь уже смотрит тот же матч, достаточно обновить query или показать небольшой in-app banner.

## 4. Universal/app links

В production настройте:

- HTTPS-домен приложения;
- iOS associated domains и файл association;
- Android intent filters и Digital Asset Links;
- строго определённые пути, например `/auth/callback` и `/matches/:id`;
- staging и production domains/credentials отдельно.

Custom scheme оставьте development fallback. Проверяйте ссылки на реальном устройстве после production-like сборки.

## 5. Logout текущего устройства

Порядок должен давать безопасный локальный результат даже при плохой сети:

```text
1. запретить новые private requests
2. попытаться revoke session и push installation на backend
3. удалить refresh token из SecureStore
4. очистить access token
5. cancel/remove private query cache
6. очистить pending private deep link
7. auth state = guest
8. если server revoke не подтверждён, сохранить безопасный retry marker
```

Не блокируйте локальный logout навечно из-за недоступного backend. Короткий access token истечёт, а refresh rotation/reuse controls ограничивают риск. Для высокорискового продукта политика может быть строже.

## 6. Удаление аккаунта

`DELETE /v1/me` — не просто logout:

```text
1. повторное подтверждение намерения
2. backend помечает user = deleting
3. мгновенно отзывает sessions и отключает push devices
4. создаёт deletion job/outbox
5. удаляет/anonymizes watchlist, preferences, steam link и личные события
6. соблюдает documented retention/legal exceptions
7. user становится deleted
8. mobile очищает local private data
```

Физическое удаление может быть асинхронным, но доступ прекращается сразу. Job идемпотентен и имеет audit без сохранения удаляемых payload.

Публичные данные профессионального матча не обязательно являются данными app-аккаунта. Удаляется связь пользователя приложения, а не исторический факт матча; это должно быть объяснено privacy policy и проверено юристом для целевых юрисдикций.

## 7. Security checklist

- HTTPS везде вне local development.
- OpenID callback проверяется сервером.
- State/code случайны, hash в БД, короткий TTL, одноразовые.
- Redirect URI из allowlist.
- Токены отсутствуют в URL и логах.
- Refresh rotation/reuse test проходит при concurrency.
- SecureStore используется для refresh.
- Private cache очищается при identity change.
- `/me` игнорирует userId из body.
- Watchlist защищён ownership check/tenant predicate.
- Push payload минимален и allowlisted.
- Disabled/invalid device не получает новые push.
- Rate limits и audit включены.
- Secrets вращаемы и не встроены в приложение.
- Dependency/security updates идут через отдельный регулярный процесс.

## 8. Security-тесты

Попробуйте:

1. подменить state;
2. второй раз использовать exchange code;
3. заменить `claimed_id` без валидной provider verification;
4. передать внешний redirect domain;
5. использовать старый refresh после rotation;
6. открыть watchlist другого user по entry ID;
7. отправить push action с `https://attacker.example`;
8. нажать один notification дважды;
9. logout без сети;
10. войти user B после user A и проверить cache leakage;
11. вызвать deletion job дважды;
12. найти raw token в логах — тест должен подтвердить, что его нет.

Для production проведите независимый security review auth flow. Этот курс задаёт архитектуру, но не заменяет аудит реализации и актуальных зависимостей.

[Предыдущая глава](08-notification-pipeline.md) · [Оглавление](README.md) · [Следующая глава](10-final-auth-notifications-lab.md)

