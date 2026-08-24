# Глава 8. CD backend и EAS mobile releases

## 1. Continuous Delivery, не бесконтрольный deploy

Pipeline автоматизирует повторяемые шаги, но production gate учитывает риск:

```text
CI passed
-> image digest published
-> deploy staging
-> migration/smoke
-> automated + human approval по policy
-> production rollout
-> post-deploy verification
```

Небольшое безопасное backend изменение может deploy автоматически после зрелости pipeline. Auth/schema/mobile native release требует более строгого gate.

## 2. Backend deployment job

Deployment получает только:

- environment name;
- image digest;
- release manifest;
- short-lived deploy identity;
- migration job configuration.

Не передавайте исходники на server и не выполняйте `git pull && pnpm install` в production. Server запускает уже проверенный image.

## 3. Staging gate

После deploy exact digest:

- migration version;
- `/health/live` и `/health/ready`;
- public match list/detail;
- OpenAPI compatible smoke;
- one test auth/watchlist flow;
- worker consumes staging job;
- no error-rate/latency regression;
- environment banner/URLs/credentials correct;
- no production push recipient.

## 4. EAS profiles

`eas.json` concept:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "channel": "staging"
    },
    "production": {
      "channel": "production",
      "autoIncrement": true
    }
  }
}
```

Точная schema EAS меняется; после `eas build:configure` сверяйте текущий reference. Profiles должны задавать разные public API URLs и identifiers/credentials согласно Expo environment configuration, но не встраивать backend secrets.

## 5. Build и Submit

Типичный процесс:

```bash
eas build --profile preview --platform all
eas build --profile production --platform all
```

Production artifact проходит store signing/submission. Signing credentials управляются через утверждённый EAS/organization process с least privilege и recovery ownership.

Сначала internal/preview, затем TestFlight/Google Play testing track, затем production release. Store review и staged/phased rollout учитываются в календаре.

## 6. Native layer и update layer

Mobile binary имеет native runtime. EAS Update может доставить совместимый JavaScript/assets update, но не произвольное изменение native code/dependency/config.

```text
изменили TS/JS при том же native contract -> возможно compatible update
добавили/обновили native module/plugin      -> новый binary
изменили permissions/entitlements           -> новый binary
изменили native identifiers/signing          -> новый binary
```

`runtimeVersion` связывает update с совместимыми builds. Нельзя направлять новый update на несовместимый runtime.

## 7. Channels

```text
development build -> development channel
staging build     -> staging channel
production build  -> production channel
```

Публикуйте сначала staging update, проверяйте на build с тем же runtime, затем production. Пользователи имеют разные binary/runtime versions, поэтому update strategy поддерживает несколько активных линий.

## 8. Mobile secrets

Всё внутри binary/update можно извлечь. Допустимо:

- public API base URL;
- EAS project ID;
- public Sentry DSN по модели сервиса;
- feature flag public key с ограничениями, если предназначен для клиента.

Недопустимо:

- Steam Web API key;
- DB/Redis URL;
- signing private key;
- service account credential;
- backup/object storage secret;
- admin bypass token.

## 9. Version compatibility

Backend получает safe client metadata:

```text
app semantic version
native build number
runtime version
platform
```

Используйте для диагностики/compatibility, но не доверяйте header как authorization. Если версия больше не поддерживается, API возвращает документированный upgrade-required code только после rollout policy, не ломая приложение случайно.

## 10. Официальные источники

- [EAS Build](https://docs.expo.dev/build/)
- [EAS deployment tutorial](https://docs.expo.dev/tutorial/eas/introduction/)
- [How EAS Update works](https://docs.expo.dev/eas-update/how-it-works/)
- [Deploy EAS updates](https://docs.expo.dev/eas-update/deployment/)

[Предыдущая глава](07-github-actions-ci.md) · [Оглавление](README.md) · [Следующая глава](09-release-rollback-feature-flags.md)

