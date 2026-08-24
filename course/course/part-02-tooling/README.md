# Часть 2. Инструменты разработчика и настоящий Node.js-проект

## Цель

Перенести анализатор матча из браузерного snippet в обычную папку проекта и научиться управлять им через терминал.

К концу части вы сможете:

- понимать абсолютные и относительные пути;
- перемещаться по папкам через PowerShell;
- создавать проект;
- запускать `.js`-файл через Node.js;
- понимать `package.json`;
- разделять код на ES-модули;
- запускать scripts;
- отличать dependency от devDependency;
- форматировать и проверять код;
- читать Node.js stack trace;
- запускать автоматические тесты;
- пользоваться эталонным многофайловым CLI-проектом.

## Главы

1. [Файлы, папки, расширения и пути](01-files-folders-paths.md)
2. [PowerShell и командная строка](02-powershell-terminal.md)
3. [Установка редактора, Node.js и Git](03-install-tools.md)
4. [Node.js, проект и package.json](04-node-project-package-json.md)
5. [Модули import/export](05-modules.md)
6. [npm, pnpm, зависимости и scripts](06-package-managers-dependencies-scripts.md)
7. [Форматирование и статическая проверка](07-formatting-and-linting.md)
8. [Отладка Node.js в терминале и VS Code](08-debugging-node.md)
9. [Первые автоматические тесты](09-node-tests.md)
10. [Лабораторная: многофайловый CLI-анализатор](10-cli-project-lab.md)
11. [Разбор эталонного проекта](11-reference-project.md)

## Эталонный проект

[examples/dota-match-cli](examples/dota-match-cli) — рабочий проект без внешних runtime-зависимостей. Он использует встроенный test runner Node.js.

## Результат части

```text
package.json
src/
  data/
  domain/
  presentation/
  index.js
test/
```

Команды:

```powershell
npm start
npm test
```

## Важное правило

Команда всегда выполняется в текущей рабочей папке. Прежде чем вводить команду, проверьте `Get-Location` и убедитесь, что понимаете, какие файлы она затронет.

## Следующая часть

[Часть 3. Углублённый JavaScript и асинхронность](../part-03-advanced-javascript/README.md) заменит встроенный объект историей матчей из JSON-файла и добавит `Map`, `Set`, Promise и `async/await`.
