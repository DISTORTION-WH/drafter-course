# Глава 10. Итоговая лабораторная: web-список матчей

[← Глава 9](09-accessibility-and-testing.md) · [Оглавление](README.md) · [Часть 12 →](../part-12-react-native-expo/README.md)

## Цель

Собрать working web vertical slice, где каждый слой можно объяснить:

```text
VITE_API_BASE_URL
→ typed API client + runtime parser
→ useMatches
→ MatchesPage state
→ filters/states/list/cards/detail
→ user interaction tests
```

## Структура

```text
apps/web-lab/src/
├─ main.tsx
├─ app/App.tsx
├─ api/
│  ├─ client.ts
│  ├─ contracts.ts
│  └─ parsers.ts
├─ features/matches/
│  ├─ MatchesPage.tsx
│  ├─ MatchFilters.tsx
│  ├─ MatchList.tsx
│  ├─ MatchCard.tsx
│  ├─ MatchDetailPanel.tsx
│  ├─ useMatches.ts
│  └─ __tests__/
├─ shared/components/
│  ├─ LoadingState.tsx
│  ├─ ErrorState.tsx
│  └─ EmptyState.tsx
└─ styles/
```

## Реализация по шагам

1. Создайте mock `MatchSummary[]` и static tree.
2. Добавьте typed props и accessible controls.
3. Выведите list со stable keys.
4. Добавьте selected match ID и detail panel.
5. Добавьте controlled patch/search filters.
6. Создайте LoadState union и четыре UI состояния.
7. Реализуйте API client/parser.
8. Соедините `useMatches` с AbortController.
9. Добавьте error boundary и safe messages.
10. Напишите tests и production build.

## Деталь выбора

`selectedMatchId` может исчезнуть после filter/refetch. Derived `selectedMatch` станет `null`; закройте detail или покажите понятное сообщение. Не храните устаревший object.

## Mock и real API

Если backend ещё не запущен, используйте fake implementation того же interface:

```ts
export interface MatchesApi {
  list(input: ListMatchesInput): Promise<ListMatchesResponse>;
}
```

App composition выбирает `HttpMatchesApi` или `FixtureMatchesApi`. Component не знает выбор. Не размазывайте `if (useMock)` по UI.

## Acceptance tests

| Сценарий | Ожидание |
|---|---|
| initial request | loading status |
| success 3 items | 3 cards |
| empty items | empty, не error |
| API error | safe alert + retry |
| retry success | list появляется |
| patch change | новый request/visible data |
| select card | detail нужного ID |
| reorder list | selection не прыгает |
| stale response | не перезаписывает новый |
| invalid response | contract error, не crash raw |

## Команды

```powershell
pnpm lint
pnpm test
pnpm build
pnpm preview
```

Проверьте Network tab: запросы не содержат provider key, response IDs — strings, CORS allowlist корректен.

## Commit plan

```text
chore(web): scaffold React TypeScript lab
feat(matches-ui): render accessible match list
feat(matches-ui): add filters and selection
feat(web-api): load and validate backend matches
test(matches-ui): cover async states and interactions
```

## Definition of done

- [ ] Static tree разбит на понятные components.
- [ ] Props/state strict typed, без `any`.
- [ ] Derived values не дублируются в state/effects.
- [ ] Keys — match IDs.
- [ ] Fetch отменяется/игнорирует stale response.
- [ ] Loading/error/empty/success раздельны.
- [ ] API response runtime validated.
- [ ] UI доступен keyboard и semantic queries.
- [ ] Tests и production build проходят.
- [ ] Вы можете объяснить каждый state, callback и Effect.

## Результат

Вы понимаете React независимо от mobile. В части 12 та же модель будет перенесена в Expo: `div/button` заменятся на `View/Pressable`, browser list — на виртуализированный `FlatList`, а URL navigation — на Expo Router.
