# Глава 3. Map, Set и группировка статистики

## 1. Задача группировки

Нужно посчитать, сколько раз выбран каждый герой:

```text
Rubick       → 7
Puck         → 4
Juggernaut   → 3
```

Для этого требуется структура, связывающая ключ с изменяемым значением.

## 2. `Map`

```js
const picksByHero = new Map();

picksByHero.set("Rubick", 1);
picksByHero.set("Puck", 2);

console.log(picksByHero.get("Rubick")); // 1
console.log(picksByHero.has("Invoker")); // false
console.log(picksByHero.size); // 2
```

Основные методы:

- `set(key, value)`;
- `get(key)`;
- `has(key)`;
- `delete(key)`;
- `clear()`;
- свойство `size`.

## 3. Подсчёт героев

```js
function countHeroes(players) {
  const counts = new Map();

  for (const player of players) {
    const currentCount = counts.get(player.hero) ?? 0;
    counts.set(player.hero, currentCount + 1);
  }

  return counts;
}
```

На первом появлении `get` возвращает `undefined`, поэтому `?? 0` задаёт стартовый ноль.

## 4. Перебор `Map`

```js
for (const [hero, count] of picksByHero) {
  console.log(`${hero}: ${count}`);
}
```

Каждый элемент Map представлен парой `[key, value]`. Destructuring сразу даёт `hero` и `count`.

## 5. Преобразование Map в массив

```js
const rows = [...picksByHero.entries()];
```

Результат:

```js
[
  ["Rubick", 7],
  ["Puck", 4],
]
```

Для API удобнее массив объектов:

```js
const heroStats = [...picksByHero.entries()].map(([hero, games]) => {
  return { hero, games };
});
```

JSON не представляет `Map` напрямую так, как обычный object/array. Перед JSON response структура преобразуется.

## 6. Object или Map

Object удобен для сущности с заранее известными полями:

```js
const player = {
  name: "North",
  hero: "Juggernaut",
};
```

Map удобен для динамической таблицы ключей:

```text
hero name → aggregate stats
player ID → player
match ID → match
```

Дополнительные различия:

- Map хранит ключи любых типов;
- Map имеет `size`;
- Map удобно перебирать;
- Object лучше сериализуется в JSON;
- Object имеет prototype-related особенности.

## 7. Статистика героя как значение Map

```js
function buildHeroStats(matches) {
  const statsByHero = new Map();

  for (const match of matches) {
    for (const player of match.players) {
      const current = statsByHero.get(player.hero) ?? {
        hero: player.hero,
        games: 0,
        wins: 0,
        kills: 0,
      };

      const playerWon = player.team === "radiant"
        ? match.radiantWin
        : !match.radiantWin;

      statsByHero.set(player.hero, {
        hero: current.hero,
        games: current.games + 1,
        wins: current.wins + (playerWon ? 1 : 0),
        kills: current.kills + player.kills,
      });
    }
  }

  return statsByHero;
}
```

## 8. Производные показатели после группировки

```js
const heroRows = [...statsByHero.values()].map((stats) => {
  return {
    ...stats,
    winRate: stats.games === 0 ? 0 : stats.wins / stats.games,
    averageKills: stats.games === 0 ? 0 : stats.kills / stats.games,
  };
});
```

Сначала собираются факты `games/wins/kills`, потом рассчитываются ratios. Это уменьшает ошибки округления.

## 9. `Set`

Set хранит только уникальные значения.

```js
const heroes = new Set();

heroes.add("Rubick");
heroes.add("Puck");
heroes.add("Rubick");

console.log(heroes.size); // 2
```

Методы:

- `add`;
- `has`;
- `delete`;
- `clear`;
- `size`.

## 10. Уникальные игроки

```js
const uniquePlayerNames = new Set(
  matches.flatMap((match) => match.players.map((player) => player.name)),
);

console.log(uniquePlayerNames.size);
```

Для production лучше использовать стабильный player/account ID, а не никнейм: никнеймы могут совпадать и меняться.

## 11. Удаление дубликатов массива

```js
const uniqueHeroes = [...new Set(heroNames)];
```

Порядок первого появления сохраняется.

## 12. Поиск максимума в grouped stats

```js
function findMostPickedHero(heroRows) {
  if (heroRows.length === 0) {
    return null;
  }

  return heroRows.reduce((top, current) => {
    return current.games > top.games ? current : top;
  });
}
```

При равенстве нужно определить правило. Например, вторичная сортировка по имени для стабильного результата.

## 13. Стабильный tie-break

```js
const sorted = [...heroRows].sort((first, second) => {
  if (second.games !== first.games) {
    return second.games - first.games;
  }

  return first.hero.localeCompare(second.hero);
});
```

Явное правило делает тесты воспроизводимыми.

## 14. Упражнения

### Упражнение 1

Постройте Map `team → количество игроков`.

### Упражнение 2

Постройте Set уникальных героев.

### Упражнение 3

Преобразуйте Map hero stats в массив объектов для будущего JSON API.

### Упражнение 4

Добавьте в hero stats assists и average assists.

## Definition of Done

- Вы создаёте и обновляете Map.
- Вы перебираете `[key, value]`.
- Вы понимаете, когда Map лучше object.
- Вы преобразуете Map в JSON-friendly массив.
- Вы используете Set для уникальности.
- Вы задаёте tie-break для воспроизводимой сортировки.

