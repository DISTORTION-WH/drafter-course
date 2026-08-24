# Глава 5. Query keys и кэш

## 1. Query key — адрес данных в памяти

TanStack Query хранит ответ под массивом-ключом:

```ts
['matches', 'list', { teamId: '2163' }]
['matches', 'detail', '8173564281']
['meta', 'snapshot', { patch: '7.39' }]
```

Если два разных набора данных имеют одинаковый ключ, они перезапишут друг друга. Если одинаковые данные имеют разные ключи, приложение сделает лишние запросы.

## 2. Фабрика ключей

Создайте `src/features/matches/api/match-query-keys.ts`:

```ts
export type MatchListFilters = {
  teamId?: string;
  tournamentId?: string;
};

export const matchKeys = {
  all: ['matches'] as const,
  lists: () => [...matchKeys.all, 'list'] as const,
  list: (filters: MatchListFilters) =>
    [...matchKeys.lists(), normalizeMatchFilters(filters)] as const,
  details: () => [...matchKeys.all, 'detail'] as const,
  detail: (matchId: string) =>
    [...matchKeys.details(), matchId] as const,
};

function normalizeMatchFilters(filters: MatchListFilters) {
  return {
    teamId: filters.teamId || undefined,
    tournamentId: filters.tournamentId || undefined,
  };
}
```

`as const` сохраняет точные литеральные типы и readonly tuple. Нормализация не даёт считать `''` и `undefined` разными фильтрами, если для продукта они означают одно и то же.

## 3. Первый useQuery

```ts
export function useMatch(matchId: string) {
  const api = useApiClient();

  return useQuery({
    queryKey: matchKeys.detail(matchId),
    queryFn: ({ signal }) => getMatch(api, matchId, signal),
    enabled: matchId.length > 0,
    staleTime: 60_000,
  });
}
```

Разбор:

- `queryKey` определяет запись кэша;
- `queryFn` получает `signal` для отмены;
- `enabled` не запускает бессмысленный запрос без ID;
- `staleTime` — сколько времени результат считается свежим;
- вызов hook находится в компоненте или другом hook, не в обычной функции.

`staleTime` не означает, что запись удалится через минуту. Он определяет свежесть. Время удаления неиспользуемой записи настраивается отдельно (`gcTime` в современных версиях библиотеки).

## 4. Как выбрать свежесть

Разные данные меняются с разной скоростью:

| Данные | Стартовый staleTime | Причина |
|---|---:|---|
| идущий матч | 10–30 секунд | счёт меняется быстро |
| законченный матч | 30 минут и больше | почти неизменяем |
| список недавних матчей | 1–5 минут | появляются новые записи |
| meta snapshot | 15–60 минут | считается batch-процессом |
| справочник героев | часы/сутки | меняется с патчем |

Это исходные гипотезы. Измеряйте нагрузку и ожидания пользователей. Backend также может возвращать `updatedAt` и статус расчёта.

## 5. Список и детали — разные записи

Карточка списка содержит краткий DTO, а экран деталей — полный. Не кладите оба под один ключ.

Можно показать детали мгновенно из списка как `placeholderData`, но не притворяться, что краткая карточка является полным ответом:

```ts
useQuery({
  queryKey: matchKeys.detail(matchId),
  queryFn: ({ signal }) => getMatch(api, matchId, signal),
  placeholderData: () => findSummaryInCachedLists(queryClient, matchId),
});
```

После этого настоящий detail-запрос всё равно выполняется.

## 6. Где здесь Zustand

Zustand хранит клиентское UI-состояние:

- выбранную тему;
- локальные настройки отображения;
- временно выбранные фильтры до применения;
- закрыт ли onboarding.

TanStack Query хранит серверное состояние:

- матчи;
- команды;
- meta snapshot;
- watchlist текущего пользователя.

Не копируйте `query.data` в Zustand через effect. Появятся две версии истины и гонки обновлений.

## 7. Состояния экрана

Не сводите всё к `isLoading`:

```text
нет данных + pending  -> полноэкранный skeleton
есть данные + fetching -> сохранить список, показать тихое обновление
нет данных + error    -> полноэкранная ошибка
есть данные + error   -> сохранить старые данные и показать banner
успех + items=[]      -> содержательное пустое состояние
```

`isFetching` может быть true при фоновом обновлении, когда данные уже видны. Удалять интерфейс в этот момент — плохой UX.

## 8. Упражнение

Создайте фабрики ключей для `matches` и `meta`. Напишите тесты, подтверждающие:

1. одинаковые нормализованные фильтры дают эквивалентный ключ;
2. разные `teamId` не делят кэш;
3. list и detail не пересекаются;
4. invalidation `matchKeys.lists()` не удаляет detail без необходимости.

[Предыдущая глава](04-http-transport-and-errors.md) · [Оглавление](README.md) · [Следующая глава](06-pagination-and-filters.md)
