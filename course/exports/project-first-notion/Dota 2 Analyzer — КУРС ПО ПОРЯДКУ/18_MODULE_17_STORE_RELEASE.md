# Модуль 17. TestFlight, Google Play и обязательные страницы

## Результат

Один и тот же проверенный commit попадёт в store beta tracks, а затем в production. Приложение получит постоянные identifiers, privacy/support/delete-account URLs, review notes, screenshots и управляемые update channels.

## 1. Постоянные identifiers до первой загрузки

В `apps/mobile/app.config.ts`:

```ts
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Dota Analyzer',
  slug: 'dota-analyzer',
  version: '1.0.0',
  scheme: 'dotaanalyzer',
  runtimeVersion: { policy: 'appVersion' },
  ios: {
    bundleIdentifier: 'com.yourcompany.dotaanalyzer',
    supportsTablet: true,
  },
  android: {
    package: 'com.yourcompany.dotaanalyzer',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-notifications',
  ],
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
};

export default config;
```

- `bundleIdentifier` и `package` — постоянная identity в stores. После публикации их не переименовывают как обычный title.
- `version` видит пользователь.
- iOS build number и Android versionCode растут при каждой binary upload.
- `runtimeVersion: appVersion` не даёт отправить JavaScript update бинарнику с несовместимыми native modules.
- Замените `yourcompany` на принадлежащий вам reverse-domain до первого store app.

## 2. Три реально используемых build profile

Выполните `eas build:configure`, затем оставьте в `apps/mobile/eas.json`:

