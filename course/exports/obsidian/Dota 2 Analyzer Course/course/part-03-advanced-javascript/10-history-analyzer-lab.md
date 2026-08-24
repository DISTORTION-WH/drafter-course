# 10. Лабораторная: анализ истории матчей

## Результат лабораторной

Вы самостоятельно соберёте CLI-приложение, которое:

1. получает необязательный путь к JSON;
2. асинхронно читает файл;
3. разбирает JSON;
4. проверяет историю и каждый матч;
5. рассчитывает общую статистику;
6. группирует статистику героев через `Map`;
7. считает уникальных игроков через `Set`;
8. печатает читаемый отчёт;
9. корректно завершает процесс при ошибке.

Не копируйте эталон сразу. Сначала выполняйте шаги самостоятельно, запускайте код после каждого изменения и только потом сравнивайте.

## 1. Создайте структуру

```text
dota-history-cli/
├── data/
│   └── matches.json
├── src/
│   ├── domain/
│   │   ├── history-analytics.js
│   │   └── validation.js
│   ├── io/
│   │   └── read-json.js
│   ├── presentation/
│   │   └── print-history-report.js
│   └── index.js
├── test/
│   ├── history-analytics.test.js
│   ├── read-json.test.js
│   └── validation.test.js
└── package.json
```

## 2. Настройте `package.json`

```json
{
  "name": "dota-history-cli",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "test": "node --test"
  }
}
```

Разбор:

- `private: true` защищает учебный пакет от случайной публикации;
- `type: module` включает `import` и `export`;
- `npm start` запускает CLI;
- `npm test` запускает встроенный test runner Node.js;
- внешние dependencies не нужны.

## 3. Подготовьте данные

В `matches.json` запишите массив минимум из трёх матчей. Контракт матча:

```js
{
  id: "8123456789",
  status: "finished",
  durationSeconds: 2470,
  radiantWin: true,
  radiantTeam: "Aurora Owls",
  direTeam: "Crimson Roshan",
  players: [/* ровно 10 игроков */]
}
```

Контракт игрока:

```js
{
  accountId: "1001",
  name: "North",
  hero: "Queen of Pain",
  team: "radiant",
  kills: 7,
  deaths: 2,
  assists: 14
}
```

Требования к набору:

- один и тот же `accountId` должен встречаться в нескольких матчах;
- хотя бы один герой должен повторяться;
- должны быть победы и Radiant, и Dire;
- в одном матче можно добавить stand-in с новым `accountId`.

## 4. Напишите JSON-слой

В `read-json.js` экспортируйте:

```js
parseJson(text, source)
readJsonFile(filePath)
```

Проверьте отдельно:

- корректная строка превращается в объект;
- повреждённая строка бросает ошибку с именем source;
- существующий файл читается;
- отсутствующий файл даёт понятный контекст.

## 5. Напишите validation

Сначала маленькие проверки:

```js
isNonEmptyString(value)
isNonNegativeNumber(value)
```

Затем:

```js
validatePlayer(player, context)
validateMatch(match, context)
validateMatchHistory(matches)
```

Минимальные правила игрока:

- это объект, но не массив и не `null`;
- `accountId`, `name`, `hero` — непустые строки;
- `team` равен `radiant` или `dire`;
- kills, deaths и assists — конечные неотрицательные числа.

Минимальные правила матча:

- непустой строковый ID;
- `status === "finished"`;
- `durationSeconds > 0`;
- `radiantWin` — boolean;
- обе команды имеют непустые имена;
- игроков ровно 10;
- Radiant-игроков ровно 5;
- Dire-игроков ровно 5;
- внутри одного матча нет повторяющихся `accountId`.

Ошибка должна указывать место:

```text
История матчей[1].players[7].kills должно быть неотрицательным числом
```

## 6. Реализуйте статистику героев

Создайте `Map`, где ключ — имя героя:

```js
const statsByHero = new Map();
```

Для каждого игрока каждого матча обновляйте:

```js
{
  hero,
  games,
  wins,
  kills,
  assists
}
```

Игрок победил, если:

```js
const playerWon = player.team === "radiant"
  ? match.radiantWin
  : !match.radiantWin;
```

После группировки превратите `Map` в массив:

```js
const heroStats = [...statsByHero.values()];
```

Добавьте вычисляемые поля:

- `winRate` в процентах;
- `averageKills`;
- `averageAssists`.

Округляйте до двух знаков только конечное значение, а не каждое промежуточное действие.

## 7. Реализуйте общий отчёт

`analyzeMatchHistory(matches)` должна вернуть объект:

```js
{
  totalMatches,
  radiantWins,
  direWins,
  totalKills,
  averageDurationSeconds,
  uniquePlayers,
  mostPickedHero,
  heroStats,
  matchSummaries
}
```

Не печатайте внутри этой функции.

Для уникальных игроков:

```js
const accountIds = new Set();
```

Добавляйте `accountId`, а не nickname. Ник игрока может измениться, а ID используется как стабильный идентификатор.

Сортировка героев:

1. больше игр — выше;
2. при равенстве больше побед — выше;
3. затем имя героя по алфавиту.

Так результат детерминирован и тест не будет случайно меняться.

## 8. Сделайте presentation-слой

`printHistoryReport(report)` отвечает только за текст:

```text
История профессиональных матчей Dota 2
Матчей: 3
Побед Radiant: 1
Побед Dire: 2
...
```

Добавьте таблицу пяти наиболее популярных героев. Для первого проекта достаточно строк с разделителем `|` — специальная библиотека таблиц не нужна.

## 9. Соедините pipeline

В `index.js`:

1. определите встроенный путь через `import.meta.url`;
2. прочитайте `process.argv[2]`;
3. выберите путь;
4. вызовите `readJsonFile`;
5. вызовите `analyzeMatchHistory`;
6. вызовите `printHistoryReport`;
7. перехватите последнюю ошибку;
8. установите `process.exitCode = 1`.

## 10. Напишите тесты

Минимальный набор:

### `read-json.test.js`

- parsing корректного JSON;
- ошибка повреждённого JSON;
- чтение временного или демонстрационного файла.

### `validation.test.js`

- корректная история проходит;
- не-массив отклоняется;
- матч с девятью игроками отклоняется;
- повтор account ID отклоняется;
- отрицательные kills отклоняются.

### `history-analytics.test.js`

- верно число матчей;
- верны победы сторон;
- Set считает уникальные account ID;
- повторяющийся герой имеет нужное число игр;
- win rate и средние значения корректны;
- исходный массив после анализа не изменился.

## 11. Ручная проверка ошибок

Выполните:

```powershell
npm start
npm test
node src/index.js data/matches.json
node src/index.js missing.json
```

Последняя команда должна:

- вывести понятное сообщение в stderr;
- завершиться с ненулевым exit code;
- не показывать ложный успешный отчёт.

## Definition of Done

Лабораторная завершена, если:

- приложение запускается без внешних пакетов;
- данные находятся в JSON, а не в исходном коде;
- вся файловая работа асинхронна;
- validation выполняется до расчётов;
- расчёты не используют `console.log`;
- `Map` и `Set` применены по назначению;
- тесты проходят;
- некорректный путь завершается управляемой ошибкой;
- вы можете объяснить каждую функцию и каждый передаваемый ей аргумент.

После собственной попытки сравните результат с [эталонным проектом](examples/dota-history-cli).

