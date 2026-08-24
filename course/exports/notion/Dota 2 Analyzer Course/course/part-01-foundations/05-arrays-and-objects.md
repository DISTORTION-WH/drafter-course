# Глава 5. Массивы и объекты

## 1. Зачем нужен массив

Массив хранит упорядоченный набор значений.

```js
const heroes = ["Pudge", "Invoker", "Rubick"];
```

Без массива пришлось бы создавать `hero1`, `hero2`, `hero3` и отдельно обрабатывать каждую переменную.

## 2. Индексы

Первый элемент имеет индекс `0`:

```js
console.log(heroes[0]); // Pudge
console.log(heroes[1]); // Invoker
console.log(heroes[2]); // Rubick
```

Количество элементов:

```js
console.log(heroes.length); // 3
```

Последний элемент:

```js
const lastHero = heroes[heroes.length - 1];
```

## 3. Изменение массива

```js
const heroes = ["Pudge"];
heroes.push("Rubick");
```

Хотя переменная объявлена через `const`, содержимое массива изменилось. `const` запрещает назначить переменной другой массив, но не делает содержимое immutable.

```js
heroes = ["Invoker"]; // ошибка
```

Частые методы:

- `push` — добавить в конец;
- `pop` — удалить последний;
- `includes` — проверить наличие;
- `indexOf` — найти индекс.

## 4. Зачем нужен объект

Объект объединяет связанные значения под именованными свойствами.

```js
const player = {
  name: "Mira",
  hero: "Rubick",
  kills: 2,
  deaths: 3,
  assists: 17,
  isRadiant: true,
};
```

Обращение к свойству:

```js
console.log(player.name);
console.log(player.kills);
```

Можно использовать квадратные скобки:

```js
console.log(player["hero"]);
```

Точечная запись предпочтительна, когда имя свойства известно заранее.

## 5. Изменение объекта

```js
player.kills = 3;
player.netWorth = 12800;
```

Как и массив, объект внутри `const` можно изменять. Позже мы чаще будем создавать новый объект, потому что immutable-преобразования проще отслеживать в React.

## 6. Массив объектов

Это основная форма наших данных:

```js
const players = [
  {
    name: "Player One",
    hero: "Juggernaut",
    team: "radiant",
    kills: 10,
    deaths: 2,
    assists: 8,
  },
  {
    name: "Player Two",
    hero: "Rubick",
    team: "radiant",
    kills: 2,
    deaths: 4,
    assists: 16,
  },
];
```

Перебор:

```js
for (const player of players) {
  console.log(`${player.name}: ${player.hero}`);
}
```

## 7. Destructuring

Вместо повторения `player.`:

```js
const { name, hero, kills } = player;
console.log(`${name} на ${hero}: ${kills} kills`);
```

В параметрах функции:

```js
function createSummary({ name, hero, kills, deaths, assists }) {
  const kda = calculateKda(kills, deaths, assists);
  return `${name} на ${hero}: ${kda}`;
}
```

Функция ожидает один объект, а не пять позиционных аргументов. Для больших сущностей это безопаснее и понятнее.

## 8. Копирование через spread

Новый объект с изменением:

```js
const updatedPlayer = {
  ...player,
  kills: player.kills + 1,
};
```

Исходный `player` не изменён.

Новый массив с добавленным элементом:

```js
const updatedPlayers = [...players, newPlayer];
```

Spread создаёт поверхностную копию. Вложенные объекты требуют отдельного внимания, которое будет разобрано позже.

## 9. Методы массивов

### `find`

Возвращает первый подходящий элемент:

```js
const rubickPlayer = players.find((player) => player.hero === "Rubick");
```

Если ничего не найдено, результат `undefined`.

### `filter`

Возвращает новый массив всех подходящих элементов:

```js
const radiantPlayers = players.filter(
  (player) => player.team === "radiant",
);
```

### `map`

Преобразует каждый элемент и возвращает новый массив той же длины:

```js
const playerNames = players.map((player) => player.name);
```

