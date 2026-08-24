# 9. Ошибки, `never` и Result-модель

## 1. Ошибка в `catch` имеет тип `unknown`

При strict mode:

```ts
try {
  await readJsonFile(path);
} catch (error) {
  console.error(error.message);
  // error имеет тип unknown
}
```

JavaScript позволяет бросить что угодно:

```ts
throw "сломалось";
throw 404;
throw { reason: "bad data" };
```

Поэтому сначала narrowing:

```ts
function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : String(error);
}
```

## 2. Добавление cause

```ts
try {
  return await readFile(path, "utf8");
} catch (error) {
  throw new Error(`Не удалось прочитать ${path}`, {
    cause: error,
  });
}
```

`cause` может быть unknown. При печати цепочки каждый элемент снова проверяется.

## 3. Функция, которая всегда бросает

```ts
function fail(message: string): never {
  throw new Error(message);
}
```

`never` означает: нормального возвращаемого значения не существует.

После вызова compiler знает, что управление не продолжится:

```ts
const first = players[0];

if (first === undefined) {
  fail("Нет игроков");
}

console.log(first.name);
```

## 4. Exhaustive switch

```ts
function assertNever(value: never): never {
  throw new Error(`Неизвестный вариант: ${String(value)}`);
}
```

Эта функция нужна не ради runtime-ошибки, а чтобы compiler доказал обработку всех вариантов union.

## 5. Когда бросать exception

Exception подходит, если:

- нарушен обязательный инвариант;
- файл не может быть прочитан;
- JSON синтаксически повреждён;
- выполнение use case невозможно продолжить;
- вызывающий слой должен либо обработать сбой, либо завершить операцию.

Например, CLI не может построить отчёт без входной истории — верхний `main` ловит ошибку и выставляет exit code 1.

## 6. Ожидаемый отрицательный результат

Иногда отсутствие данных — обычная ветка:

```ts
type FindMatchResult =
  | { ok: true; match: Match }
  | { ok: false; reason: "not-found" };
```

Использование:

```ts
const result = findMatch(matches, id);

if (!result.ok) {
  return "Матч не найден";
}

return result.match.id;
```

Здесь compiler заставляет обработать оба варианта.

## 7. Generic Result

```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

Пример domain-error:

```ts
type FilterError =
  | { code: "INVALID_LIMIT"; message: string }
  | { code: "UNSUPPORTED_PATCH"; message: string };

function resolveFilters(
  input: unknown,
): Result<ResolvedFilters, FilterError> {
  // ...
}
```

Result полезен, когда ошибки являются частью ожидаемого contract и вызывающий код должен их различать.

## 8. Не смешиваем подходы случайно

Плохой API:

```ts
function loadMatch(): Match | null | undefined {
  // иногда бросает, иногда null, иногда undefined
}
```

Выберите ясное правило:

- `Promise<Match>` и documented exceptions;
- `Promise<Match | null>` для обычного not-found;
- `Promise<Result<Match, LoadError>>` для типизированных outcomes.

В учебном CLI I/O и validation бросают ошибки. Это сохраняет pipeline простым. Result мы вводим как модель для будущих API и UI-состояний.

## 9. Custom error class — только при необходимости

```ts
class ValidationError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "ValidationError";
    this.path = path;
  }
}
```

Класс оправдан, если код действительно различает ошибки через `instanceof`, code или дополнительные поля. Не создавайте десятки классов только ради названий.

## Упражнения

1. Напишите `errorMessage(error: unknown)`.
2. Создайте `fail(): never`.
3. Проверьте union через exhaustive switch.
4. Опишите Result поиска матча.
5. Решите, какие ошибки parser должны бросаться, а какой исход поиска является обычным not-found.

## Критерий готовности

Вы не обращаетесь к `error.message` без narrowing и можете осознанно выбрать exception или Result для конкретного контракта.

