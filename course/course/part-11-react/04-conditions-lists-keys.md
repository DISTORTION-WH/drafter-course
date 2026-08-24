# Глава 4. Условия, списки и стабильные keys

[← Глава 3](03-jsx-components-props.md) · [Оглавление](README.md) · [Глава 5 →](05-events-state-render.md)

## Условный render

```tsx
function MatchPatch({ patch }: { patch: string | null }) {
  if (patch === null) {
    return <span className="muted">Patch неизвестен</span>;
  }

  return <span>Patch {patch}</span>;
}
```

Early return удобен для существенно разных состояний.

Ternary для короткого выбора:

```tsx
<span>{isSelected ? 'Выбран' : 'Открыть'}</span>
```

`&&` для необязательного фрагмента:

```tsx
{errorMessage !== null && <p role="alert">{errorMessage}</p>}
```

Осторожно: `{count && <Badge />}` при `count=0` может вывести `0`. Пишите `{count > 0 && ...}`.

## Списки через `map`

```tsx
type MatchListProps = {
  matches: readonly MatchSummary[];
  onSelect: (id: string) => void;
};

export function MatchList({ matches, onSelect }: MatchListProps) {
  return (
    <div className="match-list">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} onSelect={onSelect} />
      ))}
    </div>
  );
}
```

`map` превращает каждый data object в JSX element.

## Что такое `key`

Key сообщает React identity элемента среди соседей. При insert/reorder React сопоставляет старые и новые элементы.

Хороший key:

- стабилен между renders;
- уникален среди siblings;
- берётся из data identity.

Плохие:

```tsx
key={index}       // ломается при reorder/insert
key={Math.random()} // новый identity каждый render
```

Match ID подходит. Если один match выводится дважды в одном списке по разным ролям, составьте стабильный composite key.

## Key не приходит в props

`key` служебный для React. Если child нужен ID, передайте отдельно `match={match}` или `matchId={match.id}`.

## Empty state

```tsx
if (matches.length === 0) {
  return <EmptyState title="Матчей по этому фильтру нет" />;
}
```

Пустой массив — успешный результат, не network error.

## Сортировка без мутации props

`Array.prototype.sort` мутирует array. Для readonly input:

```ts
const sorted = [...matches].sort(
  (left, right) => right.startedAt.localeCompare(left.startedAt),
);
```

Но backend уже выдаёт stable sort. Не пересортировывайте без product reason.

## Несколько состояний

Не пишите четыре независимых `if`, которые одновременно покажут spinner и error. Зафиксируйте приоритет или discriminated union:

```ts
type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };
```

Switch делает невозможные комбинации труднее.

## Практика

Выведите пять mock matches, empty array и error state. Переставьте элементы и убедитесь, что key — match ID. Создайте exhaustive `switch` с `assertNever` для LoadState.

## Самопроверка

- [ ] Empty отличается от error.
- [ ] `key` стабилен и не index/random.
- [ ] Props array не сортируется мутацией.
- [ ] Load states не противоречат друг другу.
