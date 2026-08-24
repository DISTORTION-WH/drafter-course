# Глава 5. События, state и render snapshot

[← Глава 4](04-conditions-lists-keys.md) · [Оглавление](README.md) · [Глава 6 →](06-forms-and-state-design.md)

## `useState`

```tsx
import { useState } from 'react';

export function MatchesPage() {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  // ...
}
```

`selectedMatchId` — значение текущего render. `setSelectedMatchId` просит React поставить обновление и выполнить новый render. Переменная не меняется мгновенно внутри уже выполняющегося handler.

## State как snapshot

```tsx
const [count, setCount] = useState(0);

function handleClick() {
  setCount(count + 1);
  setCount(count + 1);
}
```

Обе строки видят тот же `count`. Для последовательных updates:

```tsx
setCount((previous) => previous + 1);
setCount((previous) => previous + 1);
```

Updater получает последнее queued значение.

## Handler и аргумент

```tsx
function handleSelect(matchId: string): void {
  setSelectedMatchId(matchId);
}

<MatchCard onSelect={handleSelect} />
```

Child вызывает `onSelect(match.id)`. Не создавайте state внутри loop/condition: hooks вызываются только на верхнем уровне component/custom hook в одинаковом порядке.

## Объекты и arrays обновляются без мутации

```tsx
type Filters = { patch: string; search: string };
const [filters, setFilters] = useState<Filters>({ patch: 'all', search: '' });

setFilters((previous) => ({
  ...previous,
  patch: nextPatch,
}));
```

Spread создаёт новый object и сохраняет остальные поля. Не пишите `filters.patch = nextPatch`.

Array:

```tsx
setFavoriteIds((previous) =>
  previous.includes(id)
    ? previous.filter((value) => value !== id)
    : [...previous, id],
);
```

## State сохраняется по позиции дерева

React связывает state с позицией component. Изменение `key` или component type может сбросить state. Не генерируйте key для form на каждом render.

## Derived state

```tsx
const selectedMatch = matches.find((match) => match.id === selectedMatchId) ?? null;
```

Не храните одновременно `selectedMatchId` и копию `selectedMatch`: они могут разойтись. ID — минимальный source of truth.

## Events

Browser event types:

```tsx
import type { MouseEvent } from 'react';

function handleButtonClick(event: MouseEvent<HTMLButtonElement>) {
  console.log(event.currentTarget.name);
}
```

Часто child скрывает browser event и отдаёт domain event `onSelect(id)`, чтобы parent не зависел от DOM.

## Практика

Реализуйте selection match, favorite toggle и кнопку reset. Проверьте быстрые два toggles через functional updater. Не храните selected object отдельно от ID.

## Самопроверка

- [ ] State — snapshot конкретного render.
- [ ] Update на основе прошлого использует functional form.
- [ ] Objects/arrays не мутируются.
- [ ] Derived values вычисляются, не дублируются.
- [ ] Hooks не вызываются в condition/loop.
