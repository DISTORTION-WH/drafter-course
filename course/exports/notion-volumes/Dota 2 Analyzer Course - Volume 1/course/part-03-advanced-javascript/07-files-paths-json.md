# 7. Файлы, пути и JSON

## Что мы строим

До сих пор данные матча можно было записать прямо в JavaScript-файле. Это удобно для первых упражнений, но настоящее приложение получает данные извне: из файла, базы данных или HTTP API.

В этой главе мы сделаем первый внешний источник данных:

```text
data/matches.json
→ чтение файла
→ строка
→ JSON.parse
→ JavaScript-массив
```

Важно различать каждый этап. Файл, текст и JavaScript-объект — не одно и то же.

## 1. Что хранится в JSON-файле

JSON — текстовый формат обмена данными. В нём можно записывать:

- объекты;
- массивы;
- строки;
- числа;
- `true` и `false`;
- `null`.

Пример:

```json
{
  "id": "8123456789",
  "durationSeconds": 2470,
  "radiantWin": true
}
```

JSON похож на запись JavaScript-объекта, но правила строже:

- ключи должны быть в двойных кавычках;
- строки должны быть в двойных кавычках;
- нельзя писать комментарии;
- нельзя хранить `undefined`, функцию, `Map`, `Set` или `Date` как специальные типы;
- после последнего свойства нельзя ставить запятую.

Это корректный JavaScript, но некорректный JSON:

```js
{
  id: "8123456789",
  durationSeconds: 2470,
}
```

## 2. Асинхронное чтение файла

Node.js предоставляет модуль `node:fs/promises`:

```js
import { readFile } from "node:fs/promises";

const text = await readFile("data/matches.json", "utf8");
```

Разберём строку:

- `import` подключает готовую функцию Node.js;
- `readFile(...)` начинает чтение;
- функция возвращает `Promise`;
- `await` ждёт завершения Promise;
- второй аргумент `"utf8"` просит вернуть текст;
- переменная `text` содержит строку, а не массив матчей.

Без кодировки Node.js вернёт `Buffer` — набор байтов:

```js
const bytes = await readFile("data/matches.json");
```

Для JSON нам почти всегда сразу нужен `"utf8"`.

## 3. Превращение текста в данные

```js
const matches = JSON.parse(text);
```

`JSON.parse`:

1. принимает строку;
2. проверяет синтаксис JSON;
3. создаёт соответствующие JavaScript-значения;
4. бросает `SyntaxError`, если текст повреждён.

Например:

```js
const text = '[{"id":"1"}]';
const matches = JSON.parse(text);

console.log(Array.isArray(matches)); // true
console.log(matches[0].id); // "1"
```

`JSON.parse` проверяет только синтаксис. Он не знает, что Dota-матч должен содержать 10 игроков. Поэтому после parsing обязательно идёт domain validation:

```js
const parsed = JSON.parse(text);
validateMatchHistory(parsed);
```

## 4. Разделяем parsing и чтение

Полезно создать две функции:

```js
export function parseJson(text, source = "JSON") {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Не удалось разобрать ${source}`, { cause: error });
  }
}

