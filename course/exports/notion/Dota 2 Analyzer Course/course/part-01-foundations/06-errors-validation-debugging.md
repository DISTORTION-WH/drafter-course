# Глава 6. Ошибки, проверка данных и отладка

## 1. Три разных понятия

Важно различать:

- ошибка в коде — программа написана неправильно;
- ошибка входных данных — код работает, но получил невозможное значение;
- ожидаемая ситуация — например, игрок не найден.

Для них требуется разное поведение.

## 2. SyntaxError

Нарушены правила записи языка:

```js
const playerName = "Mira;
```

JavaScript не видит закрывающую кавычку. Такой код обычно вообще не начинает выполняться.

Проверьте:

- кавычки;
- круглые скобки;
- фигурные скобки;
- квадратные скобки;
- запятые;
- случайно удалённые части конструкции.

## 3. ReferenceError

Код обращается к неизвестному имени:

```js
const kills = 10;
console.log(kill); // ReferenceError
```

Переменная называется `kills`, а используется `kill`.

Другие причины:

- переменная находится в другой области видимости;
- переменная используется до объявления;
- имя написано с другим регистром.

## 4. TypeError

Значение имеет неподходящий тип или не поддерживает операцию:

```js
const player = undefined;
console.log(player.name); // TypeError
```

Или:

```js
const kills = 10;
kills.toUpperCase(); // TypeError
```

`toUpperCase` является строковым методом, а `kills` — число.

## 5. Логическая ошибка

Программа выполняется, но результат неправильный:

```js
function calculateKda(kills, deaths, assists) {
  return kills + assists / deaths;
}
```

Синтаксис корректен. Ошибка в формуле: пропущены скобки.

Логические ошибки опаснее синтаксических, потому что приложение может выглядеть работающим.

## 6. Читать ошибку сверху или снизу

В консоли найдите:

1. Тип ошибки.
2. Сообщение.
3. Файл и номер строки.
4. Stack trace — цепочку вызовов функций.

Пример:

```text
TypeError: Cannot read properties of undefined (reading 'kills')
    at analyzePlayer (...:12)
    at createMatchReport (...:30)
```

Первая строка говорит, что код читал `kills` у `undefined`. Следующая указывает место в `analyzePlayer`. Ещё ниже видно, что `analyzePlayer` была вызвана из `createMatchReport`.

Сначала откройте верхнюю строку вашего собственного кода в stack trace.

## 7. Валидация

Валидация проверяет, соответствует ли значение нашим правилам.

```js
function isNonNegativeNumber(value) {
  return typeof value === "number"
    && Number.isFinite(value)
    && value >= 0;
}
```

Проверяются три свойства:

- значение является числом;
- это конечное число, а не `Infinity` или `NaN`;
- число не отрицательное.

## 8. Проверка строки

```js
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
```

`trim` убирает пробелы по краям. Строка `"   "` после `trim` становится пустой.

## 9. Проверка объекта игрока

```js
function validatePlayer(player) {
  const errors = [];

  if (typeof player !== "object" || player === null) {
    return ["player должен быть объектом"];
  }

  if (!isNonEmptyString(player.name)) {
    errors.push("name должен быть непустой строкой");
  }

  if (!isNonEmptyString(player.hero)) {
    errors.push("hero должен быть непустой строкой");
  }

  if (player.team !== "radiant" && player.team !== "dire") {
    errors.push("team должен быть radiant или dire");
  }

  if (!isNonNegativeNumber(player.kills)) {
    errors.push("kills должен быть неотрицательным числом");
  }

  if (!isNonNegativeNumber(player.deaths)) {
    errors.push("deaths должен быть неотрицательным числом");
  }

  if (!isNonNegativeNumber(player.assists)) {
    errors.push("assists должен быть неотрицательным числом");
  }

  return errors;
}
```

Функция возвращает все найденные ошибки, а не только первую. Это удобно для отчёта импорта.

## 10. Почему сначала проверяется объект