Или создаёт enriched-модель:

```js
const playersWithKda = players.map((player) => {
  return {
    ...player,
    kda: calculateKda(player.kills, player.deaths, player.assists),
  };
});
```

### `some`

Есть ли хотя бы один подходящий элемент:

```js
const hasHighKills = players.some((player) => player.kills >= 10);
```

### `every`

Все ли элементы подходят:

```js
const allPlayersValid = players.every((player) => player.deaths >= 0);
```

### `reduce`

Сворачивает массив в одно значение:

```js
const totalKills = players.reduce((sum, player) => {
  return sum + player.kills;
}, 0);
```

Разбор:

- `sum` — накопитель;
- `player` — текущий элемент;
- `0` — начальное значение;
- результат каждой итерации становится новым `sum`.

Если `reduce` пока неочевиден, используйте `for...of`. Понятность важнее краткости.

## 10. Сортировка

`sort` изменяет исходный массив. Безопаснее сначала скопировать:

```js
const sortedByKills = [...players].sort((first, second) => {
  return second.kills - first.kills;
});
```

Если результат сравнения отрицательный, `first` идёт раньше; положительный — `second` раньше; ноль — элементы считаются равными для сортировки.

## 11. Вложенные объекты

```js
const match = {
  id: "8123456789",
  durationSeconds: 2470,
  radiant: {
    name: "Team Spirit",
    score: 32,
  },
  dire: {
    name: "Team Liquid",
    score: 18,
  },
  players,
};
```

Обращение:

```js
console.log(match.radiant.name);
console.log(match.players[0].hero);
```

## 12. Отсутствующее свойство

```js
console.log(player.accountId); // undefined, если свойства нет
```

Optional chaining безопасно останавливает доступ:

```js
const coachName = match.radiant.coach?.name;
```

Nullish coalescing задаёт значение только для `null` или `undefined`:

```js
const displayedName = player.name ?? "Anonymous";
```

Почему не всегда `||`:

```js
const deaths = 0;
console.log(deaths || 99); // 99, хотя 0 является настоящим значением
console.log(deaths ?? 99); // 0
```

## 13. Ссылочное поведение

```js
const first = { kills: 10 };
const second = first;

second.kills = 20;
console.log(first.kills); // 20
```

`first` и `second` ссылаются на один объект. Они не являются независимыми копиями.

Новая поверхностная копия:

```js
const secondCopy = { ...first };
```

## 14. Практический анализ

```js
function calculateKda(kills, deaths, assists) {
  const safeDeaths = deaths === 0 ? 1 : deaths;
  return (kills + assists) / safeDeaths;
}

const analyzedPlayers = players.map((player) => {
  return {
    ...player,
    kda: calculateKda(player.kills, player.deaths, player.assists),
  };
});

const radiantPlayers = analyzedPlayers.filter(
  (player) => player.team === "radiant",
);

const radiantKills = radiantPlayers.reduce(
  (sum, player) => sum + player.kills,
  0,
);

console.log(radiantKills);
```

## 15. Упражнения

### Упражнение 1

Создайте объект матча с ID, длительностью, победителем и массивом минимум из четырёх игроков.

### Упражнение 2

Через `map` создайте новый массив игроков с полем `kda`.

### Упражнение 3

Через `filter` получите игроков Radiant.

### Упражнение 4

Через `find` найдите игрока по имени. Обработайте случай, когда игрок не найден.

### Упражнение 5

Посчитайте сумму kills и assists команды сначала через `for...of`, затем через `reduce`.

### Упражнение 6

Отсортируйте копию массива по KDA, не изменяя исходный массив.

## Definition of Done

- Вы понимаете индекс `0`.
- Вы отличаете массив от объекта.
- Вы можете создать массив объектов игроков.
- Вы умеете применять `map`, `filter`, `find`, `some` и `reduce`.
- Вы понимаете, что `sort` изменяет массив.
- Вы знаете разницу `||` и `??` для числового нуля.
- Вы понимаете ссылочное поведение объектов.

