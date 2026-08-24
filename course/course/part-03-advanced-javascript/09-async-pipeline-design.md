# 9. Проектирование асинхронного pipeline

## 1. Что такое pipeline

Pipeline — последовательность этапов, где результат одного этапа становится входом следующего:

```text
источник
→ чтение
→ parsing
→ validation
→ normalization
→ analysis
→ presentation
```

Для анализатора истории:

```text
matches.json
→ readJsonFile
→ validateMatchHistory
→ analyzeMatchHistory
→ printHistoryReport
```

Главная польза не в красивой схеме. Каждый этап имеет одну ответственность, отдельные ошибки и отдельные тесты.

## 2. I/O-снаружи, расчёты внутри

Удобная архитектурная идея называется «functional core, imperative shell»:

- внешний слой выполняет изменчивые операции: читает файл, обращается к сети, пишет в базу, выводит текст;
- внутренний слой получает готовые значения и выполняет чистые расчёты.

Пример внешней оболочки:

```js
async function main() {
  const rawData = await readJsonFile(inputPath);
  const report = analyzeMatchHistory(rawData);
  printHistoryReport(report);
}
```

Пример чистого ядра:

```js
export function calculateWinRate(wins, games) {
  return games === 0 ? 0 : (wins / games) * 100;
}
```

У `calculateWinRate` нет файла, сети, консоли и глобального состояния. Поэтому её легко проверить десятками входов.

## 3. Контракты между этапами

Каждый этап должен ясно отвечать на три вопроса:

1. Что он принимает?
2. Что возвращает?
3. Как сообщает об ошибке?

Пример контракта:

```text
readJsonFile(filePath)
принимает: непустой путь
возвращает: Promise<unknown>
ошибка: файл не прочитан или JSON некорректен
```

```text
validateMatchHistory(value)
принимает: unknown
возвращает: ничего, если всё корректно
ошибка: структура не соответствует истории матчей
```

```text
analyzeMatchHistory(matches)
принимает: корректный массив матчей
возвращает: объект отчёта
ошибка: нарушение domain-инварианта
```

В JavaScript слово `unknown` здесь пока используется как описание. В следующей части TypeScript превратит его в настоящий тип и заставит выполнить проверку до анализа.

## 4. Где должна находиться validation

Проверка располагается на границе недоверенных данных:

```js
const rawData = await readJsonFile(inputPath);
validateMatchHistory(rawData);
const report = analyzeValidatedHistory(rawData);
```

В эталонном проекте публичная `analyzeMatchHistory` сама вызывает validation, чтобы её нельзя было случайно пропустить:

```js
export function analyzeMatchHistory(matches) {
  validateMatchHistory(matches);
  // расчёты
}
```

Это небольшое дублирование ответственности ради безопасного публичного API. Позже мы сможем разделить validated-типы точнее.

## 5. Не смешиваем расчёт и вывод

Плохой вариант:

```js
function analyze(matches) {
  const total = matches.length;
  console.log(`Матчей: ${total}`);
}
```

Функция вычисляет и сразу печатает. Тест вынужден перехватывать консоль, а мобильный интерфейс не может получить число.

Лучше:

```js
function analyze(matches) {
  return {
    totalMatches: matches.length,
  };
}

function printReport(report) {
  console.log(`Матчей: ${report.totalMatches}`);
}
```

Позже тот же объект отчёта можно передать:

- CLI-принтеру;
- REST API;
- React Native экрану;
- экспорту CSV;
- тесту.

## 6. Контекст ошибок на каждой границе

Ошибка должна становиться понятнее по мере движения вверх:

```js
try {
  return await readFile(filePath, "utf8");
} catch (error) {
  throw new Error(`Не удалось прочитать ${filePath}`, {
    cause: error,
  });
}
```

В `main` не нужно превращать ошибку в «успешный» результат:

```js
try {
  await main();
} catch (error) {
  console.error(`Ошибка: ${error.message}`);
  process.exitCode = 1;
}
```

`process.exitCode = 1` сообщает операционной системе, что команда завершилась неуспешно, но даёт Node.js корректно закончить уже запланированную работу.

## 7. Почему `main` — отдельная функция

```js
async function main() {
  // сценарий приложения
}

try {
  await main();
} catch (error) {
  // единая последняя граница ошибок
}
```

Преимущества:

- виден весь use case сверху вниз;
- одна точка обработки непредвиденной ошибки;
- детали разнесены по модулям;
- позже main легко заменить HTTP-контроллером.

## 8. Зависимости движутся внутрь через аргументы

Скрытая зависимость:

```js
let currentMatches = [];

function analyze() {
  return currentMatches.length;
}
```

Явная зависимость:

```js
function analyze(matches) {
  return matches.length;
}
```

Аргумент функции — это честное описание того, что ей нужно. Чем меньше скрытых глобальных переменных, тем легче читать, тестировать и переиспользовать код.

## 9. Нормализация

Данные разных источников могут называть одно поле по-разному:

```js
// источник A
{ match_id: 8123456789 }

// наше приложение
{ id: "8123456789" }
```

Normalization переводит внешнюю форму во внутреннюю:

```js
function normalizeExternalMatch(rawMatch) {
  return {
    id: String(rawMatch.match_id),
    durationSeconds: rawMatch.duration,
    radiantWin: rawMatch.radiant_win,
  };
}
```

В учебном JSON уже используется внутренняя форма, поэтому отдельный normalizer пока не нужен. Но его место в pipeline мы фиксируем заранее.

## 10. Pipeline будущего backend

При подключении Dota API изменится источник, но ядро останется знакомым:

```text
HTTP request
→ status/timeout/retry
→ JSON parsing
→ external schema validation
→ normalization
→ domain analytics
→ database/API response
```

Именно поэтому сейчас мы не помещаем `readFile` внутрь статистической функции.

## 11. Упражнение на проектирование

Для каждого этапа истории матчей запишите:

- имя функции;
- вход;
- выход;
- возможные ошибки;
- является ли этап I/O или чистым расчётом;
- какой тест докажет его работу.

Пример таблицы:

| Этап | Вход | Выход | Вид теста |
|---|---|---|---|
| parse | JSON-строка | unknown | unit |
| validation | unknown | успех/ошибка | unit |
| analysis | matches | report | unit |
| полный CLI | путь | текст + exit code | integration |

## Критерий готовности

Вы можете нарисовать pipeline приложения и объяснить, почему `readFile`, `analyzeMatchHistory` и `console.log` находятся в разных модулях.