Если сразу написать:

```js
if (player.name === "") {
```

а `player` равен `null`, программа получит TypeError ещё до нормального сообщения. Поэтому сначала проверяется контейнер, затем его поля.

## 11. `throw`

Если функция не может выполнить контракт, можно выбросить ошибку:

```js
function analyzePlayer(player) {
  const errors = validatePlayer(player);

  if (errors.length > 0) {
    throw new Error(`Невалидный игрок: ${errors.join(", ")}`);
  }

  return {
    ...player,
    kda: calculateKda(player.kills, player.deaths, player.assists),
  };
}
```

`throw` немедленно останавливает обычное выполнение текущей функции.

## 12. `try/catch`

```js
try {
  const analyzed = analyzePlayer(player);
  console.log(analyzed);
} catch (error) {
  console.error("Не удалось проанализировать игрока");
  console.error(error);
}
```

`try` содержит потенциально неуспешную операцию. `catch` получает выброшенную ошибку.

Не делайте так:

```js
try {
  analyzePlayer(player);
} catch (error) {
  // ничего
}
```

Ошибка исчезнет, а вы не узнаете, почему нет результата.

## 13. Когда не нужна исключительная ошибка

Поиск может законно ничего не найти:

```js
function findPlayerByName(players, name) {
  return players.find((player) => player.name === name);
}

const player = findPlayerByName(players, "Unknown");

if (player === undefined) {
  console.log("Игрок не найден");
}
```

Отсутствующий результат поиска — ожидаемая ветвь. Ошибка БД или невалидная структура ответа API — уже другое событие.

## 14. Пошаговая отладка

### Сузьте проблему

Если весь отчёт неправильный, проверьте отдельные функции:

```js
console.log(calculateKda(10, 2, 8));
```

### Выведите вход и результат

```js
function calculateKda(kills, deaths, assists) {
  console.log({ kills, deaths, assists });
  const safeDeaths = deaths === 0 ? 1 : deaths;
  const result = (kills + assists) / safeDeaths;
  console.log({ safeDeaths, result });
  return result;
}
```

После исправления временные логи удалите.

### Используйте `debugger`

```js
function calculateKda(kills, deaths, assists) {
  debugger;
  const safeDeaths = deaths === 0 ? 1 : deaths;
  return (kills + assists) / safeDeaths;
}
```

При открытых DevTools выполнение остановится. Можно посмотреть текущие значения и выполнить код по строкам.

## 15. Простые проверки через `console.assert`

```js
console.assert(calculateKda(10, 2, 8) === 9, "Обычный KDA");
console.assert(calculateKda(5, 0, 5) === 10, "Ноль смертей");
```

Если условие ложно, консоль покажет сообщение. Позже вместо этого будет настоящий test runner.

## 16. Граничные случаи

Для функции KDA проверьте:

- обычные значения;
- ноль убийств;
- ноль assists;
- ноль смертей;
- большие числа;
- отрицательное число;
- строку вместо числа;
- `undefined`.

Граничный случай — значение около границы правила или необычная допустимая ситуация.

## 17. Упражнения

### Упражнение 1

Исправьте все проблемы:

```js
function calculateKda(kills, deaths, assists) {
  return kills + assists / death;
}
```

### Упражнение 2

Создайте `validateMatchDuration(value)`. Допустима только конечная длительность больше нуля.

### Упражнение 3

Передайте в `validatePlayer` объект без `hero`, объект с `kills: -1` и `null`. Сравните ошибки.

### Упражнение 4

Напишите минимум четыре `console.assert` для `formatDuration`.

## Definition of Done

- Вы отличаете SyntaxError, ReferenceError, TypeError и логическую ошибку.
- Вы читаете сообщение, файл, строку и stack trace.
- Вы проверяете объект до его свойств.
- Вы умеете собрать список validation errors.
- Вы не скрываете ошибку пустым `catch`.
- Вы проверяете обычные и граничные случаи.

