# Глава 5. Promise: состояние и цепочка

## 1. Что такое Promise

Promise — объект, представляющий будущий результат асинхронной операции.

Состояния:

- `pending` — операция ещё не завершилась;
- `fulfilled` — получено значение;
- `rejected` — получена ошибка.

После fulfilled или rejected Promise считается settled и не меняет состояние снова.

## 2. Promise не является готовым значением

```js
import { readFile } from "node:fs/promises";

const text = readFile("matches.json", "utf8");
console.log(text);
```

`text` здесь является Promise, а не содержимым файла.

Для получения результата нужны `.then` или `await`.

## 3. `.then`

```js
readFile("matches.json", "utf8").then((text) => {
  console.log(text);
});
```

Callback `.then` вызывается после fulfillment и получает значение.

## 4. `.catch`

```js
readFile("missing.json", "utf8")
  .then((text) => {
    console.log(text);
  })
  .catch((error) => {
    console.error("Не удалось прочитать файл");
    console.error(error);
  });
```

`.catch` обрабатывает rejection выше по цепочке.

## 5. `.finally`

```js
loadMatches()
  .then(analyzeMatches)
  .catch(handleError)
  .finally(() => {
    console.log("Операция завершена");
  });
```

`finally` выполняется и после успеха, и после ошибки. Обычно используется для cleanup, а не для преобразования результата.

## 6. Promise chain

```js
readFile("matches.json", "utf8")
  .then((text) => JSON.parse(text))
  .then((matches) => analyzeHistory(matches))
  .then((report) => printHistoryReport(report))
  .catch((error) => {
    console.error(error);
  });
```

Результат каждого `.then` становится входом следующего.

## 7. Важность `return` в `.then`

Правильно:

```js
loadMatches().then((matches) => {
  return analyzeHistory(matches);
}).then((report) => {
  console.log(report);
});
```

Ошибка:

```js
loadMatches().then((matches) => {
  analyzeHistory(matches);
}).then((report) => {
  console.log(report); // undefined
});
```

Без `return` callback возвращает `undefined`.

## 8. Если `.then` возвращает Promise

```js
loadConfig().then((config) => {
  return loadMatches(config.filePath);
}).then((matches) => {
  // matches, а не вложенный Promise
});
```

Promise chain «распаковывает» возвращённый Promise и ждёт его settlement.

## 9. Ошибка внутри `.then`

```js
Promise.resolve("not json")
  .then((text) => JSON.parse(text))
  .catch((error) => {
    console.error("Парсинг не удался", error);
  });
```

Синхронный `throw` внутри `.then` превращается в rejected Promise и переходит в `.catch`.

## 10. Создание Promise вручную

Учебный таймер:

```js
function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
```

Использование:

```js
delay(1000).then(() => console.log("Прошла секунда"));
```

Не оборачивайте API, уже возвращающий Promise:

Плохо:

```js
function loadFile(path) {
  return new Promise((resolve, reject) => {
    readFile(path, "utf8").then(resolve).catch(reject);
  });
}
```

Достаточно:

```js
function loadFile(path) {
  return readFile(path, "utf8");
}
```

## 11. `Promise.resolve` и `Promise.reject`

```js
const successful = Promise.resolve({ matches: [] });
const failed = Promise.reject(new Error("Provider unavailable"));
```

Полезно для обучения, tests и адаптации значения к Promise API.

## 12. Необработанный rejection

Если rejected Promise никто не ожидает и не обрабатывает, Node сообщает unhandled rejection. Это ошибка дизайна.

```js
loadMatches(); // Promise потерян
```

Нужно:

```js
loadMatches().catch(handleError);
```

или `await` внутри контролируемого `try/catch`.

## 13. Error context

```js
async function readJsonFile(path) {
  try {
    const text = await readFile(path, "utf8");
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Не удалось загрузить JSON из ${path}`, {
      cause: error,
    });
  }
}
```

Новое сообщение добавляет контекст, а `cause` сохраняет исходную ошибку.

## 14. Упражнения

### Упражнение 1

Создайте `delay(200)` и выведите сообщение после ожидания.

### Упражнение 2

Постройте chain: строка JSON → object → число матчей → вывод.

### Упражнение 3

Удалите `return` из первого `.then` и объясните `undefined` дальше.

### Упражнение 4

Передайте невалидный JSON и обработайте rejection.

## Definition of Done

- Вы называете три состояния Promise.
- Вы не путаете Promise с готовым результатом.
- Вы используете `.then`, `.catch`, `.finally`.
- Вы понимаете роль `return` в chain.
- Вы не создаёте лишний `new Promise` вокруг Promise API.
- Вы не оставляете rejected Promise необработанным.

