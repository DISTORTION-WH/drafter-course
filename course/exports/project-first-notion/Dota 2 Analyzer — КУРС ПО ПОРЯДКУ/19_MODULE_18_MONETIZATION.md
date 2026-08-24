# Модуль 18. Подписка, entitlement и честная монетизация

## Результат

Появится Freemium-модель с одной entitlement `pro`, месячным и годовым store products, покупкой/restore в mobile и server-side проверкой доступа. Refund, expiration и renewal попадут в backend через проверяемые RevenueCat webhooks.

## 1. Что бесплатно, а что Pro

Первый release должен быть полезен без оплаты.

Free:

- список и карточки матчей;
- базовая мета за 30 дней;
- поиск;
- до 3 команд в watchlist;
- карточки команд/игроков.

Pro:

- расширенные периоды/patch filters;
- сравнение игроков;
- watchlist до 25 команд;
- push по результатам и выбранным событиям;
- экспорт агрегированной аналитики, когда он реализован.

Не продавайте «AI-прогноз» или live-функции, которых код не выполняет. Подписка обязана давать продолжающуюся ценность, а цена/период/auto-renew/cancel должны быть показаны до purchase.

## 2. Один catalog, одна entitlement

Создайте в App Store Connect и Google Play:

```text
entitlement в RevenueCat: pro
offering: default
iOS/Android monthly product: dota_analyzer_pro_monthly
iOS/Android yearly product:  dota_analyzer_pro_yearly
```

Свяжите оба store products с RevenueCat entitlement `pro` и current offering. Идентификаторы — contract между consoles и code; зафиксируйте их в `docs/billing-catalog.md`.

В API env schema добавьте webhook secrets, а в worker env schema — secret API key:

```ts
REVENUECAT_WEBHOOK_AUTH: z.string().min(32),
REVENUECAT_WEBHOOK_SIGNING_SECRET: z.string().min(32),
```

```ts
REVENUECAT_SECRET_API_KEY: z.string().min(20),
```

Создайте в Secrets Manager secret `dota/<stage>/billing` с этими тремя JSON keys, импортируйте его в CDK через `Secret.fromSecretNameV2`: webhook keys передайте API task, API key — worker task через `ecs.Secret.fromSecretsManager`. Не выводите values через `CfnOutput` и не помещайте их в EAS. Mobile получает только отдельные public SDK keys.

Для цифровых функций mobile используйте store billing в соответствии с актуальными правилами storefront/страны. Не добавляйте внешнюю оплату по общей инструкции: региональные исключения и программы меняются, их отдельно проверяют перед релизом.

## 3. Инициализация RevenueCat только после известного user

Установите `react-native-purchases`. Покупки тестируются development/store build на физическом устройстве, не в Expo Go.

Создайте `apps/mobile/src/billing/configure-purchases.ts`:

```ts
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

let configuredForUserId: string | null = null;

export async function configurePurchases(userId: string): Promise<void> {
  if (configuredForUserId === userId) return;

  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  });
  if (!apiKey) throw new Error('RevenueCat public SDK key is missing');

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);

  if (configuredForUserId === null) {
    Purchases.configure({ apiKey, appUserID: userId });
  } else {
    await Purchases.logIn(userId);
  }
  configuredForUserId = userId;
}
```

- `configuredForUserId` предотвращает повторную configure на каждом render.
- `userId` — внутренний непредсказуемый ID из backend, не email и не Steam display name.
- `Platform.select` выбирает public SDK key текущего store.
- Public RevenueCat SDK key допустим в app; secret backend key — нет.
- При переключении authenticated account вызывается `logIn` нового ID.

## 4. Purchase и локальное отображение entitlement

Paywall загружает current offering:

```ts
const offerings = await Purchases.getOfferings();
const currentOffering = offerings.current;
if (!currentOffering) throw new Error('Current offering is unavailable');
```

Показывайте localized price из package/store, не hardcoded `$4.99`. Purchase function:

```ts
export async function purchasePro(
  selectedPackage: PurchasesPackage,
): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
  return customerInfo.entitlements.active.pro !== undefined;
}
```

- `selectedPackage` — monthly или annual package, выбранный user.
- `customerInfo` — актуальное состояние после store flow.
- Возвращаемый boolean обновляет UI, но не является единственной защитой server premium endpoint.
- User cancellation обрабатывайте отдельно и не показывайте как красную системную ошибку.

Hook `useProEntitlement` вызывает `Purchases.getCustomerInfo()` и проверяет `active.pro`. На paywall обязательны:

- название/ценность;
- полная localized цена и billing period;
- auto-renew disclosure;
- links Terms/Privacy;
- Purchase;
- Restore purchases;
- Manage subscription после покупки.

## 5. Backend entitlement — защита платных API

Добавьте Prisma models:

```prisma
model UserEntitlement {
  userId        String   @id
  entitlementId String
  active        Boolean  @default(false)
  productId     String?
  expiresAt     DateTime?
  environment   String
  updatedAt     DateTime @updatedAt
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model RevenueCatWebhookEvent {
  id          String    @id
  appUserId   String
  type        String
  environment String
  receivedAt  DateTime  @default(now())
  processedAt DateTime?
}
```

В существующую модель `User` добавьте обратное поле `entitlement UserEntitlement?`; без него Prisma relation не пройдёт validation.

Premium guard:

```ts
const entitlement = await prisma.userEntitlement.findUnique({
  where: { userId: request.user.id },
});

if (!entitlement?.active || entitlement.entitlementId !== 'pro') {
  throw new ForbiddenException('Pro subscription required');
}
```

Mobile может скрыть кнопку для удобства, но только backend guard защищает расширенный comparison/export. Не принимайте `isPro: true` из client.

## 6. Проверить webhook до parsing

В RevenueCat dashboard задайте HTTPS webhook, Authorization header и HMAC signing secret. Fastify route должен иметь доступ к raw body.

Установите и зарегистрируйте raw-body plugin в `main.ts` до routes:

```powershell
pnpm --filter @dota/api add fastify-raw-body
```

```ts
import rawBody from 'fastify-raw-body';

await app.register(rawBody, {
  field: 'rawBody',
  global: true,
  encoding: 'utf8',
  runFirst: true,
});
```

API уже ограничивает body размером 1 MB. В webhook controller получите `request.rawBody` как строку и проверяйте её до использования parsed body. Не делайте повторный `JSON.stringify(request.body)`: подпись рассчитана над исходными bytes.

Создайте `verify-revenuecat-webhook.ts`:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyRevenueCatWebhook(
  rawBody: string,
  signatureHeader: string,
  signingSecret: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
): void {
  const fields = Object.fromEntries(
    signatureHeader.split(',').map((part) => part.split('=', 2)),
  );
  const timestamp = Number(fields.t);
  const received = fields.v1 ?? '';

  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 300) {
    throw new Error('Stale webhook signature');
  }

  const expected = createHmac('sha256', signingSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new Error('Invalid webhook signature');
  }
}
```

- `fields` разбирает `t=...,v1=...`.
- `timestamp` используется в payload подписи и ограничивает replay окном 5 минут.
- `expected` вычисляется над точными bytes body до `JSON.parse`.
- Проверка длины обязательна перед `timingSafeEqual`.
- Также сравнивайте configured Authorization header.

После проверки распарсьте Zod schema минимум для `event.id`, `event.type`, `event.app_user_id`, `event.environment`. Сделайте `RevenueCatWebhookEvent.create`; при unique conflict того же event ID верните 200. API не нужен Redis connection: сама непрочитанная database row является надёжным outbox и сохраняется до обработки.

Добавьте worker scheduler `reconcile-revenuecat-events` раз в минуту. Handler выбирает до 50 rows с `processedAt: null`, для каждой вызывает reconciliation, затем ставит `processedAt`. Если process упал, строка останется pending и попадёт в следующий запуск. Получение текущего состояния надёжнее ручного предположения по одному event type, особенно при refund, transfer и out-of-order delivery.

Реализуйте consumer через проверяемый response:

```ts
const revenueCatSubscriberSchema = z.object({
  subscriber: z.object({
    entitlements: z.record(
      z.string(),
      z.object({
        expires_date: z.string().datetime().nullable(),
        product_identifier: z.string().min(1),
      }),
    ),
  }),
});

