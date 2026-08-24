# 8. Параллельные операции и ограничение конкурентности

## 1. Последовательно или одновременно

Представим, что надо загрузить три файла матчей.

Последовательный вариант:

```js
const first = await readJsonFile("match-1.json");
const second = await readJsonFile("match-2.json");
const third = await readJsonFile("match-3.json");
```

Второе чтение начнётся только после первого, третье — после второго.

Конкурентный вариант:

```js
const [first, second, third] = await Promise.all([
  readJsonFile("match-1.json"),
  readJsonFile("match-2.json"),
  readJsonFile("match-3.json"),
]);
```

Все три операции запускаются до ожидания общего результата.

Если каждая операция занимает примерно одну секунду:

- последовательный вариант займёт около трёх секунд;
- конкурентный — около одной секунды, если ресурс допускает одновременную работу.

## 2. Конкурентность не равна параллельному JavaScript

JavaScript-код в обычном Node.js-процессе выполняется одним основным потоком. Но процесс может ожидать несколько операций ввода-вывода одновременно:

```text
JavaScript запускает чтение A
JavaScript запускает чтение B
операционная система работает с A и B
event loop получает завершённые результаты
```

Это конкурентность. Для файлов и HTTP-запросов она очень полезна.

Тяжёлый расчёт в обычном цикле — другая ситуация. Десять одновременных Promise не превратят один процессорный поток в десять. Для тяжёлых вычислений позже могут понадобиться worker threads или отдельные процессы.

## 3. `Promise.all`

`Promise.all` получает коллекцию Promise и возвращает один Promise:

```js
const results = await Promise.all(promises);
```

Свойства:

- порядок результатов совпадает с порядком входных Promise;
- результат готов, когда готовы все операции;
- если одна операция отклонена, общий Promise тоже отклоняется;
- остальные уже запущенные операции автоматически не отменяются.

Пример сохранения порядка:

```js
const results = await Promise.all([
  loadMatch("slow"),
  loadMatch("fast"),
]);

console.log(results[0].id); // всё равно результат "slow"
console.log(results[1].id); // результат "fast"
```

## 4. `Promise.allSettled`

Иногда нужно обработать всё, даже если отдельные источники сломались:

```js
const outcomes = await Promise.allSettled([
  readJsonFile("match-1.json"),
  readJsonFile("missing.json"),
  readJsonFile("match-3.json"),
]);
```

Результат содержит объекты двух видов:

```js
{ status: "fulfilled", value: /* данные */ }
```

```js
{ status: "rejected", reason: /* ошибка */ }
```

Разделение:

```js
const successful = outcomes
  .filter((outcome) => outcome.status === "fulfilled")
  .map((outcome) => outcome.value);

const failed = outcomes.filter(
  (outcome) => outcome.status === "rejected",
);
```

Для будущего сборщика Dota-данных это полезно: ошибка одного матча не обязательно должна уничтожать весь ночной импорт.

## 5. Почему нельзя запускать всё сразу

Допустим, у нас 100 000 match ID:

```js
await Promise.all(matchIds.map((id) => loadMatch(id)));
```

Такой код одновременно создаст 100 000 запросов. Возможные последствия:

- превышение rate limit внешнего API;
- слишком много открытых соединений;
- большое потребление памяти;
- нагрузка на базу данных;
- временная блокировка вашего ключа API;
- сложное восстановление после ошибок.

Правильный вопрос не «можем ли мы сделать одновременно?», а «какая конкурентность безопасна для источника и нашего сервера?»

## 6. Простой ограничитель конкурентности

Создадим учебную функцию:

```js
export async function mapWithConcurrency(items, limit, worker) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError("limit должен быть целым числом не меньше 1");
  }

  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      results[currentIndex] = await worker(
        items[currentIndex],
        currentIndex,
      );
    }
  }

  const workerCount = Math.min(limit, items.length);
  const workers = Array.from(
    { length: workerCount },
    () => runWorker(),
  );

  await Promise.all(workers);
  return results;
}
```

Использование:

```js
const matches = await mapWithConcurrency(
  matchIds,
  5,
  async (matchId) => loadMatch(matchId),
);
```

Одновременно работают не более пяти вызовов `loadMatch`.

### Как устроена функция

1. `results` заранее имеет нужную длину.
2. `nextIndex` указывает на следующую необработанную запись.
3. Каждый worker берёт индекс и увеличивает `nextIndex` до первого `await`.
4. После завершения операции worker берёт следующую запись.
5. Результат записывается по исходному индексу, поэтому порядок сохраняется.
6. `Promise.all(workers)` ждёт окончания всех worker-функций.

Это учебная реализация. В production мы добавим повторы, задержки, отмену, таймауты и метрики.

## 7. Батчи

Более простой, но менее гибкий вариант — обрабатывать данные пачками:

```js
async function loadInBatches(ids, batchSize) {
  const matches = [];

  for (let start = 0; start < ids.length; start += batchSize) {
    const batch = ids.slice(start, start + batchSize);
    const loaded = await Promise.all(batch.map(loadMatch));
    matches.push(...loaded);
  }

  return matches;
}
```

Между пачками бывает пауза:

```js
await delay(500);
```

Минус батчей: если один запрос в пачке очень медленный, новые запросы не стартуют, хотя остальные места уже освободились. Worker pool использует лимит равномернее.

## 8. Выбор стратегии для проекта

| Ситуация | Подход |
|---|---|
| Все результаты обязательны, объектов мало | `Promise.all` |
| Нужен отчёт и об успехах, и об ошибках | `Promise.allSettled` |
| Тысячи файлов или HTTP-запросов | ограничитель конкурентности |
| API задаёт число запросов в секунду | limiter + задержки/rate limiter |
| Операции зависят друг от друга | последовательный `await` |

Не ускоряйте зависимые шаги искусственно. Сначала нужен список match ID, и только потом можно загружать матчи по этим ID.

## 9. Упражнения

1. Создайте `delay(ms)` и три Promise с разными задержками.
2. Сравните длительность последовательного `await` и `Promise.all`.
3. Сделайте один Promise отклонённым и изучите `Promise.all`.
4. Повторите опыт с `Promise.allSettled`.
5. Передайте 20 элементов в `mapWithConcurrency` с лимитом 3.
6. Добавьте счётчик активных worker-вызовов и докажите, что он не превышает 3.

## Критерий готовности

Вы должны уметь объяснить, почему `Promise.all` для десяти файлов полезен, а для ста тысяч HTTP-запросов опасен.

