# Глава 6. Формы, структура state и lifting state up

[← Глава 5](05-events-state-render.md) · [Оглавление](README.md) · [Глава 7 →](07-effects-and-cleanup.md)

## Controlled input

```tsx
type MatchFiltersProps = {
  patch: string;
  search: string;
  onPatchChange: (patch: string) => void;
  onSearchChange: (value: string) => void;
};

export function MatchFilters(props: MatchFiltersProps) {
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <label htmlFor="match-search">Поиск команды</label>
      <input
        id="match-search"
        value={props.search}
        onChange={(event) => props.onSearchChange(event.target.value)}
      />

      <label htmlFor="patch-filter">Patch</label>
      <select
        id="patch-filter"
        value={props.patch}
        onChange={(event) => props.onPatchChange(event.target.value)}
      >
        <option value="all">Все</option>
        <option value="7.XX">7.XX</option>
      </select>
    </form>
  );
}
```

Value приходит из state, `onChange` обновляет state — input controlled.

## Где хранить state

Если filter и list должны видеть значение, их ближайший общий parent `MatchesPage` владеет state:

```tsx
const [patch, setPatch] = useState('all');
const [search, setSearch] = useState('');

<MatchFilters
  patch={patch}
  search={search}
  onPatchChange={setPatch}
  onSearchChange={setSearch}
/>
```

Это lifting state up.

## Не делайте mirror props

Плохо:

```tsx
function Filter({ patch }: { patch: string }) {
  const [localPatch, setLocalPatch] = useState(patch);
}
```

Если parent изменит `patch`, local copy не обновится. Либо component controlled и использует prop, либо local draft имеет ясное правило reset/apply.

## Draft и applied filters

Если запрос не должен отправляться при каждом символе:

```ts
const [draft, setDraft] = useState<Filters>(initialFilters);
const [applied, setApplied] = useState<Filters>(initialFilters);

function handleSubmit() {
  setApplied(draft);
}
```

Два state оправданы разной семантикой. Названия исключают путаницу.

## Вычисляем filtering

```tsx
const normalizedSearch = search.trim().toLocaleLowerCase();
const visibleMatches = matches.filter((match) => {
  const patchMatches = patch === 'all' || match.patch === patch;
  const teamNames = [match.radiantTeam?.name, match.direTeam?.name]
    .filter((name): name is string => name !== undefined && name !== null)
    .join(' ')
    .toLocaleLowerCase();
  return patchMatches && teamNames.includes(normalizedSearch);
});
```

Для server filters отправляйте normalized criteria backend; local filtering здесь учебный этап.

## Validation

Filter errors — данные UI:

```ts
function validateDateRange(from: string, to: string): string | null {
  if (from === '' || to === '') return 'Заполните обе даты';
  if (new Date(from) >= new Date(to)) return 'Начало должно быть раньше конца';
  return null;
}
```

Date parsing browser input требует точного timezone contract. Для MVP patch filter проще.

## Практика

Создайте controlled search и patch select. Добавьте reset. Затем добавьте режим Apply, разделив draft/applied. Объясните, почему `visibleMatches` не state.

## Самопроверка

- [ ] Controlled input имеет value и onChange.
- [ ] Shared state живёт у ближайшего общего parent.
- [ ] Props не копируются в state без отдельной семантики.
- [ ] Draft и applied названы явно.
- [ ] Filter result вычисляется из sources.
