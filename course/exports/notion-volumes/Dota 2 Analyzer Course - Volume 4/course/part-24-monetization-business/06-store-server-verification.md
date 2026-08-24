# Глава 6. Apple/Google server verification и lifecycle

## Результат главы

Вы подключите official server APIs и notifications так, чтобы renewal, refund, grace period и revoke обновляли entitlement даже без открытия приложения.

## 1. Notification — сигнал, не безусловная истина

Безопасная схема:

```text
store notification
  -> verify signature/authenticity
  -> persist unique event
  -> acknowledge HTTP quickly
  -> background processor
  -> fetch authoritative subscription state
  -> validate app/product/environment
  -> update transaction + entitlement atomically
  -> metrics/audit
```

Обработчик допускает duplicate, out-of-order и delayed delivery. Нельзя просто переключать `isPro` по `eventType` без получения текущего состояния.

## 2. Apple

Используйте актуальные App Store Server API и App Store Server Notifications V2. Вам понадобятся App Store Connect issuer/key credentials согласно документации, безопасно хранимые в Secrets Manager.

Проверяйте:

- signed payload/JWS chain и claims;
- bundle ID;
- environment Sandbox/Production;
- product ID;
- original transaction relation;
- purchase/expiration/revocation dates;
- notification UUID для idempotency;
- ответы official history/status endpoints.

Не принимайте Sandbox transaction как Production entitlement.

## 3. Google

Backend получает purchase token от app и проверяет через Google Play Developer API для вашего package/product. Real-time developer notifications обычно доставляются через Pub/Sub и сообщают, что состояние изменилось; затем backend вызывает official API.

Проверяйте:

- package name;
- product/subscription ID и base plan;
- purchase token;
- payment/acknowledgement/expiry state;
- cancellation/refund/revoke;
- linked purchase token при смене plan, если применимо;
- уникальность message/event processing.

Service account имеет минимум нужных Play Console/API прав. Не используйте owner credentials в runtime.

## 4. Adapter interface

```ts
type VerifiedSubscription = {
  source: 'apple' | 'google';
  externalId: string;
  originalReference: string | null;
  productId: string;
  environment: 'sandbox' | 'production';
  purchasedAt: Date;
  expiresAt: Date;
  graceEndsAt: Date | null;
  revokedAt: Date | null;
  willRenew: boolean;
};

interface StoreVerifier {
  verifyPurchase(reference: string): Promise<VerifiedSubscription>;
  verifyNotification(body: unknown, headers: Headers): Promise<{ eventId: string; reference: string }>;
}
```

Store-specific code преобразует разный payload в один domain type. Не теряйте raw status, нужный для support/audit, но ограничьте его хранение.

## 5. Idempotent processor

Псевдокод:

```ts
await db.transaction(async (tx) => {
  const inserted = await tx.billingEvent.insertIfAbsent(event.id);
  if (!inserted) return;

  const verified = await verifier.verifyPurchase(event.reference);
  validateCatalogAndEnvironment(verified);
  await tx.storeTransaction.upsert(toTransaction(verified));
  await tx.userEntitlement.upsert(project(verified, now));
  await tx.billingEvent.markProcessed(event.id);
});
```

Внешний API-вызов внутри DB transaction может держать соединение/lock слишком долго. В реальном коде сначала получите и проверьте official state, затем откройте короткую транзакцию с optimistic/version checks. Псевдокод показывает атомарность записи, не рекомендует долгий network call в транзакции.

## 6. Lifecycle

Минимальные состояния:

```text
active
cancelled-but-active-until-expiry
grace/billing-retry
expired
refunded/revoked
pending
unknown-needs-reconciliation
```

Правила grace period зависят от store configuration. Не обещайте пользователю срок из хардкода.

## 7. Reconciliation

Notifications могут потеряться или обработчик может падать. Ежедневный job:

- выбирает active/grace subscriptions;
- запрашивает official current state с rate limiting;
- исправляет projection;
- сообщает о несоответствиях;
- повторяет transient failure;
- не продлевает entitlement при неизвестном состоянии бесконечно.

У вас должна быть метрика `billing_reconciliation_mismatch_total`.

## 8. Security

- TLS only;
- signature/auth verification до доверия полям;
- request size/rate limit;
- secrets rotation;
- raw payload redaction/retention;
- не логировать tokens/JWS;
- SSRF-safe fixed store endpoints;
- replay protection через event ID;
- test/prod credentials и database разделены;
- audit admin grants.

## 9. Support tools

Support screen показывает без секретов:

```text
user ID
entitlement/status/validUntil
store platform
masked transaction reference
last verified at
last notification/reconciliation result
```

Кнопка `reverify` запускает контролируемый job с audit, а не меняет status вручную.

## Практика

1. Создайте Apple/Google verifier adapters через mocks.
2. Подключите sandbox official APIs.
3. Отправьте duplicate/out-of-order notifications.
4. Смоделируйте renewal, grace, refund/revoke и expiry.
5. Отключите webhook и докажите исправление reconciliation.
6. Проведите credential rotation.

## Готово, если

- signature/environment/app/product проверяются;
- event duplicate безопасен;
- current state берётся с official API;
- lifecycle покрыт тестами;
- reconciliation восстанавливает пропуски;
- support может reverify без ручного `isPro`;
- secrets/purchase evidence защищены.

## Официальные материалы

- [Apple App Store Server API](https://developer.apple.com/documentation/appstoreserverapi/)
- [Apple App Store Server Notifications V2](https://developer.apple.com/documentation/AppStoreServerNotifications/App-Store-Server-Notifications-V2)
- [Google Play Billing security](https://developer.android.com/google/play/billing/security)
- [Google Play Billing backend integration](https://developer.android.com/google/play/billing/backend)