export async function reconcileProEntitlement(
  prisma: PrismaClient,
  appUserId: string,
  environment: 'SANDBOX' | 'PRODUCTION',
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: appUserId } });
  if (!user) return;

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: {
        authorization: `Bearer ${workerEnv.REVENUECAT_SECRET_API_KEY}`,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(`RevenueCat returned HTTP ${response.status}`);
  }

  const json: unknown = await response.json();
  const subscriber = revenueCatSubscriberSchema.parse(json).subscriber;
  const pro = subscriber.entitlements.pro;
  const expiresAt = pro?.expires_date ? new Date(pro.expires_date) : null;
  const active = Boolean(pro) && (expiresAt === null || expiresAt > new Date());

  await prisma.userEntitlement.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      entitlementId: 'pro',
      active,
      productId: pro?.product_identifier ?? null,
      expiresAt,
      environment,
    },
    update: {
      active,
      productId: pro?.product_identifier ?? null,
      expiresAt,
      environment,
    },
  });
}
```

`user` не даёт webhook создать локального пользователя по произвольному external ID. `pro` может отсутствовать. `expiresAt === null` считается бессрочным только когда сам `pro` существует благодаря первой части `Boolean(pro)`. Job отмечает webhook `processedAt` только после успешного upsert.

## 7. Ваша аналогичная задача: Restore purchases

Добавьте рабочую кнопку, необходимую для store review и восстановления после переустановки.

Требования:

1. Function называется `restoreProPurchase`.
2. Вызывает `Purchases.restorePurchases()` только по явному нажатию.
3. Переменная результата `customerInfo`.
4. Вычисляет `isPro` из `customerInfo.entitlements.active.pro`.
5. Инвалидирует query `['me', 'entitlement']`.
6. Если `isPro`, показывает «Покупка восстановлена»; иначе «Активная подписка не найдена».
7. После restore backend получает webhook/reconciliation; до этого server-only Pro route может кратко оставаться закрытым, UI показывает синхронизацию.

Эталон функции:

```ts
export async function restoreProPurchase(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo.entitlements.active.pro !== undefined;
}
```

Добавьте test/mocks для active, inactive, cancellation/network error. Не вызывайте restore автоматически при каждом старте — это пользовательское действие и может вызвать store authentication.

## 8. Проверка реальных billing состояний

Пройдите sandbox cases на iOS и Google Play test track:

- monthly purchase;
- annual purchase;
- user cancel;
- renewal;
- expiration;
- billing issue/grace period;
- refund/revocation;
- reinstall + restore;
- второй device с тем же account;
- переключение вашего user account;
- duplicate/out-of-order webhook;
- sandbox event не включает production entitlement.

```powershell
pnpm --filter @dota/database exec prisma migrate dev --name add_entitlements
pnpm -r typecheck
pnpm -r test
git add apps packages docs
git commit -m "feat(billing): add store subscriptions and server entitlements"
```

Актуальные первоисточники: [RevenueCat React Native](https://www.revenuecat.com/docs/getting-started/installation/reactnative), [RevenueCat webhooks](https://www.revenuecat.com/docs/integrations/webhooks), [Apple subscriptions/review](https://developer.apple.com/app-store/review/guidelines/), [Google Play subscription policy](https://support.google.com/googleplay/android-developer/answer/9900533).

[Следующий модуль](20_MODULE_19_LAUNCH.md)
