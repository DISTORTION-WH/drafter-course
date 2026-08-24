# Глава 8. Отладка Node.js в терминале и VS Code

## 1. Отладка — это поиск факта

Не начинайте со случайного изменения кода. Сначала сформулируйте:

```text
Ожидалось:
Получилось:
Минимальный вход:
Первая функция, где значения расходятся:
```

Цель отладки — найти первую точку, в которой реальное состояние отличается от ожидаемого.

## 2. Воспроизводимый пример

Проблема должна повторяться одной командой:

```powershell
npm start
```

или одним тестом:

```powershell
npm test -- --test-name-pattern="ноль смертей"
```

Если ошибка возникает случайно, запишите входные данные, время, версию Node.js и точную команду.

## 3. Stack trace Node.js

Пример:

```text
TypeError: Cannot read properties of undefined (reading 'kills')
    at analyzePlayer (src/domain/match-report.js:12:21)
    at createMatchReport (src/domain/match-report.js:45:18)
    at src/index.js:7:18
```

Читайте:

1. Тип: `TypeError`.
2. Сообщение: чтение `kills` у `undefined`.
3. Первая строка вашего кода: `match-report.js:12`.
4. Цепочка вызовов ниже.

Откройте строку 12 и выясните, какое значение оказалось `undefined`.

## 4. Временный structured log

```js
console.log({
  function: "analyzePlayer",
  player,
});
```

Объект понятнее нескольких несвязанных значений:

```js
console.log(player, kills, deaths, assists);
```

Используйте метку, чтобы знать источник лога.

После исправления временные логи удалите. В production позднее появится structured logger.

Не выводите:

- API keys;
- access/refresh tokens;
- пароли;
- `.env` целиком;
- персональные данные без необходимости.

## 5. Breakpoint

Breakpoint останавливает программу перед выбранной строкой.

В VS Code:

1. Откройте `.js`-файл.
2. Нажмите слева от номера строки.
3. Появится красная точка.
4. Откройте Run and Debug.
5. Запустите программу.

Во время остановки доступны:

- Variables;
- Watch;
- Call Stack;
- Breakpoints;
- Debug Console.

## 6. Конфигурация запуска

Создайте `.vscode\launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "program": "${workspaceFolder}/src/index.js",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

Части:

- `type: node` — Node.js debugger;
- `request: launch` — VS Code запускает процесс;
- `program` — entry point;
- `workspaceFolder` — открытый корень проекта;
- `skipFiles` — не заходить в internals Node.js без необходимости.

## 7. Step Over, Into и Out

- Step Over — выполнить текущую строку, не заходя внутрь вызываемой функции.
- Step Into — зайти внутрь функции.
- Step Out — выполнить остаток текущей функции и вернуться к вызывающему коду.
- Continue — продолжить до следующего breakpoint.

Если ошибка в `createMatchReport`, Step Into помогает проследить `validateMatch`, `analyzePlayer` и `createTeamSummary`.

## 8. Watch

Добавьте выражения:

```text
player.kills
player.deaths
player.assists
(player.kills + player.assists) / player.deaths
```

Watch пересчитывает выражения на каждой остановке.

Не вызывайте в Watch функции с изменением данных: наблюдение не должно менять исследуемое состояние.

## 9. Conditional breakpoint

Если цикл обрабатывает десять игроков, можно остановиться только на нужном:

```text
player.name === "Echo"
```

Или при ошибочном значении:

```text
player.deaths < 0
```

Это удобнее десяти ручных продолжений.

## 10. `debugger`

Можно поставить остановку в коде:

```js
function analyzePlayer(player) {
  debugger;
  // ...
}
```

При запуске под debugger выполнение остановится. После исследования удалите строку.

## 11. Запуск с инспектором

Терминальный вариант:

```powershell
node --inspect-brk .\src\index.js
```

`--inspect-brk` включает inspector и останавливает выполнение перед началом пользовательского кода. Для первого проекта конфигурация VS Code проще.

## 12. Поиск ошибки делением задачи

Если неправильный полный отчёт:

1. Проверить `calculateKda`.
2. Проверить `analyzePlayer` на одном игроке.
3. Проверить `createTeamSummary` на пяти игроках.
4. Проверить `findTopPlayer`.
5. Только затем полный `createMatchReport`.

Это быстрее, чем многократно изучать огромный объект целиком.

## 13. Ошибки ES modules

### `Cannot use import statement outside a module`

Проверьте:

```json
"type": "module"
```

### `ERR_MODULE_NOT_FOUND`

Проверьте путь, `.js` и регистр имени.

### `does not provide an export named`

Импортируемое имя не экспортируется или написано иначе.

## 14. Ошибка должна сохранять контекст

Плохо:

```js
throw new Error("Ошибка");
```

Лучше:

```js
throw new Error(
  `Невалидный игрок ${player.name ?? "unknown"}: ${errors.join(", ")}`,
);
```

Но не включайте секреты или огромный raw payload.

## 15. Упражнения

### Упражнение 1

Поставьте breakpoint внутри `calculateKda` и проследите обычный случай.

### Упражнение 2

Поставьте conditional breakpoint на игрока `Echo`.

### Упражнение 3

Намеренно импортируйте несуществующее имя, прочитайте ошибку и исправьте export/import.

### Упражнение 4

Создайте логическую ошибку в формуле и найдите первую неправильную переменную через debugger.

## Definition of Done

- Вы формулируете ожидание и факт.
- Вы читаете Node.js stack trace.
- Вы ставите breakpoint.
- Вы используете Step Over и Step Into.
- Вы просматриваете Variables и Call Stack.
- Вы умеете поставить conditional breakpoint.
- Вы не выводите секреты в лог.

