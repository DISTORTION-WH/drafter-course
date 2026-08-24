# Глава 5. Модули import/export

## 1. Почему не один большой файл

Один файл быстро становится неудобным:

- трудно найти функцию;
- сложно понять зависимости;
- разные задачи перемешиваются;
- возникают случайные изменения;
- тесты подключают лишний код;
- несколько разработчиков чаще конфликтуют.

Модуль — файл с собственной областью видимости, который явно экспортирует публичные значения и импортирует зависимости.

## 2. Первый export

`src/domain/calculations.js`:

```js
export function calculateKda(kills, deaths, assists) {
  const safeDeaths = deaths === 0 ? 1 : deaths;
  return (kills + assists) / safeDeaths;
}
```

Слово `export` делает функцию доступной другим модулям.

## 3. Первый import

`src/index.js`:

```js
import { calculateKda } from "./domain/calculations.js";

const kda = calculateKda(10, 2, 8);
console.log(kda);
```

## 4. Разбор import

```js
import { calculateKda } from "./domain/calculations.js";
```

- `import` — подключение;
- `{ calculateKda }` — named export;
- `from` — источник;
- `./domain/calculations.js` — относительный module specifier.

Путь считается от файла, содержащего import, а не от терминала.

## 5. Расширение `.js`

В Node.js ES modules пишите расширение явно:

```js
import { calculateKda } from "./domain/calculations.js";
```

Не полагайтесь на browser/bundler-style автоматический поиск расширения.

## 6. Несколько exports

```js
export function calculateKda(...) {
  // ...
}

export function roundToTwoDigits(value) {
  // ...
}

export function formatDuration(totalSeconds) {
  // ...
}
```

Импорт:

```js
import {
  calculateKda,
  formatDuration,
  roundToTwoDigits,
} from "./domain/calculations.js";
```

## 7. Export в конце файла

Альтернативный стиль:

```js
function calculateKda(...) {
  // ...
}

function formatDuration(...) {
  // ...
}

export { calculateKda, formatDuration };
```

Оба варианта корректны. В курсе экспорт пишется рядом с объявлением публичной функции.

## 8. Named и default export

Named export:

```js
export function calculateKda() {}
```

```js
import { calculateKda } from "./calculations.js";
```

Default export:

```js
export default function calculateKda() {}
```

```js
import calculateKda from "./calculations.js";
```

Для domain utilities курс предпочитает named exports:

- имя одинаково в объявлении и import;
- удобно экспортировать несколько функций;
- refactoring безопаснее;
- меньше произвольных переименований.

## 9. Публичное и приватное внутри модуля

```js
function getSafeDeaths(deaths) {
  return deaths === 0 ? 1 : deaths;
}

export function calculateKda(kills, deaths, assists) {
  return (kills + assists) / getSafeDeaths(deaths);
}
```

`getSafeDeaths` не экспортируется. Это внутренняя деталь модуля.

Другой файл не должен зависеть от неё напрямую.

## 10. Модуль данных

`src/data/match.js`:

```js
export const match = {
  id: "8123456789",
  // ...
};
```

`src/index.js`:

```js
import { match } from "./data/match.js";
```

Позже данные перестанут быть hardcoded: вместо этого provider adapter загрузит их по HTTP. Но остальная domain-логика сможет работать с объектом той же формы.

## 11. Направление зависимостей

Желательная схема:

```text
index.js
├── data/match.js
├── domain/match-report.js
└── presentation/print-report.js

domain/match-report.js
├── domain/calculations.js
└── domain/validation.js
```

Domain-функции не импортируют `index.js` и не знают о консоли.

## 12. Circular dependency

Проблема:

```text
a.js импортирует b.js
b.js импортирует a.js
```

Это круговая зависимость. ES modules умеют обрабатывать некоторые циклы, но код становится сложным и может получать ещё не инициализированные значения.

Исправление обычно состоит в выделении общей логики в третий модуль или пересмотре направления зависимостей.

## 13. Ошибка module not found

Проверьте:

- начинается ли локальный путь с `./` или `../`;
- есть ли `.js`;
- совпадает ли регистр имени;
- существует ли файл;
- путь считается от импортирующего файла;
- есть ли `"type": "module"`.

## 14. Импорт built-in модулей Node.js

Встроенный модуль не использует относительный путь:

```js
import { readFile } from "node:fs/promises";
```

Префикс `node:` явно показывает, что это встроенный модуль Node.js, а не npm package.

## 15. Упражнения

### Упражнение 1

Вынесите `calculateKda` и `formatDuration` из `index.js` в `domain/calculations.js`.

### Упражнение 2

Создайте `data/match.js`, экспортирующий объект матча.

### Упражнение 3

Создайте внутреннюю неэкспортируемую функцию `getSafeDeaths`.

### Упражнение 4

Намеренно удалите `.js` из import, прочитайте ошибку и восстановите путь.

## Definition of Done

- Вы понимаете назначение модуля.
- Вы создаёте named export и import.
- Вы пишете локальный путь через `./` и с `.js`.
- Вы понимаете, что module path считается от файла.
- Вы отличаете публичную функцию модуля от внутренней.
- Вы можете нарисовать направление imports проекта.

