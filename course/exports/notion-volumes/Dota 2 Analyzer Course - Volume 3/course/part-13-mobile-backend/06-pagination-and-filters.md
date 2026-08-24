# Глава 6. Пагинация и фильтры

## 1. Почему cursor, а не номер страницы

Список матчей постоянно меняется. Пока пользователь смотрит первую страницу, в начало может добавиться новый матч. При offset pagination часть элементов способна повториться или пропасть.

Cursor фиксирует позицию в стабильной сортировке, например:

```text
ORDER BY started_at DESC, id DESC
cursor содержит started_at + id последнего элемента
```

Mobile рассматривает cursor как непрозрачную строку. Не декодирует его, не строит самостоятельно и не сохраняет навечно.

Ответ:

```ts
type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};
```

## 2. useInfiniteQuery

```ts
const PAGE_SIZE = 20;

export function useMatches(filters: MatchListFilters) {
  const api = useApiClient();
  const normalized = normalizeMatchFilters(filters);

  return useInfiniteQuery({
    queryKey: matchKeys.list(normalized),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      listMatches(
        api,
        {
          ...normalized,
          cursor: pageParam,
          limit: PAGE_SIZE,
        },
        signal,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.nextCursor ?? undefined,
  });
}
```

Ключевые переменные:

- `PAGE_SIZE` — единое стартовое число элементов;
- `pageParam` — cursor конкретного запроса;
- `lastPage` — последний успешный ответ;
- `undefined` в `getNextPageParam` означает, что страниц больше нет;
- cursor не входит в query key: все страницы одного набора фильтров составляют одну infinite query.

Типы точного `initialPageParam` могут немного меняться между версиями TanStack Query. Ориентируйтесь на зафиксированную версию проекта, но сохраняйте саму модель.

## 3. Превращаем страницы в список

```ts
const matches = query.data?.pages.flatMap((page) => page.items) ?? [];
```

Для защиты интерфейса от редкого повтора можно дедуплицировать по `id`, одновременно отправляя диагностическое событие: повтор обычно означает ошибку cursor-сортировки на backend.

```ts
export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
```

Не скрывайте backend-проблему навсегда только этим фильтром: cursor pagination должна быть протестирована на одинаковых `startedAt`.

## 4. Подгрузка из FlatList

```tsx
<FlatList
  data={matches}
  keyExtractor={(item) => item.id}
  renderItem={renderMatch}
  onEndReached={() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }}
  onEndReachedThreshold={0.5}
/>
```

`onEndReached` иногда вызывается несколько раз. Условие `!isFetchingNextPage` защищает от параллельной загрузки одной страницы. Backend дополнительно должен корректно выдерживать повтор одного GET.

Различайте индикаторы:

- `isPending` — первая загрузка;
- `isFetchingNextPage` — нижний loader;
- `isRefetching` — обновление уже видимого списка.

## 5. Фильтры

Разделите черновик формы и применённые фильтры:

```ts
type FilterDraft = {
  teamIdText: string;
  tournamentIdText: string;
};

type AppliedFilters = {
  teamId?: string;
  tournamentId?: string;
};
```

Пользователь может печатать в `FilterDraft`, не запуская запрос на каждую букву. Кнопка «Применить» валидирует и создаёт новый `AppliedFilters`. Новый query key начинает отдельную цепочку страниц с пустого cursor.

Если нужен поиск по тексту во время ввода, используйте debounce и отмену старого запроса. Но ID команды обычно выбирается из справочника, а не вводится вручную.

## 6. Ошибка следующей страницы

Если первая страница уже показана, а следующая упала:

- не удаляйте загруженные элементы;
- внизу покажите «Не удалось загрузить ещё»;
- дайте повторить только `fetchNextPage`;
- не превращайте весь экран в полноэкранную ошибку.

Если backend ответил `INVALID_CURSOR`, safest UX — предложить обновить список с начала. Старый cursor мог стать несовместим после деплоя или истечь по политике сервера.

## 7. Упражнение

Реализуйте infinite list и проверьте:

1. первая страница загружается один раз;
2. быстрый скролл не создаёт несколько одинаковых запросов;
3. смена команды начинает список заново;
4. ошибка второй страницы оставляет первую видимой;
5. `nextCursor: null` скрывает нижний loader;
6. два матча с одинаковым временем всё равно не теряются.

[Предыдущая глава](05-query-keys-and-cache.md) · [Оглавление](README.md) · [Следующая глава](07-mutations-invalidation-optimistic.md)

