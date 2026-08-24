# Глава 3. JSX, компоненты и props

[← Глава 2](02-vite-react-project.md) · [Оглавление](README.md) · [Глава 4 →](04-conditions-lists-keys.md)

## JSX — описание UI

```tsx
export function PageHeader() {
  return (
    <header className="page-header">
      <h1>Dota Analyzer</h1>
      <p>Профессиональные матчи и мета</p>
    </header>
  );
}
```

Имя custom component начинается с заглавной буквы. Lowercase `header` — HTML element. JSX строже HTML: `img` закрывается `<img />`, CSS class задаётся `className`.

## Выражения в фигурных скобках

```tsx
const title = 'Последние матчи';
return <h2>{title}</h2>;
```

В `{}` находится выражение, которое возвращает значение. `if` — statement, поэтому его обычно пишут до `return`.

## Typed props

```ts
export type MatchSummary = {
  id: string;
  startedAt: string;
  durationSeconds: number;
  patch: string | null;
  winner: 'radiant' | 'dire';
  radiantTeam: { id: string; name: string } | null;
  direTeam: { id: string; name: string } | null;
};
```

```tsx
type MatchCardProps = {
  match: MatchSummary;
  onSelect: (id: string) => void;
};

export function MatchCard({ match, onSelect }: MatchCardProps) {
  const radiantName = match.radiantTeam?.name ?? 'Неизвестная команда';
  const direName = match.direTeam?.name ?? 'Неизвестная команда';

  function handleClick(): void {
    onSelect(match.id);
  }

  return (
    <article className="match-card">
      <h3>{radiantName} — {direName}</h3>
      <p>Победитель: {match.winner}</p>
      <button type="button" onClick={handleClick}>Открыть</button>
    </article>
  );
}
```

Destructuring `{ match, onSelect }` извлекает поля props. `handleClick` передаётся как функция: `onClick={handleClick}`, не вызывается во время render через `handleClick()`.

## Props read-only

Нельзя менять `match.winner = ...` внутри child. Props — вход функции. Если parent должен изменить state, child вызывает callback.

## Pure render

Нельзя:

```tsx
function MatchCard() {
  fetch('/api');                 // side effect во время render
  localStorage.setItem(...);     // side effect
  return ...;
}
```

Можно вычислять:

```tsx
const durationMinutes = Math.floor(match.durationSeconds / 60);
```

При одинаковых props/state render должен описывать тот же UI.

## `children`

```tsx
import type { ReactNode } from 'react';

type PanelProps = { title: string; children: ReactNode };

function Panel({ title, children }: PanelProps) {
  return <section><h2>{title}</h2>{children}</section>;
}
```

Использование:

```tsx
<Panel title="Матчи"><MatchList matches={matches} /></Panel>
```

## Не используйте `React.FC` автоматически

Обычная typed function понятна и явно описывает `children`, когда он нужен. Оба стиля возможны, но курс использует функции с props type.

## Практика

Создайте `TeamName`, `WinnerBadge`, `MatchCard`. `WinnerBadge` принимает `winner` union, а не произвольную строку. Для unknown team покажите понятный текст, но не создавайте fake team object.

## Самопроверка

- [ ] Component name с заглавной буквы.
- [ ] Props имеют точный TypeScript type.
- [ ] Props не мутируются.
- [ ] Event handler передаётся, а не вызывается при render.
- [ ] Render не делает сеть/storage/timer.
