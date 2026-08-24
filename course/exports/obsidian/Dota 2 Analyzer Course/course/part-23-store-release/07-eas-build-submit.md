# Глава 7. EAS Build и EAS Submit

## Результат главы

Вы оформите сборки как повторяемую конфигурацию и будете отправлять заранее проверенный store artifact, а не случайное локальное состояние.

## 1. `eas.json`

Каркас:

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "env": { "APP_ENV": "development" }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "env": { "APP_ENV": "preview" }
    },
    "production": {
      "autoIncrement": true,
      "channel": "production",
      "env": { "APP_ENV": "production" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Версия CLI здесь пример, а не вечная рекомендация. Зафиксируйте текущую поддерживаемую версию проекта после проверки официальной документации.

`env` в config не место для private secrets, которые попадут в mobile bundle. EAS secret защищает значение в build-системе, но если код встраивает его в приложение, пользователь всё равно может извлечь его.

## 2. Build inputs

Перед production build pipeline проверяет:

```text
clean Git commit
lockfile unchanged
tests/typecheck/lint green
APP_ENV=production
HTTPS API URL allowlisted
production bundle/package ID
version/build number unique
privacy/support URLs reachable
native runtime version correct
no debug menu/test credentials
```

Запишите commit SHA и EAS build ID в release manifest.

## 3. Credentials

EAS может создать/хранить Android/iOS credentials. Выберите подход осознанно:

- managed credentials удобнее одному новичку;
- local credentials дают иной контроль, но повышают ответственность;
- роли Apple/Google выдаются минимально;
- service account key, если он используется, хранится закрыто и ротируется;
- предпочтите поддерживаемые short-lived/managed integrations, когда платформа их предоставляет.

Не вставляйте credential JSON в issue или CI log.

## 4. Сборка

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

Можно собирать обе платформы, но перед первым публичным релизом полезно проверять их отдельно. Build artifact должен пройти:

- install through official testing channel;
- core flow;
- cold start;
- network loss/recovery;
- deep links;
- account deletion;
- crash reporting mapping/symbols;
- update from previous build.

## 5. Отправка

```bash
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

Submit загружает binary, но не заполняет за вас все policy forms и не гарантирует автоматический public release.

Для первой Android-загрузки может потребоваться ручной upload в Play Console, чтобы связать app/signing; проверяйте текущую документацию Expo/Google. iOS build после upload ещё выбирается в App Store Connect version.

## 6. Не строить и отправлять вслепую одной командой

На раннем этапе разделите:

```text
build -> install beta -> QA sign-off -> submit -> review -> staged release
```

Опция автосдачи удобна после зрелого pipeline. Она не должна обходить QA approval.

## 7. EAS Update

Если используете OTA:

- channel соответствует environment;
- `runtimeVersion` защищает native compatibility;
- update подписан/защищён согласно выбранной модели;
- есть rollback/republish procedure;
- изменение store-regulated behavior проходит новую binary/review, если требуется;
- production update сначала тестируется на compatible preview runtime.

Не отправляйте update, который меняет API contract без backend compatibility.

## 8. Release manifest

```json
{
  "version": "1.0.0",
  "androidVersionCode": 12,
  "iosBuildNumber": "12",
  "commit": "...",
  "apiRelease": "sha256:...",
  "easAndroidBuildId": "...",
  "easIosBuildId": "...",
  "runtimeVersion": "1.0.0",
  "qaApprovedBy": "...",
  "submittedAt": "..."
}
```

Это связывает mobile binary с backend и расследованием ошибок.

## Практика

1. Создайте profiles и config validation.
2. Соберите production candidates обеих платформ.
3. Установите их через internal/TestFlight channel.
4. Заполните release manifest.
5. Выполните submit только после QA sign-off.
6. Проверьте, что новая binary видна в consoles, но не выпущена автоматически без вашего решения.

## Готово, если

- build воспроизводим из clean commit;
- artifact связан с commit/backend digest;
- private secrets не встроены в app;
- QA стоит между build и submit;
- profiles нельзя перепутать без failure;
- OTA не пересекает native runtime boundary.

## Официальные материалы

- [Expo: build for app stores](https://docs.expo.dev/deploy/build-project/)
- [Expo: submit to app stores](https://docs.expo.dev/deploy/submit-to-app-stores/)

