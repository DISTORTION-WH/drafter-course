# Модуль 9. Создаём React Native приложение

## Результат

В monorepo появится реальное Expo-приложение с Expo Router, общими контрактами, проверяемой конфигурацией и единым HTTP client. Оно запустится на физическом телефоне или emulator и покажет состояние backend.

## 1. Создать приложение на зафиксированном SDK

Из корня:

```powershell
pnpm dlx create-expo-app@latest apps/mobile --template default@sdk-56
```

В `apps/mobile/package.json` установите имя `@dota/mobile` и добавьте:

```powershell
pnpm --filter @dota/mobile add @dota/contracts@workspace:* @tanstack/react-query zod
```

Не запускайте `expo upgrade` посреди курса. SDK обновляется отдельным commit после прохождения официального upgrade guide, typecheck и проверки iOS/Android build.

Удалите только демонстрационные routes и изображения генератора, которые не используются manifest. Итоговая структура этого этапа:

```text
apps/mobile/
  app/
    _layout.tsx
    index.tsx
    system-status.tsx
  src/
    api/api-client.ts
    config/env.ts
    providers/app-providers.tsx
```

## 2. Public-конфигурация mobile

Создайте `apps/mobile/.env.example`:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.50:3000/v1
```

На физическом телефоне `localhost` означает сам телефон. Укажите локальный IP компьютера в той же Wi-Fi сети. Android emulator обычно обращается к host как `10.0.2.2`, iOS simulator может использовать `localhost`.

Создайте `apps/mobile/src/config/env.ts`:

```ts
import { z } from 'zod';

const mobileEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
});

const parsed = mobileEnvSchema.parse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});

export const mobileEnv = {
  apiUrl: parsed.EXPO_PUBLIC_API_URL.replace(/\/$/, ''),
};
```

- `parsed` — проверенный объект environment.
- `mobileEnv` — компактная конфигурация приложения.
- `apiUrl` — base URL без завершающего `/`; иначе path может образовать `//matches`.
- Префикс `EXPO_PUBLIC_` означает, что значение попадёт в приложение. Здесь нельзя хранить password, provider API key или AWS secret.

## 3. Один HTTP client

Создайте `apps/mobile/src/api/api-client.ts`:

```ts
import type { ZodType } from 'zod';
import { mobileEnv } from '../config/env';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiGet<T>(
  path: string,
  schema: ZodType<T>,
): Promise<T> {
  const response = await fetch(`${mobileEnv.apiUrl}${path}`, {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Request failed: ${response.status}`);
  }

  const json: unknown = await response.json();
  return schema.parse(json);
}
```

- `T` — тип конкретного результата; функция годится для матчей, команд и меты без потери типов.
- `path` — только часть после `/v1`, например `/matches`.
- `schema` — Zod-проверка именно этого ответа.
- `ApiError.status` позволяет экрану отличить 404, 401 и server error.
- `json: unknown` снова задаёт границу доверия: даже наш backend может быть другой версии.

## 4. Общие providers и routing

Создайте `apps/mobile/src/providers/app-providers.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

- `queryClient` хранит cache серверных данных на весь срок работы приложения.
- `staleTime` 30 секунд предотвращает мгновенный повтор запроса при возврате на экран.
- `retry: 2` повторяет временную ошибку дважды, но не бесконечно.
- `children` — текущий route tree Expo Router.

Создайте `apps/mobile/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { AppProviders } from '../src/providers/app-providers';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Dota Analyzer' }} />
        <Stack.Screen
          name="system-status"
          options={{ title: 'Состояние сервиса' }}
        />
      </Stack>
    </AppProviders>
  );
}
```

Создайте `app/index.tsx`:

```tsx
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dota Analyzer</Text>
      <Text>Профессиональные матчи и мета Dota 2</Text>
      <Link href="/system-status" style={styles.link}>
        Проверить backend
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  link: { color: '#6d5dfc', fontWeight: '600' },
});
```

`HomeScreen` — component, то есть функция, возвращающая UI. `styles` вынесены из render и создаются один раз. `flex: 1` занимает экран, `gap` задаёт расстояние между дочерними элементами.

## 5. Ваша аналогичная задача: SystemStatusScreen

Это не учебная заглушка: экран останется в настройках и поможет понимать, к какой версии backend подключён пользователь.

В `packages/contracts/src/system.ts` создайте:

```ts
export const VersionResponseSchema = z.object({
  version: z.string().min(1),
  environment: z.string().min(1),
});
export type VersionResponse = z.infer<typeof VersionResponseSchema>;
```

Создайте `apps/mobile/app/system-status.tsx`. Требуемые имена:

- `useQuery` с `queryKey: ['system', 'version']`;
- `queryFn` вызывает `apiGet('/system/version', VersionResponseSchema)`;
- переменная результата называется `versionQuery`;
- при loading текст `Проверяем…`;
- при error текст `Backend недоступен`;
- при success показать version и environment.

Эталон:

```tsx
import { VersionResponseSchema } from '@dota/contracts';
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { apiGet } from '../src/api/api-client';

export default function SystemStatusScreen() {
  const versionQuery = useQuery({
    queryKey: ['system', 'version'],
    queryFn: () => apiGet('/system/version', VersionResponseSchema),
  });

  if (versionQuery.isPending) return <Text>Проверяем…</Text>;
  if (versionQuery.isError) return <Text>Backend недоступен</Text>;

  return (
    <View style={{ padding: 24, gap: 8 }}>
      <Text>Backend работает</Text>
      <Text>Версия: {versionQuery.data.version}</Text>
      <Text>Среда: {versionQuery.data.environment}</Text>
    </View>
  );
}
```

`queryKey` — адрес записи в cache, а `queryFn` — способ её загрузить. `versionQuery.data` доступна после двух ранних return, поэтому TypeScript знает, что ответ существует.

## 6. Проверка и commit

```powershell
pnpm dev:api
pnpm --filter @dota/mobile start
pnpm --filter @dota/mobile exec tsc --noEmit
git add apps/mobile packages/contracts pnpm-lock.yaml
git commit -m "feat(mobile): bootstrap Expo app and typed API client"
```

Проверьте на том устройстве, на котором будете разрабатывать: ссылка открывает status, version совпадает, выключение API показывает error state.

[Следующий модуль](10-mobile-matches.md)

