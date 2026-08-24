# Глава 6. npm, pnpm, зависимости и scripts

## 1. Что такое package

Package — опубликованный или локальный модуль с кодом и `package.json`.

Примеры будущих packages:

- клиент PostgreSQL;
- framework NestJS;
- runtime validator Zod;
- test runner Vitest;
- formatter Prettier.

Package manager скачивает packages, проверяет их metadata, строит дерево зависимостей и выполняет scripts.

## 2. npm

npm состоит из:

- online registry с пакетами;
- CLI-команды `npm`;
- форматов `package.json` и `package-lock.json`.

Проверка:

```powershell
npm --version
```

## 3. Установить все зависимости проекта

Если repository уже содержит `package.json` и `package-lock.json`:

```powershell
npm install
```

npm читает описания и создаёт `node_modules`.

Для CI и полностью воспроизводимой установки по lockfile:

```powershell
npm ci
```

`npm ci` требует согласованный lockfile, удаляет существующее дерево установки и не изменяет lockfile. На локальном первом этапе используйте `npm install`; в CI позднее — `npm ci`.

## 4. Установить production dependency

Пример:

```powershell
npm install zod
```

В `package.json` появится:

```json
"dependencies": {
  "zod": "^..."
}
```

Production dependency нужна приложению во время обычной работы.

## 5. Установить devDependency

```powershell
npm install --save-dev prettier
```

Сокращённо:

```powershell
npm install -D prettier
```

В `package.json`:

```json
"devDependencies": {
  "prettier": "..."
}
```

Dev dependency нужна для разработки, тестов, сборки или анализа кода, но не является частью runtime-логики приложения.

## 6. Удалить package

```powershell
npm uninstall zod
```

Не удаляйте package только вручную из `node_modules`: package manager восстановит её при следующей установке.

## 7. Семантические версии

Версия:

```text
3.9.5
```

Части:

```text
major.minor.patch
```

- major — несовместимые изменения;
- minor — новая обратно совместимая функциональность;
- patch — обратно совместимое исправление.

Диапазон:

```json
"some-package": "^3.9.5"
```

`^` обычно разрешает совместимые обновления в рамках major. Точное поведение зависит от начальной версии.

Lockfile сохраняет конкретно разрешённые версии, даже если `package.json` содержит диапазон.

## 8. Прямые и транзитивные зависимости

Вы установили package A. Она использует B и C. Тогда:

- A — прямая dependency вашего проекта;
- B и C — транзитивные dependencies.

Ваш проект зависит от всего дерева. Поэтому даже маленькая установка может добавить много packages.

## 9. Безопасность зависимостей

Перед добавлением package спросите:

1. Нужна ли она вообще?
2. Поддерживается ли она?
3. Совместима ли лицензия?
4. Есть ли security advisories?
5. Насколько велика dependency tree?
6. Можно ли решить задачу встроенным API?

Не устанавливайте пакет только потому, что первое случайное руководство использует его.

Команда:

```powershell
npm audit
```

показывает известные проблемы в дереве npm. Не запускайте автоматически агрессивные варианты исправления без чтения изменений: major upgrade может сломать проект.

## 10. Локальная и глобальная установка

Локальная dependency принадлежит проекту и фиксируется в `package.json`.

Глобальная устанавливается для всей пользовательской среды.

Инструменты проекта обычно устанавливайте локально:

- версия воспроизводима;
- CI использует ту же версию;
- разные проекты не конфликтуют;
- команда доступна через scripts.

Не устанавливайте ESLint и Prettier глобально для проекта.

## 11. `npx`

`npx` запускает executable из локальной dependency:

```powershell
npx prettier . --check
```

Если package не установлена локально, `npx` может предложить временно скачать её. Для formatter/linter курса сначала устанавливайте package локально, чтобы запускать фиксированную версию.

## 12. Scripts

```json
"scripts": {
  "start": "node src/index.js",
  "test": "node --test",
  "lint": "eslint .",
  "format": "prettier . --write",
  "format:check": "prettier . --check",
  "check": "npm run lint && npm run test && npm run format:check"
}
```

Запуск обычного script:

```powershell
npm run lint
```

Для специальных scripts `start` и `test` слово `run` можно опустить:

```powershell
npm start
npm test
```

Оператор `&&` здесь означает: следующая команда запускается только после успешной предыдущей. Мы используем его внутри npm script, где поведение управляется npm и зафиксировано в проекте.

## 13. Передача аргумента script

```powershell
npm test -- --test-name-pattern="KDA"
```

Первое `--` отделяет аргументы npm от аргументов запускаемой программы.

## 14. pnpm

pnpm — альтернативный package manager. Он экономно хранит packages и хорошо поддерживает workspaces, поэтому будет выбран для будущего монорепозитория.

На этом этапе проект использует npm, потому что он устанавливается вместе с Node.js и позволяет сосредоточиться на основных понятиях.

Перед созданием монорепозитория pnpm будет установлен по актуальной официальной инструкции. На июль 2026 официальный pnpm рекомендует на Windows установку через npm или Corepack; для pnpm 11 требуется Node.js не ниже 22.

После установки проверяется:

```powershell
pnpm --version
```

## 15. Не смешивайте package managers

В одном проекте должен быть один основной lockfile:

```text
package-lock.json  → npm
pnpm-lock.yaml     → pnpm
```

Не выполняйте попеременно `npm install` и `pnpm install`. Это создаёт разные lockfiles и разные модели `node_modules`.

## 16. Поле `packageManager`

Позже в монорепозитории:

```json
"packageManager": "pnpm@11.x.x"
```

Поле фиксирует ожидаемый package manager и версию. Точную версию добавляет команда настройки pnpm.

## 17. Упражнения

### Упражнение 1

Объясните разницу dependency и devDependency на примере Zod и Prettier.

### Упражнение 2

Добавьте scripts `start`, `test` и `check` без установки внешних packages. Для `check` временно используйте только `npm test`.

### Упражнение 3

Объясните роль `package-lock.json` и почему его сохраняют в Git.

### Упражнение 4

Объясните, почему нельзя использовать одновременно npm и pnpm в одном учебном проекте.

## Definition of Done

- Вы понимаете package и registry.
- Вы отличаете dependency от devDependency.
- Вы понимаете прямые и транзитивные зависимости.
- Вы знаете роль lockfile.
- Вы запускаете scripts.
- Вы не устанавливаете проектные инструменты глобально без причины.
- Вы понимаете, почему monorepo позднее перейдёт на pnpm.

