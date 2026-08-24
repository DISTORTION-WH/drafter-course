# Глава 1. Функция как значение, callback и higher-order function

## 1. Функция является значением

В JavaScript функцию можно:

- сохранить в переменной;
- передать аргументом;
- вернуть из другой функции;
- положить в массив или объект.

```js
function calculateKda(kills, deaths, assists) {
  const safeDeaths = deaths === 0 ? 1 : deaths;
  return (kills + assists) / safeDeaths;
}

const calculator = calculateKda;
console.log(calculator(10, 2, 8));
```

`calculator` содержит ссылку на функцию. Скобки вызывают её.

## 2. Передать функцию или вызвать функцию

Передать функцию:

```js
players.map(analyzePlayer)
```

Здесь `analyzePlayer` будет вызвана методом `map` для каждого элемента.

Вызвать немедленно:

```js
players.map(analyzePlayer())
```

Это почти всегда ошибка: `analyzePlayer()` запускается до `map`, причём без нужного игрока. В `map` попадёт результат вызова, а не функция.

Вопрос для самопроверки:

```text
Мне сейчас нужен результат функции или сама функция для будущего вызова?
```

## 3. Callback

Callback — функция, переданная другому коду для вызова в подходящий момент.

```js
const radiantPlayers = players.filter((player) => {
  return player.team === "radiant";
});
```

Функция `(player) => ...` является callback. `filter`:

1. Берёт элемент.
2. Передаёт его callback.
3. Получает boolean.
4. Оставляет элемент, если boolean равен `true`.

## 4. Контракт callback

У разных методов разные ожидания.

### `map`

Callback возвращает преобразованное значение:

```js
const heroNames = players.map((player) => player.hero);
```

### `filter`

Callback возвращает boolean:

```js
const winners = players.filter((player) => player.won);
```

### `find`

Callback возвращает boolean, а метод возвращает первый подходящий элемент:

```js
const rubick = players.find((player) => player.hero === "Rubick");
```

### `reduce`

Callback возвращает новое значение накопителя:

```js
const totalKills = players.reduce((sum, player) => {
  return sum + player.kills;
}, 0);
```

## 5. Named callback

Inline:

```js
const radiantPlayers = players.filter((player) => {
  return player.team === "radiant";
});
```

Named:

```js
function isRadiantPlayer(player) {
  return player.team === "radiant";
}

const radiantPlayers = players.filter(isRadiantPlayer);
```

Named callback полезен, если:

- правило повторяется;
- условие сложное;
- имя делает код понятнее;
- функцию нужно отдельно тестировать.

Короткий одноразовый callback удобно оставить inline.

## 6. Higher-order function

Higher-order function:

- принимает функцию;
- или возвращает функцию.

`map`, `filter`, `reduce` являются higher-order functions.

Собственный пример:

```js
function applyToEveryPlayer(players, operation) {
  const results = [];

  for (const player of players) {
    results.push(operation(player));
  }

  return results;
}

const names = applyToEveryPlayer(players, (player) => player.name);
```

Это упрощённый аналог `map`.

## 7. Функция, возвращающая функцию

```js
function createTeamFilter(team) {
  return function isPlayerFromTeam(player) {
    return player.team === team;
  };
}

const isRadiantPlayer = createTeamFilter("radiant");
const radiantPlayers = players.filter(isRadiantPlayer);
```

Внутренняя функция помнит значение `team`, существовавшее при её создании.

## 8. Closure

Closure — функция вместе с доступом к окружающей области видимости.

```js
function createMinimumKillsFilter(minimumKills) {
  return (player) => player.kills >= minimumKills;
}

const hasAtLeastFiveKills = createMinimumKillsFilter(5);
```

Когда `hasAtLeastFiveKills` вызывается позднее, она всё ещё знает `minimumKills = 5`.

Closures будут использоваться:

- при создании configured adapters;
- в React hooks;
- в обработчиках событий;
- в middleware;
- в фабриках validators.

## 9. Осторожно с изменением внешнего состояния

```js
let totalKills = 0;

players.forEach((player) => {
  totalKills += player.kills;
});
```

Код работает, но callback изменяет внешнюю переменную.

Более явно:

```js
const totalKills = players.reduce(
  (sum, player) => sum + player.kills,
  0,
);
```

Первый вариант не всегда запрещён, но pure transformation проще тестировать и комбинировать.

## 10. `forEach` не возвращает преобразованный массив

```js
const result = players.forEach((player) => player.name);
console.log(result); // undefined
```

Если нужен новый массив, используйте `map`:

```js
const names = players.map((player) => player.name);
```

`forEach` применяется для side effect, например записи лога. В domain-расчётах предпочтительнее методы, возвращающие результат.

## 11. Ошибка с фигурными скобками arrow function

Работает неявный return:

```js
const names = players.map((player) => player.name);
```

С фигурными скобками требуется `return`:

```js
const names = players.map((player) => {
  return player.name;
});
```

Ошибка:

```js
const names = players.map((player) => {
  player.name;
});
```

Получится массив `undefined`.

## 12. Упражнения

### Упражнение 1

Создайте named callback `isDirePlayer` и используйте с `filter`.

### Упражнение 2

Создайте `createHeroFilter(heroName)`, возвращающую predicate.

### Упражнение 3

Объясните разницу:

```js
players.map(analyzePlayer)
players.map(analyzePlayer())
```

### Упражнение 4

Напишите упрощённую higher-order function `applyToEveryMatch` через `for...of`.

## Definition of Done

- Вы понимаете, что функция является значением.
- Вы отличаете передачу функции от вызова.
- Вы знаете контракт callback для `map`, `filter`, `find`, `reduce`.
- Вы можете создать named callback.
- Вы можете объяснить closure на простом примере.
- Вы не используете `forEach`, если нужен новый массив.

