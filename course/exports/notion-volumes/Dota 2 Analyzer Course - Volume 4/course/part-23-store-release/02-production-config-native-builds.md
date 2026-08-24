# Глава 2. Production-конфигурация и native builds

## Результат главы

Вы перестанете зависеть от Expo Go, соберёте development build с native-модулями и создадите проверяемые profiles для preview/production.

## 1. Почему Expo Go недостаточно

Expo Go содержит заранее выбранный набор native-модулей. In-app purchases, некоторые push/crash SDK и собственные native permissions требуют development build. Development build — ваша версия приложения с dev client, собранная с вашими native dependencies.

Путь:

```text
Expo Go для первых уроков
  -> development build для интеграций
  -> preview build для QA
  -> production store build
```

## 2. App config как функция

Пример `app.config.ts`:

```ts
import type { ConfigContext, ExpoConfig } from 'expo/config';

type AppEnvironment = 'development' | 'preview' | 'production';

function readEnvironment(): AppEnvironment {
  const value = process.env.APP_ENV;
  if (value === 'development' || value === 'preview' || value === 'production') {
    return value;
  }
  throw new Error('APP_ENV must be development, preview or production');
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const env = readEnvironment();
  const isProduction = env === 'production';

  return {
    ...config,
    name: isProduction ? 'Your Product Name' : `Your Product Name (${env})`,
    slug: 'dota-analyzer',
    scheme: isProduction ? 'dotaanalyzer' : `dotaanalyzer-${env}`,
    ios: {
      bundleIdentifier: isProduction
        ? 'com.yourcompany.dotaanalyzer'
        : `com.yourcompany.dotaanalyzer.${env}`,
    },
    android: {
      package: isProduction
        ? 'com.yourcompany.dotaanalyzer'
        : `com.yourcompany.dotaanalyzer.${env}`,
    },
    extra: {
      appEnvironment: env,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
    },
  };
};
```

Здесь `AppEnvironment` разрешает только три строки. Функция `readEnvironment` проверяет input при build. `EXPO_PUBLIC_*` попадает в приложение и не является секретом.

## 3. Проверяем публичную конфигурацию

Создайте runtime parser, например Zod:

```ts
const publicConfigSchema = z.object({
  appEnvironment: z.enum(['development', 'preview', 'production']),
  apiUrl: z.string().url().startsWith('https://'),
});
```

Для локального development можно отдельно разрешить LAN HTTP. Production build должен падать на этапе проверки, если API URL не HTTPS или environment отсутствует.

## 4. Permissions — только нужные

Каждое native permission влияет на review и privacy disclosure. Анализатор матчей обычно не требует contacts, microphone, camera, precise location или tracking. Push notifications запрашивайте после объяснения пользы, а не на первом экране.

Проведите permission audit:

| Permission | Функция | Нужна? | Текст пользователю | Store disclosure |
|---|---|---:|---|---|
| notifications | напомнить о матче/watchlist | возможно | конкретная польза | да |
| tracking | advertising cross-app | нет для MVP | — | — |

Удалите ненужные plugins/SDK: они могут добавить permissions и data collection.

## 5. Development build

Общая последовательность по актуальной Expo документации:

```bash
npx expo install expo-dev-client
eas build --profile development --platform android
eas build --profile development --platform ios
```

Для iOS device build нужны допустимые Apple credentials и зарегистрированное устройство/подходящий distribution path. Команды и доступность зависят от текущего плана Expo и правил Apple — сверяйте перед запуском.

После изменения native dependency, plugin или permission создайте новый native build. Metro refresh не добавляет native-код.

## 6. Preview и production

Preview нужен QA и не должен иметь dev menu. Production:

- подключён только к production API;
- имеет production ID, icon, name и deep links;
- не содержит debug screens;
- не принимает self-signed certificates;
- не содержит тестовых provider keys;
- отправляет crash/error события в production project с privacy filters.

## 7. OTA update граница

JavaScript/asset update может быть доставлен OTA только совместимому native runtime. Изменили native module, config plugin или permission — требуется новая store binary. Задайте `runtimeVersion` policy и протестируйте rollback OTA.

Не используйте OTA, чтобы обходить review и превращать одобренное приложение в существенно иной продукт.

## Практика

1. Создайте три profiles и разные IDs для не-production.
2. Соберите development build на физическое устройство.
3. Добавьте runtime config validation.
4. Проведите permission/SDK audit.
5. Соберите preview без dev menu.
6. Докажите, что preview не может случайно вызвать production write.

## Готово, если

- native integrations тестируются не в Expo Go;
- production API URL проверяется при build/runtime;
- публичная mobile config не содержит secrets;
- permissions минимальны и объяснимы;
- OTA совместимость контролируется;
- физическое устройство проходит core flow.

## Официальные материалы

- [Expo development builds](https://docs.expo.dev/develop/development-builds/create-a-build/)
- [Expo store builds](https://docs.expo.dev/deploy/build-project/)

