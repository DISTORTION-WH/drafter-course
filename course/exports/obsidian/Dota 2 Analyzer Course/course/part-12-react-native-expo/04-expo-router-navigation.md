# Глава 4. Expo Router: Stack, Tabs, параметры и links

[← Глава 3](03-components-styles-layout.md) · [Оглавление](README.md) · [Глава 5 →](05-flatlist-and-performance.md)

## Routes из файлов

```text
app/
├─ _layout.tsx
├─ (tabs)/
│  ├─ _layout.tsx
│  ├─ index.tsx          / (Матчи)
│  ├─ meta.tsx           /meta
│  └─ favorites.tsx      /favorites
├─ matches/[id].tsx      /matches/8000000000
├─ heroes/[id].tsx       /heroes/1
└─ teams/[id].tsx        /teams/123
```

Route group `(tabs)` организует layout, но имя группы не обязано появляться в URL.

## Root Stack

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="matches/[id]" options={{ title: 'Матч' }} />
    </Stack>
  );
}
```

Root layout позже также содержит providers QueryClient/theme/auth. Не выполняйте async fetch прямо до возврата layout без splash/error strategy.

## Tabs

```tsx
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Матчи' }} />
      <Tabs.Screen name="meta" options={{ title: 'Мета' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Избранное' }} />
    </Tabs>
  );
}
```

Добавьте icons по актуальному Expo template/library, но label остаётся доступным.

## Переход

```tsx
import { router } from 'expo-router';

function handleMatchPress(id: string): void {
  router.push({ pathname: '/matches/[id]', params: { id } });
}
```

Параметр остаётся string. Не передавайте весь match object через URL; detail screen читает ID и получает данные/cache.

## Чтение parameter

```tsx
import { useLocalSearchParams } from 'expo-router';

export default function MatchScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = parseSingleDecimalId(params.id);
  return <MatchDetail matchId={id} />;
}
```

Type generic не проверяет runtime URL. Deep link может быть произвольным, поэтому parser обязателен.

## Link

```tsx
<Link href={{ pathname: '/teams/[id]', params: { id: team.id } }} asChild>
  <Pressable accessibilityRole="link"><Text>{team.name}</Text></Pressable>
</Link>
```

`Link` лучше для декларативной navigation/accessibility, router API — для handler/условного flow.

## Deep/universal links

App scheme задаётся configuration. Production universal/app links требуют domain association files и ownership. Не включайте auth token в URL: links попадают в history/logs/clipboard.

Invalid/deleted resource route показывает `400/404` state и back action, не crash.

## Back behavior

Android hardware back, iOS swipe/back button и direct deep link создают разные histories. Не полагайтесь, что previous screen существует. Если `router.canGoBack()` false, ведите на safe route.

## Практика

Создайте tabs и match dynamic route. Откройте detail из списка и прямым URL/deep link с valid/invalid ID. Проверьте Android back и сохранение state tabs.

## Самопроверка

- [ ] Route files тонкие и передают ID feature screen.
- [ ] URL parameter runtime validated.
- [ ] Full object/token не передаётся в URL.
- [ ] Direct link работает без previous history.
- [ ] Tabs/Stack имеют доступные titles.