```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "staging": {
      "channel": "staging",
      "environment": "preview",
      "autoIncrement": true
    },
    "production": {
      "channel": "production",
      "environment": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

Не создавайте отдельный profile для каждого разработчика. Эти три соответствуют реальным средам:

- `development` — native development build;
- `staging` — TestFlight/Google Play testing с staging API;
- `production` — store release с production API.

Создайте EAS environment variables `EXPO_PUBLIC_API_URL`, Sentry DSN и public RevenueCat SDK keys отдельно для preview/production. Server secrets в EAS mobile environment не помещаются.

## 3. Public legal/support site — часть продукта

Создайте `apps/legal-site` со статическими страницами:

```text
privacy.html
terms.html
support.html
delete-account.html
```

Добавьте в CDK stack реальный private S3 + CloudFront hosting (импорты `s3`, `cloudfront`, `cloudfront-origins`, `s3-deployment`):

```ts
const legalBucket = new s3.Bucket(this, 'LegalBucket', {
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  encryption: s3.BucketEncryption.S3_MANAGED,
  enforceSSL: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

const legalDistribution = new cloudfront.Distribution(this, 'LegalDistribution', {
  defaultRootObject: 'privacy.html',
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(legalBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
});

new s3deploy.BucketDeployment(this, 'DeployLegalSite', {
  destinationBucket: legalBucket,
  sources: [s3deploy.Source.asset('../apps/legal-site')],
  distribution: legalDistribution,
  distributionPaths: ['/*'],
});

new cdk.CfnOutput(this, 'PrivacyUrl', {
  value: `https://${legalDistribution.distributionDomainName}/privacy.html`,
});
```

`legalBucket` никогда не публичный; origin access control позволяет чтение только CloudFront. `BucketDeployment` загружает те же HTML files при `cdk deploy`, а `distributionPaths` сбрасывает старый cache. Сначала используйте выданный HTTPS CloudFront URL в stores; собственный `www` domain добавляйте только когда действительно зарегистрировали отдельный CloudFront certificate в `us-east-1`.

Страницы должны честно описывать именно реализованное:

- какие match/provider data хранится;
- SteamID, display name/avatar и цель обработки;
- watchlist, push token, purchase entitlement, diagnostics;
- Sentry/hosting/subscription processors;
- сроки хранения и удаление;
- контакт владельца/оператора;
- возрастные и территориальные ограничения, если применимы;
- как запросить экспорт/удаление;
- условия подписки, renewal, cancel, refund routes;
- disclaimer: аналитика историческая и не гарантирует результат матча/ставки.

Не копируйте политику чужого приложения. Перед продажами и запуском в выбранных странах отдайте фактический документ профильному юристу. Курс не может определить вашу юрисдикцию и налоговый статус.

## 4. Удаление аккаунта из приложения и web

Добавьте protected `DELETE /v1/me`. Service:

1. отзывает все refresh sessions;
2. удаляет/анонимизирует user-owned records в соответствии с принятой retention policy;
3. удаляет watchlist и push devices через cascade;
4. возвращает `{ deleted: true }`;
5. mobile очищает SecureStore и cache.

Store subscription не обязательно отменяется от удаления вашего account. Перед подтверждением явно покажите ссылку управления подпиской и объясните это; entitlement после удаления больше не даёт доступ в вашем сервисе.

`delete-account.html` даёт тот же процесс человеку без установленного приложения: Steam login или support request с безопасной проверкой владения. Не просите прислать password/refresh token по email.

## 5. Подготовить store records

Google Play Console:

1. создайте app с окончательным Android package;
2. включите Play App Signing;
3. заполните store listing и контакт;
4. пройдите App content, Data safety, content rating, ads declaration;
5. укажите privacy и account-deletion URLs;
6. создайте internal/closed testing track;
7. проверьте требования testing для типа вашего developer account.

App Store Connect:

1. создайте app с окончательным bundle ID;
2. заполните description, category, age rating, privacy details;
3. добавьте privacy/support URLs;
4. создайте subscription group/products в следующем модуле;
5. подготовьте TestFlight information и App Review notes;
6. если login обязателен, дайте review demo mode/account или точные шаги Steam login и держите backend доступным.

В screenshots показывайте реальное приложение: match list, match details, meta, compare, watchlist. Не показывайте несуществующие функции и не обещайте гарантированный прогноз.

## 6. Build, beta и submission

```powershell
pnpm --filter @dota/mobile exec eas build --platform all --profile staging
pnpm --filter @dota/mobile exec eas submit --platform android --profile production
pnpm --filter @dota/mobile exec eas submit --platform ios --profile production
```

Сначала загрузите staging build в TestFlight и Google Play test track. `EAS Submit` загружает binary, но store metadata, screenshots, questionnaires и решение о release выполняются в store consoles.

Release candidate проверяют минимум на одном физическом iPhone и двух Android форм-факторах:

- fresh install и upgrade;
- Steam login/cancel;
- background/foreground;
- плохая сеть/offline;
- push tap;
- purchase/restore после модуля 18;
- account deletion;
- deep links;
- русский и английский системный формат времени/чисел.

## 7. Updates без несовместимого native кода

После `eas update:configure` используйте channels `staging` и `production`. Процесс hotfix:

```text
исправление + tests
-> publish staging channel
-> проверить staging binary того же runtimeVersion
-> продвинуть тот же update в production
-> постепенный rollout
```

Если меняется native dependency, Expo SDK, permissions или app config native field, нужен новый store binary — OTA update недостаточен.

## 8. Ваша аналогичная задача: release checklist в репозитории

Создайте `docs/runbooks/mobile-release.md`. Это operational-файл, которым вы будете пользоваться при каждом релизе.

Для каждого пункта добавьте checkbox и точную команду/ссылку:

- commit SHA записан;
- CI green;
- production backend smoke green;
- migrations применены;
- version увеличена;
- staging build установлен и проверен;
- privacy/data safety всё ещё соответствует коду;
- subscription products доступны reviewer;
- screenshots/notes обновлены;
- Sentry release создан;
- production build + submit;
- phased rollout выбран;
- rollback owner и stop conditions записаны.

Не пишите абстрактное «проверить всё». Например:

```md
- [ ] `pnpm -r test` завершился с exit code 0 на commit `<SHA>`.
- [ ] `scripts/smoke-production.ts` проверил match/meta/auth endpoints.
- [ ] Steam login выполнен на staging iOS build без Expo Go.
```

## 9. Commit

```powershell
pnpm -r typecheck
git add apps/mobile apps/legal-site docs infra
git commit -m "chore(release): prepare store builds and compliance pages"
```

Актуальные первоисточники перед каждым релизом: [Expo EAS Build](https://docs.expo.dev/build/setup/), [Expo submission](https://docs.expo.dev/deploy/submit-to-app-stores/), [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/), [Google Play app setup](https://support.google.com/googleplay/android-developer/answer/9859152).

[Следующий модуль](19_MODULE_18_MONETIZATION.md)
