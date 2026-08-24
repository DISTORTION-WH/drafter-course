# 8. Readonly и utility types

## 1. `readonly` защищает свойство от присваивания

```ts
interface Player {
  readonly accountId: string;
  readonly name: string;
}
```

После создания:

```ts
player.name = "New Name";
// ошибка compile-time
```

Это помогает соблюдать immutable-подход в domain-аналитике.

## 2. Readonly неглубокий

```ts
interface Match {
  readonly players: Player[];
}
```

Нельзя заменить `players` другим массивом, но сам массив остаётся изменяемым. Для защиты массива:

```ts
interface Match {
  readonly players: readonly Player[];
}
```

И это всё ещё compile-time механизм, не `Object.freeze`.

## 3. `Readonly<T>`

```ts
interface MutablePlayer {
  accountId: string;
  name: string;
}

type Player = Readonly<MutablePlayer>;
```

Utility type создаёт версию с readonly-свойствами первого уровня.

Для основных domain-моделей в курсе мы пишем `readonly` явно: контракт виден сразу. `Readonly<T>` удобен при преобразовании существующего типа.

## 4. `Partial<T>`

```ts
interface MatchFilters {
  patch: string;
  tournamentId: string;
  teamId: string;
}

type OptionalMatchFilters = Partial<MatchFilters>;
```

Все свойства становятся optional.

```ts
const filters: OptionalMatchFilters = {
  patch: "7.39",
};
```

`Partial` удобен для draft формы или patch-обновления, но не превращайте обязательную domain-модель в Partial только чтобы легче создать неполный объект.

## 5. `Required<T>`

Делает optional-свойства обязательными:

```ts
interface RawOptions {
  top?: number;
  minGames?: number;
}

type ResolvedOptions = Required<RawOptions>;
```

Функция нормализации:

```ts
function resolveOptions(options: RawOptions): ResolvedOptions {
  return {
    top: options.top ?? 5,
    minGames: options.minGames ?? 1,
  };
}
```

После normalization внутренний код не проверяет optional fields повторно.

## 6. `Pick<T, Keys>`

```ts
type PlayerPreview = Pick<Player, "accountId" | "name" | "hero">;
```

Новый тип содержит только выбранные свойства.

Полезно для узкой функции или UI preview. Однако API response лучше называть явно и проектировать как отдельный contract, если он развивается независимо.

## 7. `Omit<T, Keys>`

```ts
type PlayerWithoutStats = Omit<
  Player,
  "kills" | "deaths" | "assists"
>;
```

Удаляет выбранные свойства.

## 8. `Record<Keys, Value>`

```ts
type WinsBySide = Record<TeamSide, number>;

const wins: WinsBySide = {
  radiant: 1,
  dire: 2,
};
```

Compiler требует оба ключа и запрещает посторонний.

Сравнение:

- `Record` удобен для небольшого известного набора строковых ключей;
- `Map` удобен для динамической группировки во время выполнения.

## 9. `ReturnType`

```ts
function createSummary(match: Match) {
  return {
    id: match.id,
    winner: match.radiantWin
      ? match.radiantTeam.name
      : match.direTeam.name,
  };
}

type MatchSummary = ReturnType<typeof createSummary>;
```

Иногда это предотвращает дублирование. Но важную публичную domain-модель часто лучше объявить явно, чтобы контракт не менялся случайно вместе с implementation.

## 10. `Awaited<T>`

```ts
type LoadedValue = Awaited<ReturnType<typeof readJsonFile>>;
// unknown
```

`Awaited` получает тип успешного значения Promise.

## 11. `satisfies`

```ts
const labels = {
  radiant: "Radiant",
  dire: "Dire",
} satisfies Record<TeamSide, string>;
```

`satisfies` проверяет соответствие контракту, сохраняя более точный выведенный тип самого выражения. Это удобно для configuration objects.

Отличие от assertion:

- `satisfies` проверяет;
- `as` просит довериться.

## 12. Не стройте типы ради типов

Utility types полезны, когда отражают настоящую связь моделей. Цепочка вроде:

```ts
Readonly<Partial<Omit<Pick<...>>>>
```

часто труднее отдельного понятного interface. Читаемость важнее демонстрации возможностей type system.

## Упражнения

1. Сделайте `Player` readonly.
2. Проверьте разницу между readonly property и readonly array.
3. Создайте optional и resolved options.
4. Опишите `WinsBySide` через `Record`.
5. Создайте labels с `satisfies` и намеренно пропустите `dire`.
6. Объясните, почему `Partial<Match>` не является корректным завершённым матчем.

## Критерий готовности

Вы выбираете utility type по смыслу преобразования и понимаете, что readonly не выполняет глубокую runtime-заморозку.

