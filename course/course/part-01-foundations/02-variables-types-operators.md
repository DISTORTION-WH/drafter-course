# Глава 2. Значения, переменные, типы и операции

## 1. Что такое переменная

Переменная — имя, через которое программа обращается к значению.

```js
const kills = 10;
```

Здесь:

- `const` — способ объявления;
- `kills` — выбранное нами имя;
- `=` — присваивание;
- `10` — значение;
- вся строка создаёт переменную.

Имя позволяет не писать число `10` в каждой формуле и объясняет, что это число означает.

## 2. `const` и `let`

Используйте `const`, если переменной не нужно назначать другое значение.

```js
const matchId = "8123456789";
const heroName = "Pudge";
```

Используйте `let`, если значение будет изменяться.

```js
let radiantScore = 0;
radiantScore = radiantScore + 1;
```

После второй строки `radiantScore` равен `1`.

Попытка изменить `const` приводит к ошибке:

```js
const score = 0;
score = 1;
```

Правило курса: начинайте с `const`. Переходите к `let`, только если можете объяснить, почему переменная должна изменяться.

Устаревшее `var` в новом коде мы не используем.

## 3. Присваивание не означает математическое равенство

```js
let score = 5;
score = score + 1;
```

В математике запись `score = score + 1` невозможна. В программировании правая часть вычисляется первой:

1. Взять текущее значение `score`, то есть `5`.
2. Прибавить `1`.
3. Получить `6`.
4. Назначить `6` переменной `score`.

## 4. Имена переменных

Хорошо:

```js
const playerName = "Collapse";
const matchDurationSeconds = 2470;
const isRadiantWinner = true;
```

Плохо:

```js
const x = "Collapse";
const data = 2470;
const flag = true;
```

Имя должно объяснять смысл значения и, если важно, единицу измерения.

В JavaScript обычно применяется `camelCase`:

```text
matchDuration
matchDurationSeconds
playerHeroId
```

Нельзя начинать имя с цифры:

```js
const 2teams = 2;
```

## 5. Основные типы данных

### Number

```js
const kills = 10;
const winRate = 0.56;
const goldDifference = -1200;
```

JavaScript использует тип `number` и для целых, и для дробных чисел.

### String

```js
const playerName = "Mira";
const heroName = 'Rubick';
```

Строка — текст в кавычках.

### Boolean

```js
const radiantWin = true;
const isProfessionalMatch = false;
```

Boolean имеет только два значения: `true` и `false`.

### `null`

`null` означает сознательное отсутствие значения.

```js
const accountId = null;
```

Например, игрок в данных матча может быть анонимным.

### `undefined`

`undefined` часто означает, что значение ещё не задано или поле отсутствует.

```js
let teamName;
console.log(teamName); // undefined
```

Позже TypeScript заставит нас явно описывать возможное отсутствие значения.

## 6. `typeof`

Оператор `typeof` показывает тип:

```js
console.log(typeof 10);          // "number"
console.log(typeof "Pudge");   // "string"
console.log(typeof true);        // "boolean"
console.log(typeof undefined);   // "undefined"
```

Историческая особенность JavaScript:

```js
console.log(typeof null); // "object"
```

Это старое поведение языка. Для проверки `null` используйте строгое сравнение:

```js
accountId === null
```

## 7. Арифметические операции

```js
const sum = 10 + 5;          // 15
const difference = 10 - 5;   // 5
const product = 10 * 5;      // 50
const quotient = 10 / 5;     // 2
const remainder = 10 % 3;    // 1
const power = 2 ** 3;        // 8
```

Остаток `%` полезен, например, для проверки чётности:

```js
const pickOrder = 4;
const isEven = pickOrder % 2 === 0;
```

## 8. Приоритет операций

```js
const wrongKda = kills + assists / deaths;
```

Деление выполняется раньше сложения. Для формулы `(kills + assists) / deaths` нужны скобки:

```js
const kda = (kills + assists) / deaths;
```

Даже если скобки не обязательны, иногда они делают формулу понятнее.

## 9. Строки и template literals

Соединение через `+`:

```js
const message = playerName + " играет на " + heroName;
```

Более удобная template string использует обратные кавычки:

```js
const message = `${playerName} играет на ${heroName}`;
```

Выражение внутри `${...}` вычисляется:

```js
const message = `${playerName}: ${(kills + assists) / deaths} KDA`;
```

## 10. Сравнения

```js
10 > 5    // true
10 < 5    // false
10 >= 10  // true
10 <= 9   // false
10 === 10 // true
10 !== 5  // true
```

Используйте строгое равенство `===` и строгое неравенство `!==`.

Не используйте нестрогое `==` в учебном проекте:

```js
"10" == 10  // true из-за автоматического преобразования
"10" === 10 // false, типы разные
```

## 11. Логические операции

### И — `&&`

Оба условия должны быть истинными:

```js
const isGoodGame = kills >= 10 && deaths <= 3;
```

### Или — `||`

Достаточно одного истинного условия:

```js
const isCoreRole = role === "carry" || role === "mid";
```

### Не — `!`

Меняет boolean на противоположный:

```js
const isFinished = true;
const isNotFinished = !isFinished; // false
```

## 12. Преобразование типов

```js
const textValue = "42";
const numberValue = Number(textValue);
```

После преобразования `numberValue` — число `42`.

Если строку нельзя преобразовать:

```js
const result = Number("Pudge");
console.log(result); // NaN
```

`NaN` означает Not a Number — невалидный числовой результат.

Проверка:

```js
Number.isNaN(result)
```

## 13. Деление на ноль

```js
console.log(10 / 0); // Infinity
```

JavaScript не выбрасывает обычную ошибку. Он возвращает `Infinity`. Поэтому бизнес-правило нужно задать самостоятельно.

Для учебного KDA договоримся:

```text
если deaths = 0, делитель считается равным 1
```

Позже оформим это функцией.

## 14. Практический пример

```js
const playerName = "Collapse";
const heroName = "Magnus";
const kills = 5;
const deaths = 2;
const assists = 18;
const durationMinutes = 42;
const totalGold = 20160;

const safeDeaths = deaths === 0 ? 1 : deaths;
const kda = (kills + assists) / safeDeaths;
const gpm = totalGold / durationMinutes;
const summary = `${playerName} на ${heroName}: KDA ${kda}, GPM ${gpm}`;

console.log(summary);
```

Конструкция `условие ? значение1 : значение2` называется тернарным оператором. Если она пока выглядит сложно, это нормально: полноценные условия разбираются в следующей главе.

## 15. Упражнения

### Упражнение 1

Создайте переменные:

- имя игрока;
- герой;
- kills;
- deaths;
- assists;
- totalGold;
- durationMinutes.

Рассчитайте и выведите KDA и GPM.

### Упражнение 2

Создайте `radiantScore` через `let`. Увеличьте его три раза и выведите результат.

### Упражнение 3

Проверьте через `typeof` типы:

```js
"8123456789"
8123456789
true
null
undefined
```

### Упражнение 4

Предскажите результат до запуска:

```js
console.log("5" + 2);
console.log(Number("5") + 2);
console.log(5 === "5");
console.log(5 !== "5");
```

### Упражнение 5

Создайте boolean `isOutstandingPerformance`, который равен `true`, если у игрока минимум 10 kills и не больше 2 deaths.

## Definition of Done

- Вы понимаете разницу `const` и `let`.
- Вы не используете `var`.
- Вы отличаете number, string, boolean, null и undefined.
- Вы используете `===`, а не `==`.
- Вы умеете создавать template string.
- Вы понимаете, почему данные из текстового поля иногда нужно превратить в число.
- Вы умеете рассчитать KDA и GPM из переменных.

