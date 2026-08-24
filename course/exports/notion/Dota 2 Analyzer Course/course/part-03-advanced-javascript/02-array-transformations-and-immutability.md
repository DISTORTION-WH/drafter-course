# Глава 2. Преобразования массивов и immutability

## 1. Transformation pipeline

Задачу удобно описать цепочкой:

```text
все игроки
→ только Radiant
→ добавить KDA
→ сортировать по KDA
→ взять имена
```

```js
const radiantRanking = players
  .filter((player) => player.team === "radiant")
  .map((player) => ({
    ...player,
    kda: calculateKda(player.kills, player.deaths, player.assists),
  }))
  .toSorted((first, second) => second.kda - first.kda)
  .map((player) => player.name);
```

Каждый шаг получает результат предыдущего.

`toSorted` возвращает новый массив. Если ваша поддерживаемая версия runtime не предоставляет его, используйте:

```js
[...array].sort(compareFunction)
```

## 2. Читаем цепочку по шагам

Слишком длинная chain трудна для отладки. Можно дать промежуточным значениям имена:

```js
const radiantPlayers = players.filter(isRadiantPlayer);
const analyzedPlayers = radiantPlayers.map(analyzePlayer);
const sortedPlayers = [...analyzedPlayers].sort(compareByKdaDescending);
const playerNames = sortedPlayers.map((player) => player.name);
```

Это не менее профессиональный код. Явные имена часто лучше компактности.

## 3. Immutability

Immutable transformation не меняет вход, а возвращает новое значение.

Мутация:

```js
player.kda = calculateKda(player.kills, player.deaths, player.assists);
return player;
```

Immutable:

```js
return {
  ...player,
  kda: calculateKda(player.kills, player.deaths, player.assists),
};
```

Преимущества:

- проще понимать, кто изменил данные;
- тесты не зависят друг от друга;
- безопаснее React state;
- проще повторное использование fixtures;
- легче сравнивать старое и новое значение.

## 4. Поверхностная копия

```js
const player = {
  name: "North",
  stats: {
    kills: 12,
    deaths: 2,
  },
};

const copy = { ...player };
copy.stats.kills = 99;

console.log(player.stats.kills); // 99
```

Spread скопировал только верхний объект. `stats` остался общей ссылкой.

## 5. Копирование вложенного объекта

```js
const updatedPlayer = {
  ...player,
  stats: {
    ...player.stats,
    kills: player.stats.kills + 1,
  },
};
```

Теперь новый и старый `stats` — разные объекты.

## 6. `structuredClone`

Для тестового deep copy обычных данных:

```js
const copy = structuredClone(match);
```

Он поддерживает многие built-in структуры, но не все значения можно клонировать, например функции.

Не используйте deep clone автоматически на больших datasets: это тратит время и память. В production лучше проектировать точечные transformations.

## 7. Мутирующие методы массива

Изменяют массив:

- `push`;
- `pop`;
- `shift`;
- `unshift`;
- `splice`;
- `sort`;
- `reverse`.

Возвращают новый массив:

- `map`;
- `filter`;
- `slice`;
- `concat`;
- `flatMap`;
- `toSorted`;
- `toReversed`;
- `toSpliced`.

Всегда проверяйте документацию метода, если не уверены.

## 8. `flatMap`

Получить всех игроков из массива матчей:

```js
const allPlayers = matches.flatMap((match) => match.players);
```

Это соответствует:

```js
const nestedPlayers = matches.map((match) => match.players);
const allPlayers = nestedPlayers.flat();
```

## 9. Aggregation через `reduce`

Сразу несколько сумм:

```js
const totals = players.reduce(
  (result, player) => {
    return {
      kills: result.kills + player.kills,
      deaths: result.deaths + player.deaths,
      assists: result.assists + player.assists,
    };
  },
  { kills: 0, deaths: 0, assists: 0 },
);
```

Это immutable, но создаёт объект на каждой итерации. Для больших объёмов допустимо локально мутировать специально созданный accumulator:

```js
const totals = players.reduce(
  (result, player) => {
    result.kills += player.kills;
    result.deaths += player.deaths;
    result.assists += player.assists;
    return result;
  },
  { kills: 0, deaths: 0, assists: 0 },
);
```

Входные `players` не изменяются. Мутируется только внутренний accumulator. Это контролируемая локальная мутация.

## 10. Не превращайте любой код в `reduce`

Если `reduce` требует долгого объяснения, `for...of` может быть лучше:

```js
const totals = { kills: 0, deaths: 0, assists: 0 };

for (const player of players) {
  totals.kills += player.kills;
  totals.deaths += player.deaths;
  totals.assists += player.assists;
}
```

Цель — понятный корректный код, а не максимальное число array methods.

## 11. Поиск максимума

```js
function findTopPlayer(players) {
  if (players.length === 0) {
    return null;
  }

  return players.reduce((topPlayer, player) => {
    return player.kda > topPlayer.kda ? player : topPlayer;
  });
}
```

Без initial value `reduce` использует первый элемент. Поэтому пустой массив обработан заранее.

## 12. Преобразование без побочных эффектов

Плохо:

```js
const result = players.map((player) => {
  console.log(player);
  database.save(player);
  return analyzePlayer(player);
});
```

В одном callback смешаны вывод, запись и domain transformation.

Лучше разделить:

```text
analyze → validate → save → present
```

## 13. Упражнения

### Упражнение 1

Через `flatMap` соберите игроков из трёх матчей.

### Упражнение 2

Создайте новый вложенный объект игрока с увеличенными kills, не изменяя исходный.

### Упражнение 3

Рассчитайте totals через `reduce`, затем через `for...of`. Сравните понятность.

### Упражнение 4

Отсортируйте игроков без изменения входного массива и добавьте тест неизменности.

## Definition of Done

- Вы строите transformation pipeline.
- Вы понимаете поверхностную копию.
- Вы знаете, какие основные методы мутируют массив.
- Вы умеете собрать вложенные arrays через `flatMap`.
- Вы используете `reduce` только когда он остаётся понятным.
- Вы не смешиваете domain transformation с I/O side effects.

