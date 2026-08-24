# 4. Объектные модели: `type` и `interface`

## 1. Описываем форму объекта

```ts
interface Hero {
  readonly name: string;
}

interface Player {
  readonly accountId: string;
  readonly name: string;
  readonly hero: Hero;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
}
```

`interface Player` не создаёт игрока. Он описывает форму значения, которую compiler ожидает.

Создание значения:

```ts
const player: Player = {
  accountId: "1001",
  name: "North",
  hero: { name: "Queen of Pain" },
  kills: 7,
  deaths: 2,
  assists: 14,
};
```

## 2. Обязательные свойства

Если пропустить `hero`, TypeScript сообщит, что объект не соответствует `Player`.

Если добавить опечатку `assist` вместо `assists`, проверка object literal также укажет на неизвестное свойство.

## 3. Вложенные модели

```ts
type TeamSide = "radiant" | "dire";

interface Team {
  readonly name: string;
  readonly side: TeamSide;
}

interface Match {
  readonly id: string;
  readonly radiantTeam: Team;
  readonly direTeam: Team;
  readonly players: readonly Player[];
}
```

Domain-модель выражает отношения:

```text
Match
├── radiantTeam: Team
├── direTeam: Team
└── players: Player[]
    └── hero: Hero
```

## 4. `type` и `interface`

`type` хорошо подходит для:

- unions;
- tuples;
- aliases примитивов;
- преобразований типов.

```ts
type TeamSide = "radiant" | "dire";
type MatchId = string;
type Score = readonly [number, number];
```

`interface` удобно использовать для открытой объектной формы:

```ts
interface MatchSummary {
  readonly id: string;
  readonly winnerTeam: string;
}
```

Объект можно описать обоими способами:

```ts
type Hero = {
  readonly name: string;
};
```

Для курса принимаем соглашение:

- object models — `interface`;
- unions, tuples и type transformations — `type`.

Это стиль, а не закон языка.

## 5. Расширение interface

```ts
interface Entity {
  readonly id: string;
}

interface Match extends Entity {
  readonly durationSeconds: number;
}
```

`Match` обязан иметь и `id`, и `durationSeconds`.

Не создавайте глубокую иерархию только ради повторного использования одного поля. Иногда явное повторение проще.

## 6. Intersection

```ts
type Identified = {
  readonly id: string;
};

type Timestamped = {
  readonly updatedAt: string;
};

type CachedMatch = Match & Identified & Timestamped;
```

Intersection `A & B` требует одновременно соответствовать A и B.

## 7. Structural typing

TypeScript сравнивает структуру, а не название типа:

```ts
interface Named {
  name: string;
}

const hero = {
  name: "Rubick",
  games: 3,
};

function printName(value: Named): void {
  console.log(value.name);
}

printName(hero); // допустимо
```

У `hero` есть как минимум требуемое свойство `name`. Дополнительное `games` не мешает при передаче переменной.

## 8. Domain-модель и transport-модель

Внешний JSON может выглядеть так:

```json
{
  "hero": "Rubick",
  "radiantTeam": "Aurora Owls"
}
```

Внутренняя модель богаче:

```ts
interface Player {
  hero: Hero;
}

interface Match {
  radiantTeam: Team;
}
```

Parser выполняет normalization:

```ts
hero: { name: raw.hero }
radiantTeam: { name: raw.radiantTeam, side: "radiant" }
```

Не обязательно копировать внешнюю форму во всё приложение. На границе мы переводим её в удобный domain-язык.

## 9. Псевдоним ID не создаёт новый runtime-тип

```ts
type MatchId = string;
type AccountId = string;
```

Оба типа пока совместимы со строками. Alias улучшает чтение, но не обеспечивает настоящую номинальную изоляцию. Branded types изучим позднее, если путаница ID станет реальной проблемой.

## Упражнения

1. Опишите `Hero`, `Team`, `Player` и `Match`.
2. Сделайте поля domain-моделей readonly.
3. Намеренно пропустите обязательное поле.
4. Создайте объект с неправильным `side`.
5. Преобразуйте плоский raw-объект во вложенную domain-модель.

## Критерий готовности

Вы можете прочитать interface и создать соответствующий объект без `as`, а также объяснить, почему domain-модель не обязана повторять JSON один к одному.

