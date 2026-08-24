# Глава 3. Условия и циклы

## 1. Зачем нужны условия

Без условий программа выполняет одинаковые действия для любых данных. Условие позволяет выбрать поведение.

Пример правила:

```text
Если Radiant победили — показать "Radiant victory".
Иначе — показать "Dire victory".
```

## 2. `if`

```js
const radiantWin = true;

if (radiantWin) {
  console.log("Radiant victory");
}
```

Структура:

```js
if (условие) {
  // выполняется, если условие true
}
```

Фигурные скобки задают блок кода.

## 3. `if ... else`

```js
if (radiantWin) {
  console.log("Radiant victory");
} else {
  console.log("Dire victory");
}
```

Будет выполнен ровно один из двух блоков.

## 4. `else if`

```js
const matchStatus = "live";

if (matchStatus === "scheduled") {
  console.log("Матч ещё не начался");
} else if (matchStatus === "live") {
  console.log("Матч идёт");
} else if (matchStatus === "finished") {
  console.log("Матч завершён");
} else {
  console.log("Неизвестный статус");
}
```

Условия проверяются сверху вниз. После первого истинного остальные ветви не выполняются.

## 5. Порядок условий имеет значение

Плохо:

```js
const kills = 15;

if (kills >= 5) {
  console.log("Хорошо");
} else if (kills >= 10) {
  console.log("Отлично");
}
```

При `kills = 15` программа выведет `Хорошо`, потому что первое условие уже истинно.

Лучше:

```js
if (kills >= 10) {
  console.log("Отлично");
} else if (kills >= 5) {
  console.log("Хорошо");
} else {
  console.log("Низкий показатель");
}
```

## 6. Truthy и falsy

JavaScript может использовать не-boolean значение как условие.

Falsy значения:

- `false`;
- `0`;
- `""` — пустая строка;
- `null`;
- `undefined`;
- `NaN`.

Остальные обычные значения truthy.

```js
const teamName = "Team Spirit";

if (teamName) {
  console.log("Название есть");
}
```

Для бизнес-правил часто лучше писать явно:

```js
if (teamName !== "") {
  console.log("Название есть");
}
```

## 7. Опасность проверки числа через truthy

```js
const deaths = 0;

if (deaths) {
  console.log("Значение есть");
}
```

Блок не выполнится, потому что `0` — falsy. Но ноль смертей является реальным значением, а не отсутствием данных.

Лучше:

```js
if (deaths !== undefined && deaths !== null) {
  console.log("Количество смертей известно");
}
```

## 8. Тернарный оператор

Короткий выбор значения:

```js
const safeDeaths = deaths === 0 ? 1 : deaths;
```

Читается так: если `deaths` строго равно нулю, использовать `1`, иначе использовать `deaths`.

Тернарный оператор хорош для короткого выбора значения. Для нескольких действий используйте `if`.

## 9. `switch`

Когда одна переменная сравнивается с несколькими фиксированными значениями:

```js
const role = "support";

switch (role) {
  case "carry":
    console.log("Позиция 1");
    break;
  case "mid":
    console.log("Позиция 2");
    break;
  case "offlane":
    console.log("Позиция 3");
    break;
  case "support":
    console.log("Позиция 4 или 5");
    break;
  default:
    console.log("Неизвестная роль");
}
```

`break` завершает выбранную ветвь. Без него выполнение продолжится в следующем `case`.

## 10. Зачем нужны циклы

В матче десять игроков. Писать десять одинаковых `console.log` неудобно. Цикл повторяет действие для каждого значения.

## 11. Цикл `for`

```js
for (let index = 0; index < 5; index += 1) {
  console.log(index);
}
```

Разбор:

1. `let index = 0` — начальное значение.
2. `index < 5` — условие продолжения.
3. Выполняется тело.
4. `index += 1` — изменение.
5. Условие проверяется снова.

Вывод: `0`, `1`, `2`, `3`, `4`. Значение `5` не выводится, потому что условие `5 < 5` ложно.

## 12. Цикл `for...of`

Для перебора значений массива:

```js
const heroes = ["Pudge", "Invoker", "Rubick"];

for (const hero of heroes) {
  console.log(hero);
}
```

На каждой итерации `hero` получает очередное значение. Для большинства простых переборов массива `for...of` понятнее классического `for`.

## 13. `while`

```js
let retryCount = 0;

while (retryCount < 3) {
  console.log(`Попытка ${retryCount + 1}`);
  retryCount += 1;
}
```

`while` удобен, когда заранее неизвестно точное число повторений, но есть условие остановки.

Будьте осторожны с бесконечным циклом:

```js
let value = 0;

while (value < 3) {
  console.log(value);
  // value не меняется, поэтому цикл не закончится
}
```

## 14. `break` и `continue`

`break` полностью завершает цикл:

```js
const heroes = ["Pudge", "Invoker", "Rubick"];

for (const hero of heroes) {
  if (hero === "Invoker") {
    break;
  }

  console.log(hero);
}
```

Будет выведен только `Pudge`.

`continue` пропускает текущую итерацию:

```js
for (const hero of heroes) {
  if (hero === "Invoker") {
    continue;
  }

  console.log(hero);
}
```

Будут выведены `Pudge` и `Rubick`.

## 15. Накопление результата

```js
const kills = [8, 2, 5, 11, 1];
let totalKills = 0;

for (const playerKills of kills) {
  totalKills = totalKills + playerKills;
}

console.log(totalKills); // 27
```

`totalKills` — накопитель. Его значения по шагам: `0`, `8`, `10`, `15`, `26`, `27`.

## 16. Вложенные условия

```js
const role = "support";
const wardsPlaced = 18;

if (role === "support" && wardsPlaced >= 15) {
  console.log("Высокий вклад в обзор");
}
```

Объединённое условие часто понятнее нескольких вложенных `if`.

## 17. Упражнения

### Упражнение 1

По значению `matchStatus` выведите сообщение для `scheduled`, `live`, `finished` и неизвестного статуса.

### Упражнение 2

Определите результат игрока:

- `excellent`, если kills не меньше 10 и deaths не больше 2;
- `good`, если KDA не меньше 3;
- `normal` в остальных случаях.

### Упражнение 3

Дан массив:

```js
const teamKills = [8, 2, 5, 11, 1];
```

Через `for...of` рассчитайте сумму.

### Упражнение 4

Посчитайте, сколько значений в массиве не меньше `5`.

### Упражнение 5

Выведите числа от 1 до 10. Для чётного числа выводите дополнительно слово `even`.

## Definition of Done

- Вы умеете писать `if`, `else if`, `else`.
- Вы понимаете порядок проверки ветвей.
- Вы знаете, почему `0` нельзя всегда считать отсутствием значения.
- Вы умеете перебрать массив через `for...of`.
- Вы можете накопить сумму.
- Вы можете объяснить, когда цикл остановится.
