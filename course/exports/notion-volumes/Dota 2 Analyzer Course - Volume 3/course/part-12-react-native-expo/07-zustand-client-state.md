# Глава 7. Zustand и границы client state

[← Глава 6](06-tanstack-query.md) · [Оглавление](README.md) · [Глава 8 →](08-storage-and-offline.md)

## Когда local state достаточно

State одного screen/component остаётся в `useState`: открыт ли local section, draft input, press state. Zustand нужен, когда небольшой client state разделяется несвязанными routes/components:

- theme preference;
- applied meta filters между tabs;
- onboarding completed;
- local guest favorites до account sync;
- development environment switch только в dev build.

Matches response не Zustand — это server state/query cache.

## Typed store

```ts
import { create } from 'zustand';

type AppPreferencesState = {
  colorScheme: 'system' | 'light' | 'dark';
  guestFavoriteTeamIds: readonly string[];
  setColorScheme: (value: AppPreferencesState['colorScheme']) => void;
  toggleGuestFavoriteTeam: (teamId: string) => void;
  reset: () => void;
};

const initialState = {
  colorScheme: 'system' as const,
  guestFavoriteTeamIds: [] as readonly string[],
};

export const useAppPreferences = create<AppPreferencesState>((set) => ({
  ...initialState,
  setColorScheme: (colorScheme) => set({ colorScheme }),
  toggleGuestFavoriteTeam: (teamId) =>
    set((state) => ({
      guestFavoriteTeamIds: state.guestFavoriteTeamIds.includes(teamId)
        ? state.guestFavoriteTeamIds.filter((id) => id !== teamId)
        : [...state.guestFavoriteTeamIds, teamId],
    })),
  reset: () => set(initialState),
}));
```

ID validate на boundary. Store action не принимает arbitrary object из API.

## Selectors

```tsx
const colorScheme = useAppPreferences((state) => state.colorScheme);
const setColorScheme = useAppPreferences((state) => state.setColorScheme);
```

Не подписывайте component на весь store `useAppPreferences()` без нужды: он re-render при любом изменении.

## Derived values

```tsx
const isFavorite = useAppPreferences(
  (state) => state.guestFavoriteTeamIds.includes(teamId),
);
```

Для сложных selectors следите за reference equality; не возвращайте новый array/object каждый раз без equality strategy/memo.

## Actions вместо прямых details

Components вызывают `toggleGuestFavoriteTeam(id)`, не знают, как массив хранится. Позже action можно заменить server mutation/query invalidation.

## Reset и logout

User logout должен:

- удалить tokens SecureStore;
- очистить user-specific query cache;
- reset user-specific Zustand slices;
- не обязательно удалять public cached matches;
- обработать ошибки storage.

Один `reset` облегчает это и тесты.

## Persistence осторожно

Persist только нужные поля, version storage schema, validate hydrated JSON. Actions/functions не сериализуются. Migration старой persisted shape обязательна после release.

## Global store не лечит prop drilling автоматически

Если state нужен parent и двум children, lifting state проще. Глобальный store добавляет hidden dependency. Используйте осознанно.

## Практика

Создайте preferences store и unit tests: toggle add/remove, no duplicates, reset, invalid hydration. Подпишите два components на разные slices и через profiler проверьте лишние renders.

## Самопроверка

- [ ] Local state не переносится в store без причины.
- [ ] Server data остаётся в Query.
- [ ] Components используют selectors/actions.
- [ ] Persisted state versioned/validated.
- [ ] Есть reset для logout/tests.
