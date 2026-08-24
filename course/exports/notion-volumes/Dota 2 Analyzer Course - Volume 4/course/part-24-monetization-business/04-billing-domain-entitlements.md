# Глава 4. Billing domain и серверный entitlement

## Результат главы

Вы построите независимую от платформы модель доступа. Mobile client просит покупку, store взимает оплату, backend проверяет её и только backend решает, есть ли `pro`.

## 1. Главный поток

```text
mobile -> Apple/Google purchase UI
store -> purchase result/token
mobile -> backend: attach purchase evidence
backend -> official store server API: verify
backend -> transaction/event tables
backend -> entitlement projection
mobile -> GET /v1/me/entitlements
```

Флаг `isPro=true` из клиента никогда не является доказательством покупки. Async store notifications обновляют lifecycle, но backend также выполняет authoritative lookup.

## 2. Термины

- product — SKU в App Store/Play Console;
- offer — base plan/trial/intro условия;
- transaction — конкретное событие покупки/renewal/refund;
- subscription — lifecycle серии платежей;
- entitlement — право пользователя на функцию;
- purchase token/original transaction ID — store identifier, не пароль пользователя, но чувствительный billing identifier;
- source of truth — проверенное состояние store + ваша проекция, не client cache.

## 3. Entitlement matrix

```ts
type EntitlementKey = 'pro';

type Entitlement = {
  key: EntitlementKey;
  status: 'active' | 'grace' | 'expired' | 'revoked';
  source: 'apple' | 'google' | 'admin';
  validUntil: Date | null;
};
```

`admin` разрешён только для support/test grants с actor, reason и expiry. Никогда не редактируйте production row вручную без audit.

## 4. Схема данных

Упрощённо:

```prisma
enum StorePlatform {
  APPLE
  GOOGLE
}

model StoreTransaction {
  id                    String        @id @default(cuid())
  platform              StorePlatform
  storeTransactionId    String
  originalReference     String?
  productId             String
  environment           String
  purchasedAt           DateTime?
  expiresAt             DateTime?
  status                String
  userId                String?
  rawObjectKey           String?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  @@unique([platform, storeTransactionId])
  @@index([userId, status])
}

model BillingEvent {
  id               String        @id @default(cuid())
  platform         StorePlatform
  externalEventId  String
  eventType        String
  receivedAt       DateTime      @default(now())
  processedAt      DateTime?
  processingError  String?

  @@unique([platform, externalEventId])
}

model UserEntitlement {
  id         String    @id @default(cuid())
  userId     String
  key        String
  status     String
  validUntil DateTime?
  source     String
  version    Int       @default(1)
  updatedAt  DateTime  @updatedAt

  @@unique([userId, key])
}
```

Не сохраняйте полный raw payload в PostgreSQL бессрочно. Если он нужен для audit, шифруйте в private S3 с retention, ограниченным доступом и redaction.

## 5. Product catalog

Храните mapping server-side:

```ts
const catalog = {
  apple: {
    'com.yourcompany.dotaanalyzer.pro.monthly': 'pro',
  },
  google: {
    'pro_monthly': 'pro',
  },
} as const;
```

Backend отклоняет неизвестный product ID. Цена не определяет entitlement: один product может иметь локальные цены/offer phases.

## 6. Attach purchase endpoint

```text
POST /v1/billing/purchases/attach
Authorization: user token
Idempotency-Key: random UUID

{
  platform: "apple" | "google",
  productId: "...",
  transactionReference/purchaseToken: "..."
}
```

Backend:

1. проверяет auth и schema;
2. rate limits;
3. проверяет environment/product allowlist;
4. запрашивает official store API;
5. убеждается в app/package/bundle identity;
6. связывает transaction с user атомарно;
7. пересчитывает entitlement;
8. возвращает server projection.

Нельзя разрешить один purchase token нескольким независимым аккаунтам без явно спроектированной family/account-linking модели.

## 7. Projection, а не разрозненные `if`

Одна функция вычисляет доступ:

```ts
function projectEntitlement(input: VerifiedSubscription): Entitlement {
  if (input.revokedAt) {
    return { key: 'pro', status: 'revoked', source: input.source, validUntil: null };
  }
  if (input.inGracePeriod) {
    return { key: 'pro', status: 'grace', source: input.source, validUntil: input.graceEndsAt };
  }
  if (input.expiresAt > new Date()) {
    return { key: 'pro', status: 'active', source: input.source, validUntil: input.expiresAt };
  }
  return { key: 'pro', status: 'expired', source: input.source, validUntil: input.expiresAt };
}
```

В production не вызывайте `new Date()` внутри pure function: передайте `now`, чтобы тест был детерминирован.

## 8. Enforcement

UI скрывает/показывает кнопку для удобства, но API проверяет entitlement:

```ts
await entitlementService.require(user.id, 'pro');
return reportService.createAdvancedReport(input);
```

Иначе модифицированный client вызовет premium endpoint напрямую.

## 9. Account deletion

Удаление profile не должно подделывать отмену store subscription. Перед confirm объясните:

- где управлять подпиской;
- будет ли profile удалён сейчас;
- какие billing records сохраняются по обязательствам;
- как восстановить purchase на новом аккаунте, если это разрешено вашей политикой.

Не сохраняйте user profile только потому, что store transaction существует.

## Практика

1. Создайте schema и миграцию.
2. Напишите unit tests projection для active/grace/expired/refunded/revoked.
3. Реализуйте attach endpoint с fake store adapter.
4. Повторите событие 10 раз и получите один transaction.
5. Проверьте server-side Pro endpoint.
6. Напишите reconciliation job.

## Готово, если

- client не может сам выдать Pro;
- product allowlist server-side;
- events/transactions идемпотентны;
- entitlement — единая проекция;
- premium API защищён;
- delete account и cancel subscription различаются;
- reconciliation исправляет пропущенное notification.

