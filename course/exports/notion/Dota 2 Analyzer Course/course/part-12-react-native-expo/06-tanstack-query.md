# Глава 6. TanStack Query: server state, focus и сеть

[← Глава 5](05-flatlist-and-performance.md) · [Оглавление](README.md) · [Глава 7 →](07-zustand-client-state.md)

## Server state отличается от client state

Server state:

- живёт на backend;
- может устареть;
- загружается async;
- имеет cache/retry/refetch/pagination;
- разделяется несколькими screens.

Matches/meta/team detail — TanStack Query. Выбранная тема/filter draft — local/Zustand. Не копируйте query data в Zustand.

## QueryClient provider

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      retry: (failureCount, error) =>
        isRetryableApiError(error) && failureCount < 2,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack />
    </QueryClientProvider>
  );
}
```

Создайте QueryClient один раз вне render или через stable state, иначе cache сбросится.

## Query keys

```ts
export const matchKeys = {
  all: ['matches'] as const,
  list: (filters: NormalizedMatchFilters) =>
    [...matchKeys.all, 'list', filters] as const,
  detail: (id: string) => [...matchKeys.all, 'detail', id] as const,
};
```

Key включает все inputs query function. Filters должны быть serializable/stable normalized values, не `Date` с меняющимся now или функции.

## `useQuery`

```tsx
export function useMatch(id: string) {
  return useQuery({
    queryKey: matchKeys.detail(id),
    queryFn: ({ signal }) => matchesApi.getOne({ id, signal }),
  });
}
```

Signal передаётся fetch, поэтому obsolete query можно отменить.

## Infinite query

```tsx
useInfiniteQuery({
  queryKey: matchKeys.list(filters),
  initialPageParam: null as string | null,
  queryFn: ({ pageParam, signal }) =>
    matchesApi.list({ filters, cursor: pageParam, signal }),
  getNextPageParam: (lastPage) => lastPage.page.nextCursor ?? undefined,
});
```

Flatten:

```ts
const matches = data?.pages.flatMap((page) => page.items) ?? [];
```

Если backend может вернуть duplicate между moving pages, API cursor contract должен решать; UI дополнительно может detect по ID, но не скрывать системную ошибку навсегда.

## Online manager

Browser online events отсутствуют. По official TanStack RN guide подключите `expo-network` или NetInfo к `onlineManager`, обязательно вернув unsubscribe. Проверяйте API выбранной Expo SDK.

## Focus manager

Используйте `AppState` для foreground/background и `focusManager`. Screen focus refetch нужен не всегда; не создавайте запрос при каждом tab tap без stale check.

## Retry policy

- network/503 — ограниченный retry;
- 400/401/403/404 — обычно нет;
- 429 — учитывать Retry-After/backend policy;
- abort — не показывать как error пользователю.

Mobile плохая сеть не означает бесконечный spinner/retry battery drain.

## Initial, fetching и error

Query может иметь data и одновременно `isFetching=true`. Показывайте stale data + subtle refresh. Error с сохранёнными data может не требовать full-screen replacement.

## Практика

Подключите FixtureMatchesApi с artificial delay/errors. Проверьте dedup двух screens, cache detail, pull refetch, infinite pages, offline/online transition и app background/foreground.

## Самопроверка

- [ ] QueryClient не создаётся каждый render.
- [ ] Key содержит filters/ID.
- [ ] Signal идёт в API client.
- [ ] Server data не копируется в Zustand.
- [ ] Online/focus адаптированы к React Native.
