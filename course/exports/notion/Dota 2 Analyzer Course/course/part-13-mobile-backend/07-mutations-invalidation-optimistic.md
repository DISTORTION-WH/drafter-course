# Глава 7. Мутации и инвалидация

## 1. Query и mutation

Query читает серверное состояние. Mutation просит сервер его изменить.

Примеры mutation:

- добавить команду в watchlist;
- удалить команду из watchlist;
- изменить настройки уведомлений;
- зарегистрировать push-устройство;
- выйти из текущей сессии.

В этой главе разберём механику на условной операции «пометить матч просмотренным». Реальный watchlist появится в части 14.

## 2. Сервер остаётся источником истины

```ts
export function useMarkMatchViewed() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => markMatchViewed(api, matchId),
    onSuccess: (_result, matchId) => {
      void queryClient.invalidateQueries({
        queryKey: matchKeys.detail(matchId),
      });
    },
  });
}
```

`mutationFn` получает переменную, переданную в `mutate(matchId)`. `onSuccess` запускается после успешного подтверждения backend. Инвалидация помечает данные устаревшими и позволяет активному экрану перечитать их.

## 3. Точная инвалидация

После изменения одного матча можно обновить:

```ts
queryClient.invalidateQueries({
  queryKey: matchKeys.detail(matchId),
});

queryClient.invalidateQueries({
  queryKey: matchKeys.lists(),
});
```

Не вызывайте `invalidateQueries()` без ключа после каждой кнопки. Это перезагрузит всё приложение. Сначала перечислите, какие представления действительно зависят от изменения.

Если mutation возвращает полный канонический объект, можно сразу записать его:

```ts
queryClient.setQueryData(
  matchKeys.detail(updated.id),
  updated,
);
```

Списки всё равно могут требовать инвалидации, если изменились сортировка или фильтруемое поле.

## 4. Optimistic update

Optimistic update показывает ожидаемый результат до ответа сервера. Он улучшает ощущение скорости, но требует rollback.

```ts
onMutate: async (matchId) => {
  await queryClient.cancelQueries({
    queryKey: matchKeys.detail(matchId),
  });

  const previous = queryClient.getQueryData(matchKeys.detail(matchId));

  queryClient.setQueryData(
    matchKeys.detail(matchId),
    (current: MatchDetailDto | undefined) =>
      current ? { ...current, viewed: true } : current,
  );

  return { previous };
},
onError: (_error, matchId, context) => {
  queryClient.setQueryData(
    matchKeys.detail(matchId),
    context?.previous,
  );
},
onSettled: (_data, _error, matchId) => {
  void queryClient.invalidateQueries({
    queryKey: matchKeys.detail(matchId),
  });
},
```

`onMutate` выполняется до network request. Она отменяет фоновое обновление, сохраняет snapshot и пишет предполагаемый результат. При ошибке `onError` возвращает snapshot. `onSettled` сверяет состояние с сервером.

## 5. Когда optimistic update не нужен

Не начинайте с него, если:

- операция финансовая или необратимая;
- сервер часто отклоняет действие;
- результат зависит от сложных прав;
- rollback нескольких списков трудно сделать правильно;
- пользователь может одновременно выполнить действие с двух устройств;
- offline-очередь ещё не спроектирована.

Для watchlist простое добавление можно оптимизировать позже. Первая корректная версия ждёт сервер, показывает маленький индикатор и инвалидирует `me/watchlist`.

## 6. Защита от двойного нажатия

```tsx
<Button
  disabled={mutation.isPending}
  onPress={() => mutation.mutate(matchId)}
>
  {mutation.isPending ? 'Сохраняем…' : 'Сохранить'}
</Button>
```

UI-защита полезна, но не заменяет серверную идемпотентность. Уникальный индекс в БД должен не допускать две одинаковые записи watchlist.

## 7. Ошибка mutation

Сообщение должно отвечать на три вопроса:

1. Что не сохранилось?
2. Остались ли старые данные безопасными?
3. Что пользователь может сделать?

Например: «Команда не добавлена в избранное. Проверьте соединение и повторите». Не показывайте успех до подтверждения, если rollback не реализован.

## 8. Упражнение

Сделайте тестовую mutation и тестами проверьте:

- успешный ответ обновляет только нужный кэш;
- 409 показывает конфликт и перечитывает данные;
- двойное нажатие не создаёт два параллельных запроса;
- optimistic rollback возвращает точный предыдущий объект;
- после `onSettled` состояние совпадает с сервером.

[Предыдущая глава](06-pagination-and-filters.md) · [Оглавление](README.md) · [Следующая глава](08-reconnect-offline-error-ux.md)

