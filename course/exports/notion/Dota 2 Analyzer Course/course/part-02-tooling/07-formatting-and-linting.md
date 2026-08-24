# Глава 7. Форматирование и статическая проверка

## 1. Три разных проверки

### Formatter

Меняет внешний вид кода:

- отступы;
- переносы строк;
- пробелы;
- кавычки;
- размещение скобок.

Инструмент: Prettier.

### Linter

Ищет подозрительные конструкции и нарушения правил:

- неиспользуемые переменные;
- неизвестные имена;
- недостижимый код;
- потенциальные ошибки.

Инструмент: ESLint.

### Tests

Проверяют поведение программы:

- правильная ли формула KDA;
- отклоняется ли отрицательное значение;
- правильно ли создаётся отчёт.

Formatter не проверяет формулу. Linter не доказывает правильность бизнес-логики. Tests не обеспечивают единый стиль. Нужны все три слоя.

## 2. Установка Prettier

Официальная рекомендация — локальная точная версия. На 16 июля 2026 официальный пример использует:

```powershell
npm install --save-dev --save-exact prettier@3.9.5
```

Если вы проходите курс значительно позже, откройте [официальную инструкцию Prettier](https://prettier.io/docs/install.html) и используйте указанную там поддерживаемую версию.

## 3. Настройка Prettier

Создайте `.prettierrc` в корне:

```json
{}
```

Пустая конфигурация означает стандартные правила и одновременно сообщает editor, что проект использует Prettier.

`.prettierignore`:

```text
node_modules
coverage
dist
```

## 4. Scripts Prettier

```json
"format": "prettier . --write",
"format:check": "prettier . --check"
```

Применить форматирование:

```powershell
npm run format
```

Только проверить:

```powershell
npm run format:check
```

`--write` изменяет файлы. `--check` ничего не исправляет и удобен для CI.

Перед первым форматированием большого существующего проекта изучите diff, чтобы не смешать механическую переформатировку с логическим изменением.

## 5. Настройка VS Code

Создайте `.vscode\settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true
}
```

Настройка хранится в проекте. При сохранении файла editor вызывает локально установленный Prettier через extension.

Если автоформатирование неожиданно меняет файл, выполните `Format Document With...` и проверьте выбранный formatter.

## 6. Установка ESLint

Актуальный ESLint использует flat config в `eslint.config.js`.

```powershell
npm install --save-dev eslint@latest @eslint/js@latest globals@latest
```

Lockfile зафиксирует установленные версии.

## 7. Конфигурация ESLint

`eslint.config.js`:

```js
import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", "coverage/**", "dist/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "error",
    },
  },
];
```

## 8. Что означает конфигурация

- `ignores` исключает сгенерированные и установленные файлы;
- `js.configs.recommended` включает базовые рекомендуемые правила;
- `files` задаёт JavaScript-файлы;
- `sourceType: "module"` включает ES modules;
- `globals.node` сообщает о Node globals, например `process`;
- `no-unused-vars` запрещает забытые переменные.

## 9. Script ESLint

```json
"lint": "eslint ."
```

Запуск:

```powershell
npm run lint
```

Не исправляйте каждое правило отключением. Сначала поймите, какую проблему правило обнаружило.

## 10. Пример ошибки

```js
const kills = 10;
const unusedValue = 5;

console.log(kills);
```

ESLint сообщит, что `unusedValue` объявлена, но не используется. Возможные решения:

- удалить переменную;
- использовать её по назначению;
- переименовать только если проект сознательно допускает специальный convention.

Неправильное решение — глобально выключить правило ради одной случайной строки.

## 11. ESLint и Prettier не конкурируют

В выбранной схеме:

- Prettier отвечает за внешний вид;
- ESLint отвечает за качество и ошибки;
- style rules ESLint не должны спорить с Prettier.

Для большого проекта можно добавить `eslint-config-prettier`, который выключает конфликтующие stylistic rules. В минимальной конфигурации курса мы не добавляем лишние style rules ESLint.

## 12. Общая команда проверки

```json
"check": "npm run lint && npm run test && npm run format:check"
```

```powershell
npm run check
```

Команда должна завершаться успешно перед commit и deployment.

## 13. `.gitignore`

Создайте:

```text
node_modules/
coverage/
dist/
.env
```

Не добавляйте `package-lock.json` в ignore.

## 14. Что не делает formatter

Prettier одинаково красиво оформит неправильную формулу:

```js
return kills + assists / deaths;
```

Поэтому успешное форматирование не означает правильность программы.

## 15. Упражнения

### Упражнение 1

Намеренно испортите отступы и выполните `npm run format`.

### Упражнение 2

Создайте неиспользуемую переменную и выполните `npm run lint`.

### Упражнение 3

Исправьте ошибку без отключения правила.

### Упражнение 4

Объясните различие `format`, `format:check`, `lint` и `test`.

## Definition of Done

- Prettier установлен локально.
- ESLint установлен локально.
- `npm run format:check` работает.
- `npm run lint` работает.
- Вы понимаете, какую задачу решает каждый инструмент.
- Вы не считаете отформатированный код автоматически правильным.