export async function readJsonFile(filePath) {
  let text;

  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Не удалось прочитать файл ${filePath}`, {
      cause: error,
    });
  }

  return parseJson(text, filePath);
}
```

Почему две функции лучше одной:

- `parseJson` легко тестировать простой строкой;
- `readJsonFile` отвечает только за I/O и контекст файловой ошибки;
- позже `parseJson` можно использовать для ответа HTTP API;
- ошибка сообщает имя источника.

`parseJson` вызывается после `try/catch` чтения. Поэтому синтаксическая ошибка JSON не будет ошибочно подписана как проблема доступа к файлу.

Свойство `cause` сохраняет исходную ошибку. Благодаря этому верхний уровень приложения показывает понятное сообщение, а разработчик всё ещё может увидеть настоящую причину.

## 5. Относительный путь и текущая директория

Путь `data/matches.json` отсчитывается от текущей рабочей директории процесса — `process.cwd()`.

Если выполнить команду из корня проекта, всё сработает:

```powershell
node src/index.js
```

Но если запустить тот же файл из другого каталога, относительный путь может перестать существовать. Это частая ошибка новичка: путь написан правильно относительно исходного файла, но Node.js ищет его относительно места запуска команды.

Посмотреть текущую директорию:

```js
console.log(process.cwd());
```

## 6. Путь относительно JavaScript-модуля

Для встроенного демонстрационного файла надёжнее строить путь относительно самого `index.js`:

```js
import { fileURLToPath } from "node:url";

const defaultDataPath = fileURLToPath(
  new URL("../data/matches.json", import.meta.url),
);
```

Здесь:

- `import.meta.url` — адрес текущего модуля;
- `new URL("../data/matches.json", import.meta.url)` строит адрес соседнего файла;
- `fileURLToPath` превращает адрес `file:///...` в обычный путь Windows, macOS или Linux.

Такой путь не зависит от того, из какой папки пользователь запустил программу.

## 7. Путь от пользователя через аргумент CLI

Массив `process.argv` содержит аргументы командной строки:

```js
console.log(process.argv);
```

При команде:

```powershell
node src/index.js data/another-history.json
```

- `process.argv[0]` — путь к Node.js;
- `process.argv[1]` — путь к `src/index.js`;
- `process.argv[2]` — `data/another-history.json`.

Пользовательский путь удобно сделать абсолютным:

```js
import { resolve } from "node:path";

const userPath = process.argv[2];
const inputPath = userPath
  ? resolve(process.cwd(), userPath)
  : defaultDataPath;
```

Получается понятное правило:

- если путь указан, используем его относительно места запуска;
- если нет, используем встроенный пример относительно модуля.

## 8. Сохранение JSON

Обратное преобразование выполняет `JSON.stringify`:

```js
const report = {
  totalMatches: 3,
  radiantWins: 1,
};

const compactText = JSON.stringify(report);
const readableText = JSON.stringify(report, null, 2);
```

Аргумент `2` задаёт отступ в два пробела:

```json
{
  "totalMatches": 3,
  "radiantWins": 1
}
```

Запись файла:

```js
import { writeFile } from "node:fs/promises";

await writeFile("report.json", readableText, "utf8");
```

В нашем проекте отчёт пока выводится в консоль. Запись результата появится позже, когда мы изучим конфигурацию и экспорт данных.

## 9. Типовые файловые ошибки

Наиболее частые причины:

- `ENOENT` — файл или одна из директорий не существует;
- `EACCES` — недостаточно прав;
- файл прочитан, но JSON повреждён;
- JSON корректен, но структура не соответствует матчам;
- пользователь передал путь не из той директории.

Эти ситуации должны различаться:

```text
Не удалось прочитать файл ...
Причина: ENOENT
```

```text
Не удалось разобрать ...
Причина: Unexpected token ...
```

```text
История матчей некорректна: матч [1] должен содержать 10 игроков
```

Чем точнее сообщение, тем быстрее вы найдёте слой, на котором возникла проблема.

## 10. Упражнения

1. Создайте `data/example.json` с одним объектом и прочитайте его.
2. Уберите `"utf8"`, выведите результат и убедитесь, что это `Buffer`.
3. Исправьте кодировку и выполните `JSON.parse`.
4. Намеренно удалите кавычку из JSON и прочитайте `SyntaxError`.
5. Передайте путь к файлу через `process.argv[2]`.
6. Запустите программу из другой директории и сравните обычный относительный путь с путём через `import.meta.url`.

## Критерий готовности

Вы готовы идти дальше, если можете своими словами объяснить цепочку:

```text
путь → readFile → Promise → await → текст → JSON.parse → данные → validation
```
