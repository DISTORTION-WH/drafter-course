# Глава 3. JSON, `unknown` и проверка границы

[← Глава 2](02-request-response.md) · [Оглавление](README.md) · [Глава 4 →](04-node-fetch.md)

## Главная мысль

TypeScript проверяет ваш исходный код, но не меняет ответ чужого сервера. Любой внешний JSON сначала имеет тип `unknown`.

## JSON не равен TypeScript-объекту

JSON поддерживает object, array, string, number, boolean и `null`. В нём нет `undefined`, `Date`, `bigint`, `Map`, функций и комментариев.

```ts
const rawText = '{"match_id":8000000000,"radiant_win":true}';
const value: unknown = JSON.parse(rawText);
```

Плохой вариант:

```ts
const match = JSON.parse(rawText) as Match;
```

`as Match` не проверяет ни одного поля. Это обещание компилятору, которое может быть ложным.

## Маленькие runtime-проверки

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequiredString(
  object: Record<string, unknown>,
  key: string,
): string {
  const value = object[key];

  if (typeof value !== 'string') {
    throw new Error(`${key} must be a string`);
  }

  return value;
}
```

`value is Record<string, unknown>` — type predicate. Если функция вернула `true`, TypeScript сужает тип. При этом функция действительно делает runtime-проверку.

## ID провайдера и ID нашего API

OpenDota может прислать `match_id` как JSON number. Внутри raw payload мы сохраняем значение неизменённым. В canonical model и собственном API преобразуем идентификатор в строку:

```ts
function readId(value: unknown, fieldName: string): string {
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return value;
  }

  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }

  throw new Error(`${fieldName} must be a safe non-negative ID`);
}
```

Если провайдер когда-нибудь пришлёт число больше `Number.MAX_SAFE_INTEGER`, JSON parser уже может потерять точность. Тогда контракт надо получать/разбирать иначе. Нельзя молча округлять.

## Минимальная модель ответа матча

Не надо сразу описывать сотни полей OpenDota. Опишите только то, что используете:

```ts
export type ProviderMatchSummary = {
  matchId: string;
  startTimeSeconds: number;
  durationSeconds: number;
  radiantWin: boolean;
};

export function parseProviderMatchSummary(input: unknown): ProviderMatchSummary {
  if (!isRecord(input)) {
    throw new Error('match payload must be an object');
  }

  const matchId = readId(input.match_id, 'match_id');
  const startTimeSeconds = readNonNegativeInteger(input.start_time, 'start_time');
  const durationSeconds = readNonNegativeInteger(input.duration, 'duration');

  if (typeof input.radiant_win !== 'boolean') {
    throw new Error('radiant_win must be boolean');
  }

  return { matchId, startTimeSeconds, durationSeconds, radiantWin: input.radiant_win };
}
```

`readNonNegativeInteger` напишите сами по образцу `readId`, но возвращайте `number`.

## Ошибка должна указывать путь

Для вложенного массива сообщение `hero_id must be number` недостаточно. Полезнее `players[4].hero_id must be a positive integer`. Позже можно подключить schema-библиотеку, но сначала важно понять сам процесс:

```text
unknown → проверка формы → проверка каждого нужного поля → новый объект
```

## Raw и parsed — разные значения

```ts
const rawPayload: unknown = JSON.parse(bodyText);
const match = parseProviderMatchSummary(rawPayload);
```

- `rawPayload` нужен для повторной нормализации и аудита;
- `match` — безопасная минимальная модель для текущего кода;
- изменение parser не изменяет сохранённый оригинал.

## Практика

Напишите минимум пять тестов parser:

1. корректный ответ;
2. `null` вместо объекта;
3. отсутствует `match_id`;
4. `duration` — строка;
5. `radiant_win` — `null`.

Тест ошибки должен проверять не только факт исключения, но и понятное имя поля.

## Самопроверка

- [ ] Внешний JSON входит как `unknown`.
- [ ] Я не использую `as Match` вместо проверки.
- [ ] Raw payload и canonical object хранятся отдельно.
- [ ] Идентификаторы покидают backend API как строки.
