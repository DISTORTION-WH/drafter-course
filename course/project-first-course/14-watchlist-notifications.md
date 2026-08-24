# Модуль 14. Watchlist и push-уведомления

## Результат

Авторизованный пользователь добавит команду в watchlist и получит push после появления нового результата. Backend хранит устройства и предпочтения, worker создаёт deduplicated notification jobs, mobile открывает нужный матч по нажатию.

## 1. Модели, которые реально нужны

Добавьте в Prisma schema:

```prisma
model WatchlistTeam {
  userId    String
  teamId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@id([userId, teamId])
  @@index([teamId])
}

model PushDevice {
  id        String    @id @default(cuid())
  userId    String
  expoToken String    @unique
  platform  String
  enabled   Boolean   @default(true)
  lastSeenAt DateTime @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model SentNotification {
  id             String   @id @default(cuid())
  deduplicationKey String  @unique
  userId         String
  matchId        String
  sentAt         DateTime @default(now())

  @@index([userId, sentAt(sort: Desc)])
}
```

Добавьте обратные relations `watchlist`/`pushDevices` в `User`, `watchedBy` в `Team`, затем migration `add_watchlist_notifications`.

- Compound primary key не позволяет одному user добавить команду дважды.
- `expoToken` unique: одно устройство не регистрируется сотни раз.
- `enabled` выключает invalid/opted-out token без удаления истории.
- `deduplicationKey` предотвращает повтор одного уведомления после retry worker.

## 2. Watchlist API

Contracts:

```ts
export const WatchlistResponseSchema = z.object({
  teams: z.array(TeamSummarySchema),
});

export const WatchlistMutationResponseSchema = z.object({
  teamId: z.string(),
  watching: z.boolean(),
});
```

Service add method:

```ts
async addTeam(userId: string, teamId: string) {
  const team = await this.prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundException('Team not found');

  await this.prisma.watchlistTeam.upsert({
    where: { userId_teamId: { userId, teamId } },
    create: { userId, teamId },
    update: {},
  });

  return { teamId, watching: true as const };
}
```

- `userId` приходит только из проверенного access token, не из request body.
- `teamId` — public route parameter.
- `team` проверяет, что объект существует.
- Пустой update делает повторный PUT идемпотентным.

Routes:

```text
GET    /v1/me/watchlist
PUT    /v1/me/watchlist/teams/:teamId
DELETE /v1/me/watchlist/teams/:teamId
```

Все три защищены auth guard. GET делает include team и mapping через `TeamSummarySchema`.

## 3. Регистрация push device

Установите mobile packages:

```powershell
pnpm --filter @dota/mobile exec expo install expo-notifications expo-device expo-constants
```

Создайте `register-push-device.ts`:

```ts
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function getPushRegistration(): Promise<{
  expoToken: string;
  platform: 'ios' | 'android';
} | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('match-results', {
      name: 'Результаты матчей',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;

  const projectId =
    Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error('EAS projectId is missing');

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return {
    expoToken: token.data,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  };
}
```

- `Device.isDevice` предотвращает ложную регистрацию simulator.
- `current` — текущее permission; `permission` — итог после возможного запроса.
- Permission спрашивайте после того, как user включил уведомления/watchlist, а не при первом открытии без объяснения.
- `projectId` связывает token с EAS project.
- `token.data` — Expo push token, не APNs/FCM credential.

Mobile отправляет registration в protected `PUT /v1/me/push-devices`. Backend делает `upsert` по `expoToken`, меняет `userId`, `platform`, `enabled: true`, `lastSeenAt`.

## 4. Notification job после сохранения результата

В worker добавьте queue `notifications` и job:

```ts
export type TeamResultNotificationJob = {
  userId: string;
  matchId: string;
  teamId: string;
};
```

После того как hydrated match впервые получил winner, найдите watchers обеих команд и поставьте по job на user. `jobId`:

```ts
const jobId = `team-result:${match.id}:${watcher.userId}`;
```

Consumer:

```ts
const deduplicationKey = `team-result:${job.data.matchId}:${job.data.userId}`;
const alreadySent = await prisma.sentNotification.findUnique({
  where: { deduplicationKey },
});
if (alreadySent) return;

const devices = await prisma.pushDevice.findMany({
  where: { userId: job.data.userId, enabled: true },
});
if (devices.length === 0) return;
```

Затем отправьте через официальный Expo Push API/`expo-server-sdk` messages с:

```ts
{
  to: device.expoToken,
  title: 'Матч завершён',
  body: 'Откройте результат команды из watchlist',
  channelId: 'match-results',
  data: { type: 'match', matchId: job.data.matchId },
}
```

После успешной отправки создайте `SentNotification`. Обрабатывайте receipts: token с `DeviceNotRegistered` помечайте `enabled: false`. Не логируйте полный token.

Стабильный BullMQ `jobId` не даёт двум workers одновременно обрабатывать одну и ту же logical delivery, а `alreadySent`/unique отсекают поздний replay. Если process упал после отправки push, но до записи `SentNotification`, retry всё же может дать дубль — это честное at-least-once поведение MVP. Для строгого контроля нужна отдельная delivery state machine/outbox.

## 5. Deep link из notification

В root layout зарегистрируйте listener:

```ts
useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      if (data.type === 'match' && typeof data.matchId === 'string') {
        router.push(`/matches/${data.matchId}`);
      }
    },
  );
  return () => subscription.remove();
}, []);
```

`response` — нажатое уведомление. `data` — непроверенный объект, поэтому type и matchId проверяются перед route. Cleanup удаляет listener при размонтировании/hot reload.

## 6. Ваша аналогичная задача: удалить команду из watchlist

Реализуйте весь путь удаления.

Backend service:

- function `removeTeam(userId, teamId)`;
- `deleteMany`, потому что повторный DELETE тоже должен быть успешным;
- return `{ teamId, watching: false }`.

Эталон:

```ts
await this.prisma.watchlistTeam.deleteMany({
  where: { userId, teamId },
});
return { teamId, watching: false as const };
```

Mobile:

- hook `useRemoveWatchedTeam` через `useMutation`;
- переменная `queryClient = useQueryClient()`;
- mutation вызывает authenticated `apiDelete`;
- `onSuccess` инвалидирует `['me', 'watchlist']` и `['teams', 'details', teamId]`;
- button показывает `Удаляем…`, когда `mutation.isPending`.

Эталон invalidation:

```ts
onSuccess: async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['me', 'watchlist'] }),
    queryClient.invalidateQueries({ queryKey: ['teams', 'details', teamId] }),
  ]);
},
```

Это не «упражнение на DELETE»: без него пользователь не сможет отозвать уведомления.

## 7. Проверка и commit

```powershell
pnpm --filter @dota/database exec prisma migrate dev --name add_watchlist_notifications
pnpm -r typecheck
pnpm -r test
git add apps packages
git commit -m "feat(watchlist): add team alerts and push delivery"
```

Проверьте два устройства одного user, отказ в permission, повторное добавление, повторное удаление, retry одной notification job и переход в правильный match. Push проверяется development build на физическом устройстве, не только Expo Go.

[Следующий модуль](15-quality-security.md)
