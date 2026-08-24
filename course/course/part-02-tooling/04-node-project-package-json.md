# Глава 4. Node.js, проект и package.json

## 1. Что делает Node.js

В браузере JavaScript обычно управляет web-страницей и использует browser APIs. Node.js выполняет JavaScript как обычную программу на компьютере или сервере.

Node.js может:

- читать и записывать файлы;
- создавать HTTP-сервер;
- подключаться к PostgreSQL;
- выполнять фоновые jobs;
- запускать тесты;
- обрабатывать данные Dota 2.

React Native тоже использует JavaScript/TypeScript, но работает в mobile runtime. Один язык применяется в разных окружениях с разными доступными APIs.

## 2. Первый проект

Создайте папку:

```powershell
New-Item -ItemType Directory -Path .\dota-match-cli
Set-Location .\dota-match-cli
```

Проверьте:

```powershell
Get-Location
Get-ChildItem -Force
```

## 3. Инициализация npm

```powershell
npm init
```

npm задаст вопросы:

- имя пакета;
- версия;
- описание;
- entry point;
- test command;
- license.

Для быстрого создания со значениями по умолчанию:

```powershell
npm init -y
```

Появится `package.json`.

## 4. Что такое JSON

JSON — текстовый формат данных.

```json
{
  "name": "dota-match-cli",
  "version": "1.0.0",
  "private": true
}
```

Правила JSON:

- ключи в двойных кавычках;
- строки в двойных кавычках;
- между свойствами запятые;
- после последнего свойства запятой обычно нет;
- комментарии не поддерживаются;
- одинарные кавычки не используются.

JSON похож на JavaScript object literal, но это не JavaScript-код.

## 5. Основные поля `package.json`

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

### `name`

Техническое имя пакета. Обычно нижний регистр без пробелов.

### `version`

Версия проекта. Формат `major.minor.patch`, например `1.2.3`.

### `private`

```json
"private": true
```

Защищает внутренний проект от случайной публикации в npm registry.

### `type`

```json
"type": "module"
```

Сообщает Node.js, что `.js`-файлы используют современные ES modules с `import` и `export`.

### `scripts`

Именованные команды проекта:

```json
"scripts": {
  "start": "node src/index.js",
  "test": "node --test"
}
```

Запуск:

```powershell
npm start
npm test
```

## 6. Почему scripts полезны

Вместо запоминания длинной команды вся команда хранится в проекте.

```text
npm test
```

имеет одинаковый смысл для каждого участника и CI.

Позже scripts будут запускать:

- lint;
- typecheck;
- tests;
- development server;
- database migrations;
- production build.

## 7. Создание структуры

```powershell
New-Item -ItemType Directory -Path .\src
New-Item -ItemType Directory -Path .\test
New-Item -ItemType File -Path .\src\index.js
```

В `src\index.js`:

```js
const message = "Dota match analyzer started";
console.log(message);
```

Запустите:

```powershell
npm start
```

## 8. Что происходит при `npm start`

1. npm ищет `package.json` в текущей папке.
2. Находит `scripts.start`.
3. Запускает `node src/index.js`.
4. Node читает и выполняет файл.
5. Процесс выводит сообщение.
6. После завершения кода процесс заканчивается.

Если вы запускаете `npm start` не в корне проекта, npm не найдёт правильный `package.json`.

## 9. Entry point

Entry point — файл, с которого начинается выполнение приложения.

Для нашего CLI:

```text
src/index.js
```

`index.js` не обязан содержать всю логику. Его задача — собрать компоненты и запустить use case:

```js
const report = createMatchReport(match);
printMatchReport(report);
```

Расчёты и валидация находятся в других файлах.

## 10. Process

При выполнении `node src/index.js` операционная система создаёт процесс Node.js.

Процесс имеет:

- память;
- текущую папку;
- environment variables;
- стандартный вывод;
- код завершения.

CLI после вычисления завершается. Backend-сервер позже останется запущенным и будет ожидать HTTP-запросы.

## 11. Exit code

Обычно:

- `0` — успех;
- ненулевой код — ошибка.

В простом CLI:

```js
try {
  const report = createMatchReport(match);
  printMatchReport(report);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
```

`process.exitCode = 1` сообщает терминалу и CI, что выполнение неуспешно, но позволяет Node корректно завершить текущие операции.

## 12. `package-lock.json`

После установки пакетов npm создаёт `package-lock.json`. Он фиксирует точные версии всего дерева зависимостей.

Этот файл:

- сохраняется в Git;
- не редактируется вручную;
- помогает повторить установку;
- обновляется package manager.

## 13. `node_modules`

Папка `node_modules` содержит установленные пакеты.

Она:

- может быть большой;
- создаётся через install;
- не должна вручную редактироваться;
- обычно не сохраняется в Git;
- восстанавливается по `package.json` и lockfile.

В `.gitignore` позднее появится:

```text
node_modules/
```

## 14. Частые ошибки

### Невалидный JSON

```text
EJSONPARSE
```

Проверьте кавычки, запятые и фигурные скобки `package.json`.

### Script отсутствует

```text
Missing script: "start"
```

Проверьте `scripts.start` и текущую папку.

### Файл отсутствует

```text
Cannot find module ...\src\index.js
```

Проверьте путь и расширение.

## 15. Упражнения

### Упражнение 1

Создайте проект через `npm init -y`, затем самостоятельно добавьте `private`, `type` и scripts.

### Упражнение 2

Добавьте script:

```json
"hello": "node src/index.js"
```

Запустите `npm run hello`.

### Упражнение 3

Намеренно удалите запятую в `package.json`, запустите script, прочитайте ошибку и исправьте JSON.

## Definition of Done

- Вы понимаете назначение Node.js.
- Вы создали `package.json`.
- Вы понимаете поля `private`, `type` и `scripts`.
- Вы запускаете проект через `npm start`.
- Вы знаете, почему команда выполняется из корня проекта.
- Вы понимаете назначение `node_modules` и lockfile.

