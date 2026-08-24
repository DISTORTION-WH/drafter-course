# Глава 7. Лабораторная: консольный анализатор матча

## 1. Цель

Собрать темы первой части в одну программу.

Программа получает объект матча и создаёт отчёт:

- проверяет структуру матча;
- проверяет игроков;
- рассчитывает KDA;
- считает kills/deaths/assists команд;
- находит игрока с максимальным KDA;
- форматирует длительность;
- определяет победителя;
- не изменяет исходные данные.

## 2. Где писать многострочный код

В Chrome/Edge:

1. Откройте DevTools через `F12`.
2. Перейдите в `Sources`.
3. Слева найдите `Snippets`.
4. Создайте `New snippet`.
5. Назовите его `match-analyzer.js`.
6. Выполняйте через `Ctrl+Enter`.

Это удобнее одной строки в Console.

## 3. Исходные данные

Начните с этого объекта. Игроки учебные и не привязаны к реальному турниру.

```js
const match = {
  id: "8123456789",
  status: "finished",
  durationSeconds: 2470,
  radiantWin: true,
  radiantTeam: "Aurora Owls",
  direTeam: "Crimson Roshan",
  players: [
    { name: "North", hero: "Juggernaut", team: "radiant", kills: 12, deaths: 2, assists: 9 },
    { name: "River", hero: "Puck", team: "radiant", kills: 8, deaths: 3, assists: 14 },
    { name: "Stone", hero: "Mars", team: "radiant", kills: 4, deaths: 4, assists: 17 },
    { name: "Spark", hero: "Rubick", team: "radiant", kills: 3, deaths: 5, assists: 21 },
    { name: "Mist", hero: "Crystal Maiden", team: "radiant", kills: 2, deaths: 6, assists: 19 },
    { name: "Flame", hero: "Luna", team: "dire", kills: 7, deaths: 5, assists: 8 },
    { name: "Shade", hero: "Invoker", team: "dire", kills: 6, deaths: 5, assists: 11 },
    { name: "Iron", hero: "Centaur Warrunner", team: "dire", kills: 3, deaths: 6, assists: 12 },
    { name: "Echo", hero: "Lion", team: "dire", kills: 2, deaths: 7, assists: 13 },
    { name: "Frost", hero: "Jakiro", team: "dire", kills: 1, deaths: 6, assists: 16 },
  ],
};
```

## 4. Шаг 1. Маленькие функции

Самостоятельно реализуйте:

```js
function isNonEmptyString(value) {
  // boolean
}

function isNonNegativeNumber(value) {
  // boolean
}

function roundToTwoDigits(value) {
  // number
}

function calculateKda(kills, deaths, assists) {
  // number; deaths = 0 обрабатывается через safeDeaths = 1
}

function formatDuration(totalSeconds) {
  // строка вида 41:10
}
```

Проверьте каждую функцию отдельно до продолжения.

## 5. Шаг 2. Валидация игрока

Реализуйте:

```js
function validatePlayer(player) {
  // возвращает массив строк с ошибками
}
```

Правила:

- player — не `null` и является объектом;
- `name` и `hero` — непустые строки;
- `team` — `radiant` или `dire`;
- kills/deaths/assists — конечные неотрицательные числа.

## 6. Шаг 3. Анализ игрока

```js
function analyzePlayer(player) {
  // 1. вызвать validatePlayer
  // 2. при ошибках throw new Error
  // 3. вернуть новый объект со всеми исходными полями и kda
}
```

Исходный объект изменять нельзя.

Проверка:

```js
const analyzed = analyzePlayer(match.players[0]);

console.log(analyzed.kda);
console.log(match.players[0].kda); // должно остаться undefined
```

## 7. Шаг 4. Командная сводка

Реализуйте:

```js
function createTeamSummary(players, team) {
  // отфильтровать команду
  // посчитать kills, deaths, assists
  // посчитать средний KDA
  // вернуть объект
}
```

Ожидаемая форма:

```js
{
  team: "radiant",
  playerCount: 5,
  kills: 29,
  deaths: 20,
  assists: 80,
  averageKda: 7.85,
}
```

