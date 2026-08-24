# Глава 10. Лабораторная: многофайловый CLI-анализатор

## 1. Цель

Самостоятельно превратить лабораторную первой части в настоящий Node.js-проект.

Вы не добавляете новую большую бизнес-функцию. Цель — научиться организовывать и запускать уже понятный код.

## 2. Итоговая структура

```text
dota-match-cli/
  package.json
  src/
    index.js
    data/
      match.js
    domain/
      calculations.js
      validation.js
      match-report.js
    presentation/
      print-report.js
  test/
    calculations.test.js
    validation.test.js
    match-report.test.js
```

## 3. Шаг 1. Создание проекта

В папке для учебных проектов:

```powershell
New-Item -ItemType Directory -Path .\dota-match-cli
Set-Location .\dota-match-cli
npm init -y
code .
```

Проверьте `Get-Location` до создания файлов.

## 4. Шаг 2. Настройка package.json

Сделайте:

```json
{
  "name": "dota-match-cli",
  "version": "1.0.0",
  "description": "Учебный анализатор матча Dota 2",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "test": "node --test"
  }
}
```

На этом этапе внешние dependencies отсутствуют.

## 5. Шаг 3. Распределение ответственности

### `data/match.js`

Только учебные данные матча.

### `domain/calculations.js`

- `roundToTwoDigits`;
- `calculateKda`;
- `formatDuration`.

### `domain/validation.js`

- `isNonEmptyString`;
- `isNonNegativeNumber`;
- `validatePlayer`;
- `validateMatch`.

### `domain/match-report.js`

- `analyzePlayer`;
- `createTeamSummary`;
- `findTopPlayer`;
- `createMatchReport`.

### `presentation/print-report.js`

- `printMatchReport`.

### `index.js`

Только orchestration:

```js
import { match } from "./data/match.js";
import { createMatchReport } from "./domain/match-report.js";
import { printMatchReport } from "./presentation/print-report.js";

try {
  const report = createMatchReport(match);
  printMatchReport(report);
} catch (error) {
  console.error("Не удалось создать отчёт");
  console.error(error);
  process.exitCode = 1;
}
```

## 6. Шаг 4. Направление imports

Разрешено:

```text
index → data
index → domain
index → presentation
match-report → calculations
match-report → validation
```

Нежелательно:

```text
calculations → index
validation → presentation
data → domain
```

Нижние слои не знают о точке запуска и консольном представлении.

## 7. Шаг 5. Первый запуск

```powershell
npm start
```

Ожидается:

```text
Матч: 8123456789
Длительность: 41:10
Победитель: Aurora Owls
Radiant kills: 29
Dire kills: 19
Лучший KDA: North — 10.5
```

Если import не найден, не объединяйте файлы обратно. Проверьте путь, `.js`, регистр и `type: module`.

## 8. Шаг 6. Tests calculations

Минимум:

- обычный KDA;
- ноль смертей;
- формат длительности;
- округление.

## 9. Шаг 7. Tests validation

Минимум:

- валидный игрок;
- отрицательные kills;
- пустое имя;
- неправильная команда;
- `null` вместо игрока;
- неправильное число игроков матча.

## 10. Шаг 8. Tests report

Проверьте:

- победителя;
- длительность;
- kills обеих команд;
- лучшего игрока;
- неизменность исходного match;
- ошибку при невалидном матче.

## 11. Шаг 9. Проверка полного проекта

```powershell
npm test
npm start
```

Обе команды должны завершаться успешно.

## 12. Шаг 10. Намеренные поломки

По одной:

1. Удалите `.js` из import.
2. Измените export name.
3. Удалите `type: module`.
4. Сделайте `kills: -1`.
5. Сломайте формулу KDA.

Для каждой:

- запишите ошибку;
- определите её слой;
- восстановите код;
- запустите tests.

## 13. Дополнительные задания

1. Добавьте assists обеих команд в вывод.
2. Добавьте сортированный рейтинг игроков по KDA.
3. Добавьте `killDifference`.
4. Создайте отдельный formatter строки игрока.
5. Добавьте tests новых функций.

## Definition of Done

- Проект запускается через `npm start`.
- Tests запускаются через `npm test`.
- Нет circular imports.
- `index.js` не содержит формул.
- Domain не вызывает `console.log`.
- Исходные данные находятся в отдельном модуле.
- Ошибка устанавливает ненулевой exit code.
- Вы можете объяснить каждый import.

После самостоятельной работы изучите [разбор эталонного проекта](11-reference-project.md).

