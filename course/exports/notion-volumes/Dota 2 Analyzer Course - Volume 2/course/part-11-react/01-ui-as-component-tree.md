# Глава 1. Интерфейс как дерево компонентов

[← Оглавление](README.md) · [Глава 2 →](02-vite-react-project.md)

## Не начинайте с кода

Возьмите экран списка матчей и разделите его по ответственности:

```text
App
└─ MatchesPage
   ├─ PageHeader
   ├─ MatchFilters
   └─ MatchContent
      ├─ LoadingState | ErrorState | EmptyState
      └─ MatchList
         └─ MatchCard × N
```

Это не diagram классов. Компонент — повторяемый или логически самостоятельный участок UI.

## Data flow сверху вниз

```text
MatchesPage хранит selectedPatch
→ передаёт значение и callbacks в MatchFilters
→ получает/фильтрует matches
→ передаёт каждый match в MatchCard
```

Данные идут вниз через props. Событие поднимается callback-функцией: child сообщает «пользователь нажал», parent меняет state.

## Что является state

State — информация, изменение которой должно перерисовать UI:

- выбранный patch;
- выбранный match ID;
- введённый search text;
- состояние network request, если пока не используем query library.

Не state:

- `filteredMatches`, если его можно вычислить из `matches` и `selectedPatch`;
- `winnerLabel`, если он вычисляется из `winner`;
- constant список filter options;
- значение, которое нигде не влияет на render.

Чем меньше независимого state, тем меньше противоречий.

## Presentational и feature components

`MatchCard` получает готовую модель и вызывает `onPress`. Он не знает URL API. `MatchesPage` координирует данные и выбор. Разделение не обязано быть абсолютным, но network call внутри каждой карточки создаст N+1 и сложность.

## Props contract

```ts
export type MatchCardProps = {
  match: MatchSummary;
  selected: boolean;
  onSelect: (matchId: string) => void;
};
```

Названия описывают смысл. `onSelect` — функция, которую передаст parent. Child не знает, откроется modal, route или side panel.

## Composition вместо flags

Компонент с 20 boolean props трудно понимать:

```tsx
<Panel compact bordered error loading selected />
```

Часто лучше композиция:

```tsx
<Panel>
  <PanelHeader>Последние матчи</PanelHeader>
  <MatchList matches={matches} />
</Panel>
```

`children` — prop с вложенным JSX.

## Сначала статический макет

Порядок «Thinking in React»:

1. Опишите data model.
2. Разбейте UI на дерево.
3. Соберите static version без state.
4. Найдите минимальный state.
5. Определите владельца state.
6. Добавьте обратные callbacks.
7. Подключите внешние данные.

Так network bugs не смешиваются с базовым JSX.

## Практика

Нарисуйте деревья для match detail и hero meta. Для каждого component выпишите props, local state и события. Если значение можно вычислить — пометьте `derived`, а не state.

## Самопроверка

- [ ] Я вижу UI как дерево функций-компонентов.
- [ ] Источник каждого state один.
- [ ] Derived value не дублируется в state.
- [ ] Child сообщает событие callback, а не меняет parent напрямую.
