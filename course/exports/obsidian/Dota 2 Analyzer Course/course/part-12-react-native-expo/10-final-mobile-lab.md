# Глава 10. Итоговая лабораторная: мобильная оболочка

[← Глава 9](09-charts-accessibility-testing.md) · [Оглавление](README.md) · [Карта курса](../01-course-map.md)

## Цель

Собрать native navigation/UI/state skeleton на asynchronous fixtures через интерфейсы, которые в части 13 получат настоящий HTTP implementation.

## Структура

```text
apps/mobile/
├─ app/
│  ├─ _layout.tsx
│  ├─ (tabs)/
│  │  ├─ _layout.tsx
│  │  ├─ index.tsx
│  │  ├─ meta.tsx
│  │  └─ favorites.tsx
│  ├─ matches/[id].tsx
│  ├─ heroes/[id].tsx
│  └─ teams/[id].tsx
└─ src/
   ├─ api/
   │  ├─ contracts.ts
   │  ├─ interfaces.ts
   │  └─ fixture-api.ts
   ├─ app/providers/
   ├─ features/matches/
   ├─ features/meta/
   ├─ features/favorites/
   ├─ shared/components/
   ├─ shared/theme/
   ├─ state/preferences-store.ts
   └─ storage/
```

## Fixture API

```ts
export interface DotaApi {
  listMatches(input: ListMatchesInput): Promise<ListMatchesResponse>;
  getMatch(id: string): Promise<MatchDetail>;
  listHeroMeta(input: HeroMetaInput): Promise<HeroMetaResponse>;
}
```

`FixtureDotaApi` делает artificial delay, pagination и управляемую ошибку. Screens получают interface через module/provider composition, не импортируют fixture напрямую.

## Экраны

### Матчи

- FlatList;
- pull refresh;
- infinite next page;
- patch filter;
- list item открывает `/matches/[id]`;
- initial/loading-more/background/error/empty states.

### Деталь матча

- validated route ID;
- query detail;
- teams, winner, duration, participants/draft sections;
- ссылки team/hero;
- unknown/partial fields честно отображаются.

### Мета

- patch/min sample filter;
- accessible bars;
- counters и freshness;
- hero detail route;
- `n=0`/insufficient sample state.

### Избранное

- guest favorite team IDs в Zustand;
- derived detail queries;
- empty state;
- no duplicate IDs;
- позже server sync заменит action.

## Providers root

```text
ErrorBoundary
→ SafeArea/Theme provider
→ QueryClientProvider
→ Online/focus bridge
→ Expo Router Stack
```

Provider order документируйте. QueryClient создаётся один раз. Hydration/splash имеет timeout/failure.

## Acceptance tests

| Сценарий | Ожидание |
|---|---|
| cold start | app не висит, первая tab доступна |
| list success | virtualized cards |
| list empty/error | отдельные понятные states |
| pull refresh | старые data остаются, indicator |
| next page double trigger | один active fetch |
| tap match | correct dynamic route/detail |
| direct invalid link | safe invalid state |
| offline cache present | stale data + freshness |
| favorite toggle | persists/no duplicates |
| font 200% | controls/content доступны |
| TalkBack/VoiceOver | карточки/графики читаемы |

## Команды

```powershell
pnpm typecheck
pnpm test
pnpm expo start
```

Проверьте минимум Android native target и доступный второй target. Web — дополнительный, не основной acceptance.

## Commit plan

```text
chore(mobile): scaffold Expo Router application
feat(mobile): add tabs and match navigation
feat(matches): render virtualized paginated match list
feat(meta): add accessible hero meta screen
feat(state): add query and preferences boundaries
test(mobile): cover routes async states and accessibility
```

## Definition of done

- [ ] Expo Router Stack/Tabs и direct routes работают.
- [ ] Route params runtime validated.
- [ ] Native components/styles поддерживают safe area/font scale.
- [ ] Длинные данные через FlatList.
- [ ] Server state в TanStack Query, client state в Zustand.
- [ ] SecureStore только за abstraction и не для больших данных.
- [ ] Fixture API заменяем одним composition binding.
- [ ] Offline/loading/error/empty/freshness видимы.
- [ ] Charts имеют доступное text representation.
- [ ] Typecheck/tests/native manual matrix выполнены.
- [ ] Provider key отсутствует в bundle/storage.

## Результат после части 12

```text
backend `/v1`
           ↑ HTTP implementation добавим в части 13
mobile API interface
→ TanStack Query
→ Expo Router screens
→ FlatList/cards/details/meta chart
→ Zustand preferences + storage boundaries
```

Следующая часть соединит mobile с реальным backend: environment URL, generated OpenAPI client, query keys, cache invalidation, pagination, filters, reconnect и error UX.

[Перейти к части 13](../part-13-mobile-backend/README.md)
