# Глава 7. Регистрация push-устройства

## 1. Четыре разных понятия

Не смешивайте:

- `user` — аккаунт приложения;
- `installationId` — установка приложения на устройстве;
- permission — разрешил ли пользователь уведомления в ОС;
- Expo push token — адрес доставки через Expo Push Service.

Токен способен измениться. Один пользователь может иметь несколько устройств, а одно устройство после logout может принадлежать другому пользователю.

## 2. Когда запрашивать разрешение

Не показывайте системный prompt сразу при первом запуске без контекста. Сначала объясните ценность: «Получать уведомление за 15 минут до матча избранной команды». После осознанного нажатия запросите permission.

Если пользователь отказал:

- приложение продолжает работать;
- показывается текущий статус;
- повторный prompt не спамит;
- при необходимости предлагается открыть системные настройки;
- отказ не превращается в серверную ошибку.

## 3. Установка пакетов и native-конфигурация

Используйте совместимые Expo SDK версии:

```bash
npx expo install expo-notifications expo-device expo-constants
```

Добавьте официальный config plugin `expo-notifications` в Expo config, настройте credentials для FCM/APNs через выбранный EAS workflow и пересоберите development build. Изменение native config не появляется простым JavaScript reload.

Remote push проверяйте на физическом устройстве и development build. Ограничения simulator/emulator и Expo Go могут меняться между SDK; сверяйтесь с документацией вашей версии.

## 4. Получение Expo push token

Упрощённая функция:

```ts
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function requestExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('match-reminders', {
      name: 'Напоминания о матчах',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();

  if (!permission.granted) return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error('Не найден EAS projectId для push token');
  }

  const result = await Notifications.getExpoPushTokenAsync({ projectId });
  return result.data;
}
```

Проверяйте точные свойства `Constants` по типам установленной Expo SDK. Не скрывайте ошибку отсутствующего project ID: token, связанный не с тем проектом, не заработает.

## 5. installationId

Создайте случайный installation UUID один раз и храните локально. Он не секрет, но не должен использоваться как доказательство авторизации.

```ts
type RegisterPushDeviceInput = {
  installationId: string;
  expoPushToken: string;
  platform: 'ios' | 'android';
  appVersion: string;
  environment: 'development' | 'staging' | 'production';
};
```

Environment обязателен: staging worker не должен отправлять на production token.

## 6. Серверная таблица

```sql
CREATE TABLE push_devices (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  installation_id text NOT NULL,
  expo_push_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  environment text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'disabled')),
  app_version text,
  registered_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  UNIQUE (environment, expo_push_token),
  UNIQUE (user_id, environment, installation_id)
);
```

Регистрация — upsert. Если token изменился для installation, старая запись перестаёт использоваться. Если token оказался привязан к другой учётной записи на том же устройстве, политика logout/login должна безопасно перепривязать его только после новой authenticated регистрации.

## 7. Настройки уведомлений

```sql
CREATE TABLE notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  match_reminders_enabled boolean NOT NULL DEFAULT false,
  reminder_minutes_before integer NOT NULL DEFAULT 15,
  match_results_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reminder_minutes_before BETWEEN 0 AND 1440)
);
```

Серверная preference и OS permission — разные уровни. Отправка разрешена только если включена preference, watchlist entry разрешает событие, device active и ОС ранее выдала token. Текущий OS permission периодически перечитывайте при открытии settings.

## 8. Token listener и logout

ОС/Expo могут обновить token во время жизни приложения. Используйте поддерживаемый listener текущей SDK и повторный upsert. На logout:

1. authenticated DELETE/disable registration по installation ID;
2. завершить session;
3. очистить private cache/tokens;
4. даже если network недоступна, локально выйти и пометить unregister для безопасной повторной попытки.

Backend при этом не полагается только на logout: недействительные tokens отключаются по push receipts.

## 9. Официальная документация

- [Expo push overview](https://docs.expo.dev/push-notifications/overview/)
- [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Expo Notifications API](https://docs.expo.dev/versions/latest/sdk/notifications/)

[Предыдущая глава](06-watchlist-and-sync.md) · [Оглавление](README.md) · [Следующая глава](08-notification-pipeline.md)

