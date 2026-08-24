# Глава 4. Функции, параметры, return и область видимости

## 1. Зачем нужна функция

Функция — именованный блок кода, который можно вызывать много раз.

Без функции:

```js
const firstKda = (10 + 8) / 2;
const secondKda = (4 + 12) / 4;
const thirdKda = (7 + 3) / 1;
```

С функцией:

```js
function calculateKda(kills, deaths, assists) {
  const safeDeaths = deaths === 0 ? 1 : deaths;
  return (kills + assists) / safeDeaths;
}

const firstKda = calculateKda(10, 2, 8);
const secondKda = calculateKda(4, 4, 12);
const thirdKda = calculateKda(7, 1, 3);
```

Формула теперь записана в одном месте.

## 2. Объявление функции

```js
function calculateKda(kills, deaths, assists) {
  const safeDeaths = deaths === 0 ? 1 : deaths;
  return (kills + assists) / safeDeaths;
}
```

Части:

- `function` — объявление;
- `calculateKda` — имя;
- `kills, deaths, assists` — параметры;
- `{ ... }` — тело;
- `return` — возвращаемое значение.

## 3. Параметр и аргумент

Параметры находятся в объявлении:

```js
function calculateKda(kills, deaths, assists) {
```

Аргументы находятся в конкретном вызове:

```js
calculateKda(10, 2, 8)
```

При вызове `kills` получает `10`, `deaths` получает `2`, а `assists` получает `8`. Порядок аргументов важен.

## 4. `return`

`return` завершает функцию и отдаёт значение вызывающему коду.

```js
function add(first, second) {
  return first + second;
}

const result = add(2, 3);
console.log(result); // 5
```

Без `return` функция возвращает `undefined`:

```js
function add(first, second) {
  const result = first + second;
}

console.log(add(2, 3)); // undefined
```

Локальная переменная `result` была рассчитана, но не отдана наружу.

## 5. Вывод и возврат — разные действия

```js
function printKda(kda) {
  console.log(kda);
}
```

Функция показывает значение, но не возвращает его для дальнейших вычислений.

```js
function roundKda(kda) {
  return Math.round(kda * 100) / 100;
}
```

Эта функция возвращает значение. Вызывающий код решает, что с ним делать:

```js
const rounded = roundKda(4.6666);
console.log(rounded);
```

Для бизнес-логики обычно удобнее возвращать данные, а вывод выполнять отдельно.

## 6. Ранний `return`

```js
function getMatchResult(status, radiantWin) {
  if (status !== "finished") {
    return "Матч не завершён";
  }

  if (radiantWin) {
    return "Radiant victory";
  }

  return "Dire victory";
}
```

Когда выполняется `return`, остальная часть функции не запускается. Ранний `return` помогает сначала обработать особые случаи.

## 7. Чистая функция

Чистая функция:

- получает данные через параметры;
- возвращает результат;
- не изменяет скрыто внешние данные;
- при одинаковых аргументах возвращает одинаковый результат.

```js
function calculateGpm(totalGold, durationMinutes) {
  return totalGold / durationMinutes;
}
```

Такую функцию легко тестировать.

Функция со скрытой зависимостью:

```js
let totalGold = 20000;

function calculateGpm() {
  return totalGold / 40;
}
```

Результат зависит от внешней переменной. При изменении `totalGold` поведение меняется, хотя аргументов нет.

## 8. Область видимости

Переменная, созданная внутри функции, доступна только внутри неё.

```js
function calculateKda(kills, deaths, assists) {
  const safeDeaths = deaths === 0 ? 1 : deaths;
  const result = (kills + assists) / safeDeaths;
  return result;
}

console.log(result); // ошибка: result не существует здесь
```

Параметры также локальны для функции.

## 9. Блочная область видимости

`const` и `let`, созданные внутри `{}`, недоступны снаружи блока.

```js
if (true) {
  const message = "Матч завершён";
  console.log(message);
}

console.log(message); // ошибка
```

## 10. Хорошее имя функции

Хорошие имена:

```text
calculateKda
formatMatchDuration
isValidPlayer
findPlayerById
```

Неинформативные имена:

```text
doIt
process
data
helper
```

Частые префиксы:

- `calculate...` — рассчитать;
- `get...` — получить;
- `find...` — найти;
- `format...` — отформатировать;
- `is...`/`has...` — вернуть boolean;
- `create...` — создать значение;
- `validate...` — проверить данные.

## 11. Одна ответственность

Плохо:

```js
function analyzeAndPrintAndSavePlayer() {
  // расчёт, форматирование, вывод и сохранение
}
```

Лучше разделить:

```js
function calculateKda() { /* расчёт */ }
function createPlayerSummary() { /* форматирование */ }
function printPlayerSummary() { /* вывод */ }
```

Когда функция делает одну вещь, её легче понять, проверить и переиспользовать.

## 12. Значения по умолчанию

```js
function formatPlayerName(name = "Anonymous") {
  return name;
}

console.log(formatPlayerName("Mira")); // Mira
console.log(formatPlayerName());       // Anonymous
```

Значение по умолчанию используется, если аргумент равен `undefined` или не передан.

## 13. Function declaration и arrow function

Обычная декларация:

```js
function calculateKda(kills, deaths, assists) {
  return (kills + assists) / (deaths === 0 ? 1 : deaths);
}
```

Arrow function:

```js
const calculateKda = (kills, deaths, assists) => {
  return (kills + assists) / (deaths === 0 ? 1 : deaths);
};
```

Сокращённая arrow function для одного выражения:

```js
const add = (first, second) => first + second;
```

На первом этапе используйте обычные `function` для именованной бизнес-логики. Arrow functions часто появятся при работе с массивами и React.

## 14. Декомпозиция задачи

```js
function calculateKda(kills, deaths, assists) {
  const safeDeaths = deaths === 0 ? 1 : deaths;
  return (kills + assists) / safeDeaths;
}

function roundToTwoDigits(value) {
  return Math.round(value * 100) / 100;
}

function createPlayerSummary(name, hero, kills, deaths, assists) {
  const kda = calculateKda(kills, deaths, assists);
  const roundedKda = roundToTwoDigits(kda);
  return `${name} на ${hero}: KDA ${roundedKda}`;
}

console.log(createPlayerSummary("Mira", "Rubick", 2, 3, 17));
```

Каждая функция решает отдельную маленькую задачу.

## 15. Упражнения

### Упражнение 1

Напишите `calculateGpm(totalGold, durationMinutes)`. Если `durationMinutes <= 0`, верните `0`.

### Упражнение 2

Напишите `getWinnerName(radiantWin)`, возвращающую `Radiant` или `Dire`.

### Упражнение 3

Напишите `isHighKda(kda)`, возвращающую `true`, если KDA не меньше `5`.

### Упражнение 4

Напишите `formatDuration(totalSeconds)`. Для `247` она должна вернуть строку `4:07`. Подсказки:

```js
Math.floor(247 / 60)
247 % 60
String(7).padStart(2, "0")
```

### Упражнение 5

Создайте `createPlayerSummary`, которая использует `calculateKda` и возвращает строку с именем, героем и округлённым KDA.

## Definition of Done

- Вы различаете объявление и вызов функции.
- Вы различаете параметры и аргументы.
- Вы понимаете `return`.
- Вы не используете `console.log` вместо возврата бизнес-результата.
- Вы понимаете локальную область видимости.
- Вы можете разбить расчёт на 2–3 маленькие функции.

