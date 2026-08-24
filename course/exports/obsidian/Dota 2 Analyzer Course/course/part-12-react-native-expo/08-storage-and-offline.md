# Глава 8. SecureStore, persistence и offline

[← Глава 7](07-zustand-client-state.md) · [Оглавление](README.md) · [Глава 9 →](09-charts-accessibility-testing.md)

## Выбор storage по данным

| Данные | Storage |
|---|---|
| access/refresh token | SecureStore с server rotation policy |
| theme/filter preference | AsyncStorage/SQLite key-value |
| query cache | bounded non-secret persistence |
| большие offline datasets | SQLite с schema/migrations |
| provider API key | нигде на mobile |
| незаменимые данные | server source of truth/sync |

SecureStore не предназначен для больших JSON/cache. Официальная документация предупреждает о platform limits и о том, что это не единственный источник незаменимых данных.

## Token storage interface

```ts
export interface TokenStorage {
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  clear(): Promise<void>;
}
```

Expo implementation использует `SecureStore.getItemAsync/setItemAsync/deleteItemAsync`. Components не вызывают storage напрямую.

## Access и refresh

Конкретная auth-схема будет в части 14. Базовая граница:

- access token короткоживущий, предпочтительно memory;
- refresh token в SecureStore;
- token rotation на server;
- logout/revocation;
- storage read error не считается «точно logged out» без policy;
- biometric change может сделать protected value недоступным.

Не logируйте token/error с token value.

## Hydration

До чтения persisted preferences UI может показать default и затем мигнуть. Добавьте hydration status/splash strategy:

```ts
type HydrationState = 'pending' | 'ready' | 'failed';
```

Не держите splash бесконечно: timeout/fallback/retry.

## Query cache persistence

Persist только successful public queries с max age и storage size budget. Не сохраняйте:

- error objects;
- secrets/authorization headers;
- user-private data без encryption/product policy;
- бесконечную историю pages;
- incompatible cache version.

TanStack persistence packages и persister выбирайте по актуальной official documentation. Storage parser считает JSON `unknown`.

## Offline UX

Состояния:

```text
offline + cache есть → показать данные + “обновлено тогда-то”
offline + cache нет → offline empty/error с retry
online вернулся → bounded refetch stale queries
mutation offline → либо запретить, либо durable outbox; не притворяться success
```

Наше текущее приложение read-heavy, поэтому offline read проще. Favorites account mutation появится позже.

## SQLite

Когда cache/история становится большой и queryable, используйте `expo-sqlite`: schema version, migrations, transactions, indexes, retention. Не переносите PostgreSQL schema один к одному; mobile cache — projection с ограниченным сроком.

## Удаление данных

Logout/account deletion очищает user-specific SecureStore, persisted store и private query cache. Uninstall behavior различается: нельзя строить security rule на предположении, что всё всегда удалилось одинаково на iOS/Android.

## Практика

Реализуйте fake TokenStorage и SecureStore adapter tests через mock boundary. Создайте corrupted persisted preferences и убедитесь, что parser делает reset/migration, а app не падает.

## Самопроверка

- [ ] Storage выбран по чувствительности/размеру/lifecycle.
- [ ] SecureStore не содержит cache/provider key.
- [ ] Hydration имеет pending/failure path.
- [ ] Offline UI показывает freshness.
- [ ] Logout очищает user-specific stores/query data.
