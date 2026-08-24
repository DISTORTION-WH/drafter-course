# 6. `unknown`, `any` и runtime validation

## 1. Почему внешний JSON имеет тип `unknown`

```ts
const value: unknown = JSON.parse(text);
```

Мы знаем, что JSON создал некоторое значение, но ещё не знаем его форму. Это может быть:

- массив матчей;
- объект ошибки;
- строка;
- `null`;
- корректный матч с одним повреждённым полем.

`unknown` заставляет проверить значение до использования.

## 2. Чем опасен `any`

```ts
const value: any = JSON.parse(text);

console.log(value.matches[0].players[999].hero.name);
```

Compiler почти перестаёт помогать. `any` распространяется дальше по выражениям.

Сравнение:

```ts
const safeValue: unknown = JSON.parse(text);
safeValue.matches;
// ошибка: форма unknown не проверена
```

`unknown` — безопасное признание незнания. `any` — отключение проверки.

## 3. `as Match[]` не проверяет данные

```ts
const matches = JSON.parse(text) as Match[];
```

Type assertion не создаёт runtime-код. Эта запись только просит compiler довериться разработчику.

Если JSON содержит строку, она не превратится в массив.

Используйте `as` лишь когда у вас есть доказательство, которое compiler не может выразить. Внешний JSON таким доказательством не является.

## 4. Начинаем проверку с record

```ts
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}
```

Почему три проверки:

- `typeof null === "object"`, поэтому исключаем `null`;
- массив тоже объект, но у него другой контракт;
- после guard свойства record имеют тип `unknown`, а не `any`.

## 5. Маленькие assertion functions

```ts
function assertNonEmptyString(
  value: unknown,
  path: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${path} должен быть непустой строкой`);
  }
}
```

`asserts value is string` означает:

- если функция вернулась нормально, `value` — строка;
- иначе функция обязана бросить ошибку.

Использование:

```ts
assertNonEmptyString(raw.name, "player.name");
raw.name.toUpperCase();
```

После assertion compiler знает тип `raw.name`.

## 6. Parser лучше слепого cast

```ts
function parseHero(value: unknown, path: string): Hero {
  assertNonEmptyString(value, path);

  return {
    name: value,
  };
}
```

Функция:

1. принимает недоверенное `unknown`;
2. проверяет runtime-условие;
3. создаёт новый domain-объект;
4. возвращает гарантированный `Hero`.

## 7. Parser игрока

```ts
function parsePlayer(value: unknown, path: string): Player {
  if (!isRecord(value)) {
    throw new TypeError(`${path} должен быть объектом`);
  }

  assertNonEmptyString(value.accountId, `${path}.accountId`);
  assertNonEmptyString(value.name, `${path}.name`);
  assertNonEmptyString(value.hero, `${path}.hero`);
  assertNonNegativeNumber(value.kills, `${path}.kills`);

  return {
    accountId: value.accountId,
    name: value.name,
    hero: { name: value.hero },
    kills: value.kills,
    // остальные проверенные поля
  };
}
```

Мы создаём новый объект, а не возвращаем raw record. Это одновременно validation и normalization.

## 8. Parser массива

```ts
function parseMatchHistory(value: unknown): readonly Match[] {
  if (!Array.isArray(value)) {
    throw new TypeError("История матчей должна быть массивом");
  }

  if (value.length === 0) {
    throw new TypeError("История матчей не должна быть пустой");
  }

  return value.map((match, index) => {
    return parseMatch(match, `История матчей[${index}]`);
  });
}
```

`Array.isArray` сужает корень до массива, но элементы всё ещё требуют проверки.

## 9. Runtime invariants

Types описывают форму:

```ts
players: readonly Player[]
```

Но не доказывают:

- игроков ровно 10;
- по 5 игроков каждой стороны;
- account ID не повторяются;
- duration больше нуля;
- матч завершён.

Эти правила parser проверяет обычными условиями.

## 10. Validation library появится позже

В production часто применяют schema-библиотеки. Но сначала важно самостоятельно понять:

- откуда появляется `unknown`;
- как происходит narrowing;
- что именно проверяется runtime;
- почему schema не равна TypeScript interface.

После этого библиотека будет осознанным сокращением повторяющегося кода, а не магией.

## Упражнения

1. Сравните поведение `any` и `unknown` в редакторе.
2. Напишите `isRecord`.
3. Напишите assertions для строки и неотрицательного числа.
4. Создайте `parseHero` и `parsePlayer`.
5. Передайте `null`, массив и объект с отрицательными kills.
6. Уберите все `as Player` из parser.

## Критерий готовности

Вы можете провести недоверенное значение от `unknown` до `Player` только через реальные проверки и создание нового объекта.

