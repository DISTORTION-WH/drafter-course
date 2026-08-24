# Глава 5. Покупка и восстановление в React Native

## Результат главы

Вы подключите поддерживаемую IAP-библиотеку в Expo development build, реализуете загрузку продуктов, покупку, pending/cancel/error и restore.

## 1. Выбор библиотеки

Expo не предоставляет покупки внутри Expo Go. Официальное руководство Expo указывает совместимые сторонние решения, например `react-native-purchases` или `react-native-iap`. Выбор:

- прямое StoreKit/Play Billing управление через library;
- subscription infrastructure provider, который упрощает cross-platform lifecycle, но добавляет vendor, цену, data processing и необходимость server integration.

Проверьте текущую поддержку Expo SDK, StoreKit 2, Play Billing version, лицензии, privacy и server webhooks. Курс использует абстракцию, чтобы библиотеку можно было заменить.

## 2. Billing adapter

```ts
export type StoreProduct = {
  id: string;
  title: string;
  description: string;
  localizedPrice: string;
};

export type PurchaseResult = {
  platform: 'apple' | 'google';
  productId: string;
  storeReference: string;
};

export interface BillingClient {
  connect(): Promise<void>;
  getProducts(ids: string[]): Promise<StoreProduct[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult[]>;
  disconnect(): Promise<void>;
}
```

Экран зависит от вашего interface, а platform SDK скрыт в adapter. `Promise` означает асинхронную операцию: пользователь может отменить окно, сеть может исчезнуть, store может вернуть pending.

## 3. Product IDs

Product ID берётся из typed config для platform/environment, не из пользовательского input:

```ts
const productIds = Platform.select({
  ios: ['com.yourcompany.dotaanalyzer.pro.monthly'],
  android: ['pro_monthly'],
  default: [],
});
```

Sandbox products и production products могут иметь разные статусы доступности. Если список пуст, покажите retry/support, а не фальшивую цену.

## 4. State machine paywall

```ts
type PaywallState =
  | { kind: 'loading' }
  | { kind: 'ready'; products: StoreProduct[] }
  | { kind: 'purchasing'; productId: string }
  | { kind: 'verifying' }
  | { kind: 'success' }
  | { kind: 'error'; message: string; retryable: boolean };
```

Не храните пять несогласованных boolean вроде `isLoading`, `isBuying`, `hasError`. Union не позволяет быть одновременно `success` и `purchasing`.

## 5. Purchase flow

```ts
async function buy(productId: string): Promise<void> {
  setState({ kind: 'purchasing', productId });
  try {
    const purchase = await billingClient.purchase(productId);
    setState({ kind: 'verifying' });
    await api.attachPurchase(purchase, createIdempotencyKey());
    await entitlements.refetch();
    setState({ kind: 'success' });
  } catch (error) {
    setState(mapBillingError(error));
  }
}
```

Реальная библиотека может требовать acknowledgement/finish transaction в определённый момент. Делайте это строго по актуальной документации: слишком раннее завершение до надёжной передачи может потерять access signal, слишком позднее — вызвать refund/re-delivery.

## 6. Ошибки как разные исходы

- user cancelled — не показывать красную «аварию»;
- pending — объяснить, что покупка ожидает подтверждения;
- network unavailable — retry, не новая бесконечная покупка;
- product unavailable — config/store availability/support;
- already owned — предложить restore;
- verification delayed — не выдавать доступ client-side, показать refresh/status;
- store unavailable — сохранить UI usable в free mode.

Логируйте error code, platform и build, но не полный receipt/token.

## 7. Restore purchases

Кнопка видима на paywall/settings. Flow:

1. запросить restore у store;
2. отправить references backend;
3. backend authoritative verifies;
4. обновить entitlements;
5. объяснить, если purchase связан с другим account и policy запрещает перенос;
6. не брать новую оплату.

Restore должен работать после переустановки и на новом устройстве того же store account в пределах правил.

## 8. Manage subscription

Откройте официальный platform route/manage page. Не пишите «отменено», пока store не подтвердил состояние. Отмена auto-renew обычно сохраняет entitlement до expiration.

## 9. Тестовая матрица

```text
iOS sandbox: buy, cancel, renew, expire, billing retry, refund/revoke, restore
Google license tester: buy, pending, renew, expire, grace, pause if applicable, revoke, restore
app: reinstall, logout/login, second account, offline, duplicate callback
backend: missing/out-of-order/duplicate notifications
```

Store sandbox время ускорено и поведение отличается от production; сверяйте актуальные docs.

## Практика

1. Выберите library/provider через ADR.
2. Создайте development build — не Expo Go.
3. Загрузите localized products.
4. Реализуйте state machine и error mapping.
5. Выполните sandbox buy/restore/reinstall.
6. Подтвердите, что modified/free client не вызывает Pro API.

## Готово, если

- цена приходит из store;
- purchase проходит backend verification;
- cancel/pending/error различаются;
- restore работает;
- Pro берётся из server entitlement;
- receipts/tokens не попадают в analytics/logs;
- IAP тестируется в native development/store build.

## Официальные материалы

- [Expo in-app purchases](https://docs.expo.dev/guides/in-app-purchases/)
- [Expo development builds](https://docs.expo.dev/develop/development-builds/create-a-build/)

