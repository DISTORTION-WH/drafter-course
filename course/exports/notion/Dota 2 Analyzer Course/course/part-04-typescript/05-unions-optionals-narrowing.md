# 5. Unions, optional fields и narrowing

## 1. Union ограничивает набор вариантов

```ts
type TeamSide = "radiant" | "dire";
```

Переменная принимает только один из двух literal types:

```ts
const side: TeamSide = "radiant";
```

Значение `"middle"` отклоняется до запуска.

## 2. Union разных типов

```ts
type MatchIdentifier = string | number;
```

До операции нужно узнать конкретный вариант:

```ts
function normalizeMatchId(id: string | number): string {
  if (typeof id === "number") {
    return String(id);
  }

  return id.trim();
}
```

Проверка `typeof` выполняет narrowing: внутри ветки compiler знает более узкий тип.

## 3. Optional property

```ts
interface Match {
  readonly id: string;
  readonly leagueName?: string;
}
```

`leagueName?` может отсутствовать. При чтении его тип — `string | undefined`.

```ts
const label = match.leagueName ?? "Лига не указана";
```

Оператор `??` использует правое значение только для `null` или `undefined`.

## 4. Optional не означает `null`

Эти модели различаются:

```ts
interface A {
  leagueName?: string;
}

interface B {
  leagueName: string | null;
}
```

- в A свойство может отсутствовать;
- в B свойство обязано существовать, но значение иногда `null`.

При `exactOptionalPropertyTypes` объект `{ leagueName: undefined }` не равен отсутствующему полю, если `undefined` не включён явно.

## 5. Discriminated union

Опишем состояние загрузки:

```ts
type LoadState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };
```

Поле `status` — discriminator.

```ts
function renderState(state: LoadState<readonly Match[]>): string {
  switch (state.status) {
    case "idle":
      return "Ожидание";
    case "loading":
      return "Загрузка";
    case "success":
      return `Матчей: ${state.data.length}`;
    case "error":
      return `Ошибка: ${state.message}`;
  }
}
```

В ветке `success` есть `data`; в `error` есть `message`. Невозможное состояние вроде `{ status: "success", message: "..." }` не соответствует union.

Это особенно важно для будущего React Native UI.

## 6. Narrowing через `in`

```ts
function printResult(value: { data: Match[] } | { error: string }): void {
  if ("data" in value) {
    console.log(value.data.length);
    return;
  }

  console.error(value.error);
}
```

## 7. Narrowing через `instanceof`

```ts
function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
```

Это стандартный способ обработать `catch` в strict mode.

## 8. Пользовательский type guard

```ts
function isTeamSide(value: unknown): value is TeamSide {
  return value === "radiant" || value === "dire";
}
```

Возвращаемый тип `value is TeamSide` сообщает compiler: если функция вернула `true`, значение безопасно считать `TeamSide`.

Guard обязан говорить правду. Такая реализация опасна:

```ts
function isPlayer(value: unknown): value is Player {
  return true;
}
```

Compiler доверится, но runtime-данные не изменятся.

## 9. Exhaustiveness и `never`

```ts
function assertNever(value: never): never {
  throw new Error(`Необработанный вариант: ${String(value)}`);
}
```

В switch:

```ts
function sideLabel(side: TeamSide): string {
  switch (side) {
    case "radiant":
      return "Radiant";
    case "dire":
      return "Dire";
    default:
      return assertNever(side);
  }
}
```

Если позже добавить `"neutral"`, compiler укажет на необработанную ветку.

## 10. Опасность non-null assertion

```ts
const first = players[0]!;
```

`!` говорит compiler «я гарантирую, что значение существует», но runtime-проверку не добавляет. Если массив пуст, ошибка всё равно произойдёт.

Для внешних данных лучше проверка:

```ts
const first = players[0];

if (first === undefined) {
  throw new Error("Нет игроков");
}
```

## Упражнения

1. Создайте `TeamSide`.
2. Опишите `LoadState<Match[]>`.
3. Обработайте все состояния через switch.
4. Добавьте новый вариант и посмотрите, как exhaustiveness находит пропуск.
5. Напишите честный `isTeamSide`.
6. Замените non-null assertion явной проверкой.

## Критерий готовности

Вы умеете сузить union до безопасного варианта и не применяете `!` только ради исчезновения красного подчёркивания.

