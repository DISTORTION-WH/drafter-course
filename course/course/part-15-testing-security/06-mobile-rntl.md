# Глава 6. React Native Testing Library

## 1. Что проверяет component test

React Native Testing Library (RNTL) рендерит JavaScript-дерево компонента и имитирует пользовательские события. Она хорошо проверяет:

- loading/error/empty/content;
- доступные labels/roles;
- нажатия и ввод;
- navigation callback;
- Query cache transitions;
- auth state и watchlist UI.

Она не запускает полноценную iOS/Android ОС и не доказывает работу SecureStore, push permission, native linking или реального layout на устройстве. Для этого нужен device test и ручная матрица.

## 2. Установка

В Expo/React Native package используйте совместимую с текущими React/React Native версиями testing setup. Обычно нужны:

```bash
pnpm add -D @testing-library/react-native
```

Test runner и transform должны соответствовать Expo SDK. Не переносите backend Vitest config вслепую: Expo ecosystem может использовать поддерживаемый Jest preset. Архитектурные правила главы не зависят от runner.

## 3. Test render wrapper

Экран зависит от QueryClient, Router/API/Auth contexts. Создайте helper:

```tsx
type RenderOptions = {
  api?: MatchesApi;
  auth?: AuthState;
};

export function renderApp(
  ui: React.ReactElement,
  options: RenderOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <TestAuthProvider value={options.auth ?? { status: 'guest' }}>
      <ApiProvider value={options.api ?? createFixtureApi()}>
        <QueryClientProvider client={queryClient}>
          {ui}
        </QueryClientProvider>
      </ApiProvider>
    </TestAuthProvider>,
  );
}
```

Новый QueryClient на test предотвращает утечку кэша. Automatic retry отключён, иначе тест ошибки ждёт лишние попытки.

## 4. Queries по смыслу

Предпочитайте то, что доступно пользователю:

```ts
screen.getByRole('button', { name: 'Повторить' });
screen.getByText('Team Spirit');
screen.getByLabelText('Добавить Team Spirit в избранное');
```

`testID` используйте для device automation или элементов без устойчивой accessible query. Не проверяйте имя внутреннего component class.

Иерархия queries:

```text
role/name/label/text -> хорошо отражает UX и accessibility
testID               -> допустимо для стабильной automation boundary
поиск props/type     -> чаще implementation detail
```

## 5. User Event

```ts
const user = userEvent.setup();
renderApp(<MatchesScreen />);

await user.press(
  await screen.findByRole('button', { name: 'Фильтры' }),
);

await user.type(screen.getByLabelText('Поиск команды'), 'Spirit');
await user.press(screen.getByRole('button', { name: 'Применить' }));
```

Если User Event поддерживает действие, он реалистичнее одиночного вызова handler. `fireEvent` остаётся для unsupported событий и особых native handlers.

## 6. Async query states

```ts
it('показывает данные после skeleton', async () => {
  const api = createDeferredMatchesApi();
  renderApp(<MatchesScreen />, { api });

  expect(screen.getByLabelText('Загрузка матчей')).toBeOnTheScreen();

  api.resolve(matchesPageFixture());

  expect(await screen.findByText('Team Spirit')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Загрузка матчей')).not.toBeOnTheScreen();
});
```

`getBy` ожидает элемент сейчас, `findBy` ждёт async, `queryBy` возвращает null при отсутствии. Не используйте произвольный sleep.

## 7. Error with cached data

Проверьте важную матрицу:

```text
нет data + pending -> skeleton
нет data + error   -> full error
data + refetch     -> data остаётся
data + refetch error -> data + warning
items=[]           -> product empty state
next page error    -> старые items + footer retry
```

Один snapshot не объяснит эти переходы.

## 8. Watchlist и auth

Сценарии:

- guest нажал star → local item или login prompt согласно policy;
- authenticated add pending → кнопка disabled;
- 409 → перечитать server state;
- logout → private items исчезли, public match остался;
- account A → account B → private cache не протёк;
- SecureStore bootstrap network error не удаляет token.

SecureStore adapter заменяется in-memory fake с тем же interface, а сам native module проверяется device test.

## 9. Notification router

Parser тестируется unit, orchestration — component/navigation harness:

```text
valid OPEN_MATCH -> /matches/<string-id>
numeric matchId  -> reject
unknown action   -> ignore + safe telemetry
arbitrary URL    -> reject
private action as guest -> login screen, no leaked data
duplicate event  -> no duplicate navigation/side effect
```

## 10. Accessibility как test oracle

Если кнопка не находится по role/name, возможно, реальный screen reader тоже не поймёт её. Tests помогают закрепить:

- accessible name;
- selected/disabled state;
- текстовую альтернативу графика;
- error announcement;
- hit target и focus order — дополнительно вручную на устройстве.

## 11. Практика

Напишите component tests экранов matches, match detail, meta, watchlist и account. Для каждого — success, empty, recoverable error и одно пользовательское действие.

Официальный справочник: [React Native Testing Library](https://callstack.github.io/react-native-testing-library/).

[Предыдущая глава](05-backend-e2e-critical-path.md) · [Оглавление](README.md) · [Следующая глава](07-maestro-device-e2e.md)

