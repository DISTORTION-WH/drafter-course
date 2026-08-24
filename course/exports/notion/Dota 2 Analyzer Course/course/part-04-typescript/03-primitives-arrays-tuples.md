# 3. Примитивы, массивы, tuples и inference

## 1. Primitive types

Основные типы:

```ts
const teamName: string = "Aurora Owls";
const durationSeconds: number = 2470;
const radiantWin: boolean = true;
const missingValue: null = null;
const notAssigned: undefined = undefined;
```

Пишите `string`, `number`, `boolean`, а не объектные `String`, `Number`, `Boolean`.

JavaScript имеет один обычный числовой тип `number`; отдельного `int` в TypeScript нет.

## 2. Inference переменных

```ts
const durationSeconds = 2470;
```

Редактор знает, что значение числовое. Попытка вызвать строковый метод даст ошибку:

```ts
durationSeconds.toUpperCase();
```

У `let` тип обычно расширяется:

```ts
let kills = 0; // number
kills = 7;     // допустимо
kills = "7";   // ошибка
```

## 3. Literal types

У `const` значение не переназначается:

```ts
const side = "radiant";
```

TypeScript может сохранить literal type `"radiant"`, а не просто `string`.

Literal types позволяют описывать закрытый набор значений:

```ts
type TeamSide = "radiant" | "dire";
```

## 4. Массивы

Две равнозначные записи:

```ts
const kills: number[] = [7, 4, 9];
const assists: Array<number> = [14, 18, 11];
```

Обычно для простого элемента используют `T[]`, а `Array<T>` полезна в generic-контексте.

Массив объектов:

```ts
interface PlayerPreview {
  name: string;
  kills: number;
}

const players: PlayerPreview[] = [
  { name: "North", kills: 7 },
  { name: "River", kills: 4 },
];
```

## 5. Readonly array

```ts
function totalKills(players: readonly PlayerPreview[]): number {
  return players.reduce((sum, player) => sum + player.kills, 0);
}
```

Внутри функции нельзя:

```ts
players.push({ name: "Unexpected", kills: 99 });
players.sort(/* ... */);
```

Это compile-time защита контракта. Сам JavaScript-массив не становится замороженным во время выполнения.

## 6. Индекс может отсутствовать

```ts
const first = players[0];
```

При `noUncheckedIndexedAccess` тип — `PlayerPreview | undefined`.

Проверка:

```ts
if (first === undefined) {
  throw new Error("Список игроков пуст");
}

console.log(first.name);
```

После `if` compiler сужает тип до `PlayerPreview`.

## 7. Tuple

Tuple — массив фиксированной структуры:

```ts
type Score = readonly [radiant: number, dire: number];

const score: Score = [29, 19];
```

Позиции имеют смысл:

```ts
const [radiantKills, direKills] = score;
```

Tuple подходит, когда:

- элементов немного;
- число позиций фиксировано;
- каждая позиция имеет ясное значение.

Для большой domain-модели объект читается лучше:

```ts
interface TeamScore {
  radiant: number;
  dire: number;
}
```

## 8. `as const`

```ts
const supportedSides = ["radiant", "dire"] as const;
```

Тип становится readonly tuple с literal-элементами. Из него можно получить union:

```ts
type TeamSide = (typeof supportedSides)[number];
```

Разбор:

- `typeof supportedSides` получает тип переменной;
- `[number]` получает тип элемента массива;
- итог: `"radiant" | "dire"`.

`as const` — не способ исправлять случайные type errors. Он полезен для настоящих константных наборов.

## 9. `null` и `undefined`

В strict mode:

```ts
let selectedMatch: Match | null = null;
```

До обращения нужна проверка:

```ts
if (selectedMatch === null) {
  return;
}

console.log(selectedMatch.id);
```

Не используйте `null` и `undefined` без различимого смысла. Например:

- `undefined` — optional field отсутствует;
- `null` — источник явно сообщает «значения нет».

## 10. `void`

Функция ничего полезного не возвращает:

```ts
function printTitle(title: string): void {
  console.log(title);
}
```

`void` не означает, что функция не выполняет работу. Она может печатать, записывать файл или менять состояние; просто вызывающий код не получает meaningful result.

## Упражнения

1. Типизируйте массив match ID.
2. Сделайте параметр функции readonly-массивом и попробуйте вызвать `push`.
3. Опишите счёт матча tuple и объектом; сравните читаемость.
4. Создайте `supportedSides as const` и выведите из него union.
5. Безопасно получите первого игрока при включённом `noUncheckedIndexedAccess`.

## Критерий готовности

Вы умеете отличать обычный массив, readonly-массив и tuple и понимаете, почему `players[0]` не гарантирует наличие игрока.

