# 7. Типизация функций и generics

## 1. Сигнатура функции

```ts
function calculateWinRate(wins: number, games: number): number {
  return games === 0 ? 0 : (wins / games) * 100;
}
```

Сигнатура сообщает:

- `wins` должен быть `number`;
- `games` должен быть `number`;
- результат — `number`.

Параметры типизируйте явно. Return type у короткой внутренней функции можно вывести, но для публичного domain API явный результат помогает заметить случайное изменение контракта.

## 2. Optional и default parameter

Optional:

```ts
function formatHero(hero: string, games?: number): string {
  return games === undefined ? hero : `${hero}: ${games}`;
}
```

Default:

```ts
function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
```

Параметр с default может быть пропущен. Внутри `digits` уже является `number`.

## 3. Rest parameter

```ts
function sum(...values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

sum(7, 4, 9);
```

`...values` собирает аргументы в массив чисел.

## 4. Тип функции

```ts
type PlayerPredicate = (player: Player) => boolean;

const hasPositiveKda: PlayerPredicate = (player) => {
  return player.kills + player.assists > player.deaths;
};
```

Тип callback полезен, если один контракт повторяется.

Функция, принимающая callback:

```ts
function countPlayers(
  players: readonly Player[],
  predicate: PlayerPredicate,
): number {
  return players.filter(predicate).length;
}
```

## 5. Асинхронная функция

```ts
async function loadText(path: string): Promise<string> {
  return readFile(path, "utf8");
}
```

`async` всегда возвращает Promise. Type annotation описывает значение после успешного ожидания:

```ts
const text = await loadText(path); // string
```

Для JSON:

```ts
async function readJsonFile(path: string): Promise<unknown> {
  const text = await readFile(path, "utf8");
  return JSON.parse(text);
}
```

## 6. Зачем generics

Нужна функция, возвращающая первый элемент массива. Плохой вариант:

```ts
function first(items: any[]): any {
  return items[0];
}
```

Связь входа и выхода потеряна.

Generic-вариант:

```ts
function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}
```

`T` — type parameter, placeholder для конкретного типа.

```ts
const firstHero = first(["Rubick", "Luna"]);
// string | undefined

const firstScore = first([29, 19]);
// number | undefined
```

Compiler выводит `T` из аргумента.

## 7. Generic должен связывать типы

Почти бесполезно:

```ts
function logValue<T>(value: T): void {
  console.log(value);
}
```

Если type parameter используется только один раз и не создаёт связь, часто достаточно `unknown`:

```ts
function logValue(value: unknown): void {
  console.log(value);
}
```

Generic полезен, когда:

- результат связан со входом;
- два аргумента должны согласовываться;
- контейнер сохраняет тип элемента;
- callback преобразует `T` в `R`.

## 8. Generic map

```ts
function mapValues<T, R>(
  items: readonly T[],
  transform: (item: T) => R,
): R[] {
  return items.map(transform);
}
```

Использование:

```ts
const names = mapValues(players, (player) => player.name);
// string[]
```

`T` становится `Player`, `R` — `string`.

## 9. Generic constraint

```ts
function getId<T extends { id: string }>(entity: T): string {
  return entity.id;
}
```

`T` может содержать любые дополнительные свойства, но обязан иметь строковый `id`.

Без constraint compiler не разрешил бы `entity.id`, потому что произвольный T может быть числом.

## 10. `keyof`

```ts
function getProperty<T, K extends keyof T>(
  object: T,
  key: K,
): T[K] {
  return object[key];
}
```

```ts
const name = getProperty(player, "name");
// string
```

Ключ с опечаткой отклоняется.

Не превращайте каждую простую функцию в сложный generic. Используйте его, когда он сохраняет реальную связь типов.

## 11. Generic state

```ts
type LoadState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };
```

Одна модель состояния работает для матчей, героев и турниров:

```ts
type MatchHistoryState = LoadState<readonly Match[]>;
type HeroMetaState = LoadState<readonly HeroStats[]>;
```

## Упражнения

1. Типизируйте функцию win rate.
2. Опишите callback для фильтра игроков.
3. Реализуйте generic `first` без `any`.
4. Реализуйте `mapValues<T, R>`.
5. Напишите `getProperty` и передайте несуществующий ключ.
6. Объясните, почему `Promise<unknown>` корректнее `Promise<any>` на границе JSON.

## Критерий готовности

Вы используете generic для сохранения связи входных и выходных типов, а не как декоративную букву `<T>`.