Если ваш `averageKda` немного отличается, сначала проверьте формулу и момент округления. Лучше суммировать точные значения и округлять только финальный результат.

## 8. Шаг 5. Лучший игрок

```js
function findTopPlayer(players) {
  // вернуть объект с максимальным kda
}
```

Сделайте первую версию через цикл `for...of`, чтобы явно увидеть сравнение.

Решите отдельно, что происходит при пустом массиве. Для этой лабораторной допустимо вернуть `null`.

## 9. Шаг 6. Валидация матча

```js
function validateMatch(match) {
  // вернуть массив ошибок
}
```

Правила:

- match — объект;
- ID — непустая строка;
- status равен `finished`;
- durationSeconds — число больше нуля;
- radiantWin — boolean;
- players — массив из десяти элементов;
- пять Radiant и пять Dire;
- каждый игрок проходит validation.

Сообщение об игроке должно включать его индекс:

```text
players[3]: hero должен быть непустой строкой
```

## 10. Шаг 7. Полный отчёт

```js
function createMatchReport(match) {
  // validateMatch
  // analyzePlayer для каждого игрока
  // team summaries
  // top player
  // winner
  // formatted duration
  // вернуть новый объект отчёта
}
```

Ожидаемая форма:

```js
{
  matchId: "8123456789",
  duration: "41:10",
  winner: "Aurora Owls",
  radiant: { /* summary */ },
  dire: { /* summary */ },
  topPlayer: { /* analyzed player */ },
  players: [ /* analyzed players */ ],
}
```

## 11. Шаг 8. Печать отчёта

Расчёт и вывод должны быть разделены:

```js
function printMatchReport(report) {
  console.log(`Матч: ${report.matchId}`);
  console.log(`Длительность: ${report.duration}`);
  console.log(`Победитель: ${report.winner}`);
  console.log(`Radiant kills: ${report.radiant.kills}`);
  console.log(`Dire kills: ${report.dire.kills}`);
  console.log(`Лучший KDA: ${report.topPlayer.name} — ${report.topPlayer.kda}`);
}
```

## 12. Шаг 9. Проверки

Добавьте минимум такие проверки:

```js
console.assert(calculateKda(10, 2, 8) === 9, "KDA: обычный случай");
console.assert(calculateKda(5, 0, 5) === 10, "KDA: ноль смертей");
console.assert(formatDuration(2470) === "41:10", "Формат времени");
console.assert(validatePlayer(match.players[0]).length === 0, "Валидный игрок");
```

Создайте копию плохого игрока:

```js
const invalidPlayer = {
  ...match.players[0],
  kills: -1,
};
```

Убедитесь, что валидация находит ошибку.

## 13. Шаг 10. Эксперименты

После работающей версии:

1. Поставьте одному игроку `deaths: 0`.
2. Удалите `hero`.
3. Добавьте одиннадцатого игрока.
4. Измените победителя.
5. Сделайте пустой массив игроков.
6. Передайте `null` вместо матча.

Для каждого случая сначала предскажите результат.

## 14. Архитектурный смысл лабораторной

Вы уже создали миниатюрный вариант будущего pipeline:

```text
raw object
→ validation
→ normalization/enrichment
→ aggregation
→ presentation
```

Позже:

- raw object придёт по HTTP;
- validation будет выполняться схемой;
- результат сохранится в PostgreSQL;
- aggregation станет SQL/materialized view;
- presentation станет REST response и React Native экраном.

Логика остаётся похожей, меняется масштаб и инструменты.

## Definition of Done

- Исходный объект матча не изменяется.
- Невалидный игрок даёт понятное сообщение.
- Отчёт содержит победителя и длительность.
- Командные суммы корректны.
- Лучший игрок находится автоматически.
- Ноль смертей не создаёт `Infinity`.
- Есть минимум четыре автоматические проверки.
- Вы можете объяснить путь данных по функциям.

После собственной попытки сравните результат с [эталонным решением](08-reference-solution.md).

