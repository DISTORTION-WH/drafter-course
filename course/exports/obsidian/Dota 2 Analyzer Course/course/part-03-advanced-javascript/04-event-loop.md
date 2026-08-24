# Глава 4. Синхронный код, call stack и event loop

## 1. Синхронное выполнение

```js
console.log("A");
console.log("B");
console.log("C");
```

Вывод всегда:

```text
A
B
C
```

Каждая инструкция завершается до начала следующей.

## 2. Call stack

Call stack хранит активные вызовы функций.

```js
function calculateKda(kills, deaths, assists) {
  return divide(kills + assists, deaths === 0 ? 1 : deaths);
}

function divide(first, second) {
  return first / second;
}

const result = calculateKda(10, 2, 8);
```

Упрощённо:

```text
global code
→ calculateKda
  → divide
  ← divide returns
← calculateKda returns
```

Stack trace при ошибке показывает эту цепочку.

## 3. Blocking

Пока JavaScript выполняет долгую синхронную работу, тот же поток не может обрабатывать другие JavaScript callbacks.

```js
let total = 0;

for (let index = 0; index < 5_000_000_000; index += 1) {
  total += index;
}
```

Такой CPU-heavy цикл блокирует процесс. Асинхронность сама по себе не ускоряет тяжёлые вычисления.

Для replay parsing позднее будет отдельный worker/service, а не огромный цикл внутри HTTP request handler.

## 4. Зачем асинхронность

Многие операции большую часть времени ожидают:

- файл;
- сеть;
- базу данных;
- таймер;
- очередь.

Node.js начинает операцию, а JavaScript может продолжить другую работу. Когда результат готов, соответствующий callback/Promise continuation получит возможность выполниться.

## 5. Таймер

```js
console.log("Начало");

setTimeout(() => {
  console.log("Таймер");
}, 0);

console.log("Конец");
```

Вывод:

```text
Начало
Конец
Таймер
```

`0` не означает «выполни прямо сейчас». Callback становится доступным после текущего синхронного кода и не раньше минимальной задержки.

## 6. Event loop — практическая модель

Упрощённо:

1. Выполняется текущий call stack.
2. Завершившиеся асинхронные операции ставят работу в очереди.
3. Когда stack пуст, event loop выбирает готовую работу по правилам очередей и фаз.
4. Callback выполняется в JavaScript thread.

Реальный event loop Node.js имеет несколько фаз. Для курса сейчас достаточно понимать: асинхронный callback не прерывает произвольную строку синхронного кода.

## 7. Promise microtask

```js
console.log("A");

Promise.resolve().then(() => {
  console.log("Promise");
});

setTimeout(() => {
  console.log("Timer");
}, 0);

console.log("B");
```

Ожидаемый вывод:

```text
A
B
Promise
Timer
```

После синхронного stack Promise continuations в microtask queue обычно выполняются раньше готового timer callback.

Не пытайтесь строить бизнес-логику на тонких различиях фаз. Используйте `await` и явные зависимости операций.

## 8. Асинхронность не равна параллельности

Асинхронность позволяет не блокировать ожидание.

Параллельность означает фактическое одновременное выполнение работы на нескольких вычислительных ресурсах.

HTTP requests могут одновременно ожидать сеть. Но два больших JavaScript CPU-цикла в одном thread не начинают автоматически работать на двух ядрах.

## 9. Синхронный и асинхронный filesystem API

Синхронно:

```js
import { readFileSync } from "node:fs";

const text = readFileSync("data.json", "utf8");
```

Процесс блокирует JavaScript до чтения файла.

Асинхронно:

```js
import { readFile } from "node:fs/promises";

const text = await readFile("data.json", "utf8");
```

Backend и workers курса используют asynchronous I/O. Синхронные функции допустимы для маленьких одноразовых startup/config операций, но решение должно быть сознательным.

## 10. Порядок логов и результат функции

```js
function loadMatches() {
  setTimeout(() => {
    return [1, 2, 3];
  }, 100);
}

const result = loadMatches();
console.log(result); // undefined
```

`return` принадлежит callback таймера, а не `loadMatches`. Внешняя функция уже завершилась.

Для будущего результата используется Promise.

## 11. Упражнения

### Упражнение 1

Предскажите порядок:

```js
console.log(1);
setTimeout(() => console.log(2), 0);
console.log(3);
```

### Упражнение 2

Добавьте `Promise.resolve().then(...)` и снова предскажите порядок.

### Упражнение 3

Объясните, почему `return` внутри `setTimeout` не возвращает значение внешней функции.

### Упражнение 4

Объясните, почему `async` не делает тяжёлый replay parser автоматически параллельным.

## Definition of Done

- Вы понимаете синхронное выполнение и call stack.
- Вы понимаете blocking.
- Вы можете объяснить роль event loop без магии.
- Вы предсказываете простой порядок sync/Promise/timer.
- Вы отличаете асинхронность от параллельности.
- Вы понимаете, почему будущий результат нельзя вернуть обычным `return` из callback таймера.

