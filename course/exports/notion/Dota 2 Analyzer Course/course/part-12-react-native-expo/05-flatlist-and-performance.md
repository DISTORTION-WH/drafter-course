# Глава 5. `FlatList`, refresh и производительность списков

[← Глава 4](04-expo-router-navigation.md) · [Оглавление](README.md) · [Глава 6 →](06-tanstack-query.md)

## Базовый список

```tsx
import { FlatList } from 'react-native';

type Props = {
  matches: readonly MatchSummary[];
  onOpen: (id: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
};

export function MatchList(props: Props) {
  return (
    <FlatList
      data={props.matches}
      keyExtractor={(match) => match.id}
      renderItem={({ item }) => (
        <MatchCard match={item} onPress={props.onOpen} />
      )}
      ItemSeparatorComponent={MatchSeparator}
      ListEmptyComponent={MatchEmptyState}
      refreshing={props.refreshing}
      onRefresh={props.onRefresh}
      contentContainerStyle={styles.content}
    />
  );
}
```

`data` readonly может потребовать тип/копию в зависимости от текущих RN typings; не мутируйте source ради compiler.

## Virtualization

FlatList рендерит видимое окно и часть соседей. Element вне окна может unmount. Local state в row не должен быть единственным источником важного выбора; храните selected/favorite state выше/store/server.

## Stable functions

Не оптимизируйте всё `useCallback` заранее. Сначала измерьте profiler. Но `renderItem` с тяжёлыми cards может получить stable callback:

```tsx
const renderItem = useCallback(
  ({ item }: ListRenderItemInfo<MatchSummary>) => (
    <MatchCard match={item} onPress={onOpen} />
  ),
  [onOpen],
);
```

Если `onOpen` сам меняется каждый render, benefit теряется. React Compiler/current tooling может менять необходимость manual memo — следуйте актуальному profiler, не догме.

## `extraData`

FlatList оптимизирован и может не знать о внешнем selected ID:

```tsx
<FlatList data={matches} extraData={selectedMatchId} ... />
```

Либо row получает derived `selected` через render closure. Проверяйте обновление.

## Pagination

```tsx
onEndReached={hasNextPage ? fetchNextPage : undefined}
onEndReachedThreshold={0.5}
ListFooterComponent={isFetchingNextPage ? <LoadingMore /> : null}
```

`onEndReached` может сработать несколько раз. Query layer дедуплицирует/проверяет `isFetchingNextPage`; handler:

```ts
if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
```

## Pull to refresh

Initial loading и background refreshing отличаются:

- нет data → full-screen skeleton/spinner;
- data есть + refetch → оставить list, показать refresh indicator;
- load next page → footer.

Не очищайте list при каждом refetch.

## Размеры

Если rows имеют одинаковую высоту, `getItemLayout` ускоряет jump/scroll. Но dynamic text/font scaling делает fixed height неверной. Для accessibility сначала поддержите content, потом оптимизируйте measured cases.

## Images и memory

Используйте thumbnails правильного размера, cache policy, placeholder; не загружайте 4K logo в маленькую row. Не создавайте base64 images в list state.

## Практика

Сгенерируйте 1000 fixture rows. Сравните ScrollView/FlatList, изучите render logs/profiler, но удалите logs. Проверьте fast scroll, pull refresh, empty и pagination guard.

## Самопроверка

- [ ] Длинный список использует FlatList.
- [ ] Key — стабильный ID.
- [ ] Row state не теряет важные данные при virtualization.
- [ ] Initial/refetch/load-more states различаются.
- [ ] Оптимизация основана на измерении.
