# Глава 6. async/await и обработка ошибок

## 1. `async` функция всегда возвращает Promise

```js
async function getNumber() {
  return 42;
}

const result = getNumber();
console.log(result); // Promise
```

Значение `42` становится fulfilled value Promise.

Получить его:

```js
const number = await getNumber();
```

## 2. `await`

```js
import { readFile } from "node:fs/promises";

async function loadText(path) {
  const text = await readFile(path, "utf8");
  return text;
}
```

`await` приостанавливает выполнение этой async function до settlement Promise. Он не блокирует весь Node.js process как синхронный CPU-цикл.

## 3. Последовательный pipeline

```js
async function createReportFromFile(path) {
  const text = await readFile(path, "utf8");
  const rawData = JSON.parse(text);
  const report = analyzeHistory(rawData);
  return report;
}
```

Чтение асинхронное. `JSON.parse` и `analyzeHistory` в данном примере синхронные.

## 4. `try/catch`

```js
async function main() {
  try {
    const report = await createReportFromFile("matches.json");
    printHistoryReport(report);
  } catch (error) {
    console.error("Не удалось построить отчёт");
    console.error(error);
    process.exitCode = 1;
  }
}

await main();
```

Rejected Promise в `await` ведёт себя как выброшенная ошибка и попадает в `catch`.

## 5. Где обрабатывать ошибку

Нижний слой добавляет технический контекст и передаёт ошибку выше:

```js
async function readJsonFile(path) {
  try {
    const text = await readFile(path, "utf8");
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Не удалось прочитать JSON: ${path}`, { cause: error });
  }
}
```

Entry point решает пользовательское поведение:

```js
try {
  // ...
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
```

Не каждый слой должен печатать одну ошибку повторно.

## 6. Не проглатывайте ошибку

Плохо:

```js
async function loadMatches(path) {
  try {
    return await readJsonFile(path);
  } catch (error) {
    return [];
  }
}
```

Отсутствующий файл превратился в «история пуста». Аналитика выдаст правдоподобный, но ложный отчёт.

Fallback допустим только как явно определённое бизнес-правило с логом/метрикой.

## 7. Частая ошибка: забытый `await`

```js
const matches = readJsonFile(path);
console.log(matches.length); // undefined, потому что matches — Promise
```

Правильно:

```js
const matches = await readJsonFile(path);
```

TypeScript позднее поможет находить часть таких ошибок.

## 8. Частая ошибка: `await` внутри `forEach`

Плохо:

```js
matches.forEach(async (match) => {
  await saveMatch(match);
});

console.log("Сохранение завершено");
```

`forEach` не ожидает Promise callbacks. Сообщение появится раньше завершения сохранений.

Последовательно:

```js
for (const match of matches) {
  await saveMatch(match);
}
```

Параллельно:

```js
await Promise.all(matches.map((match) => saveMatch(match)));
```

Но для внешнего API или БД бесконтрольный `Promise.all` может создать слишком много одновременных операций. Это следующая тема.

## 9. Async callback в `map`

```js
const promises = matches.map(async (match) => {
  return enrichMatch(match);
});
```

Результат — массив Promise, не матчей.

```js
const enrichedMatches = await Promise.all(promises);
```

## 10. Последовательность и параллельность

Последовательно:

```js
const first = await loadFirst();
const second = await loadSecond();
```

`loadSecond` начинается после первого.

Если операции независимы:

```js
const [first, second] = await Promise.all([
  loadFirst(),
  loadSecond(),
]);
```

Они начинаются до ожидания общего результата.

## 11. Top-level await

ES modules Node.js поддерживают top-level `await`:

```js
await main();
```

В entry point это допустимо. В library modules избегайте скрытой долгой работы при import: импорт должен предсказуемо объявлять функциональность, а не молча обращаться к сети.

## 12. Возврат и `await`

Внутри async function оба варианта часто эквивалентны для значения:

```js
return loadMatches();
```

```js
return await loadMatches();
```

`return await` может быть нужен, когда текущий `try/catch` должен перехватить rejection:

```js
async function loadWithContext() {
  try {
    return await loadMatches();
  } catch (error) {
    throw new Error("Не удалось загрузить матчи", { cause: error });
  }
}
```

## 13. Упражнения

### Упражнение 1

Напишите async `loadAndCount(path)`, которая читает JSON-массив и возвращает длину.

### Упражнение 2

Намеренно забудьте `await`, посмотрите тип значения в console и исправьте.

### Упражнение 3

Сравните `for...of + await` и `Promise.all` на трёх `delay`.

### Упражнение 4

Создайте ошибку JSON.parse, добавьте контекст через `cause` и обработайте в `main`.

## Definition of Done

- Вы понимаете, что async function возвращает Promise.
- Вы используете `await` для результата.
- Вы обрабатываете rejection через `try/catch`.
- Вы не превращаете ошибку файла в пустой dataset молча.
- Вы не используете async callback с `forEach` для ожидаемой работы.
- Вы различаете последовательные и независимые операции.

