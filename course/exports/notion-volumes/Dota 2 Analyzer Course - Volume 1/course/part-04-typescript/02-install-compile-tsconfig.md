# 2. Установка, компиляция и `tsconfig.json`

## 1. TypeScript устанавливается в проект

В этой части мы переходим на pnpm — package manager, выбранный для будущего monorepository. Если команда `pnpm --version` не работает, вернитесь к главе о package managers из части 2 и установите pnpm. В директории проекта:

```powershell
pnpm add --save-dev typescript@7.0.2 @types/node@^24.0.0
```

Почему local dev dependency:

- вся команда использует согласованную версию;
- CI получает тот же compiler;
- TypeScript нужен для разработки и сборки, но не для выполнения готового JavaScript;
- команда хранится в `package.json` и lockfile.

Не полагайтесь на случайно установленный глобальный `tsc`.

## 2. Исходник и результат

Создадим `src/hello.ts`:

```ts
const projectName: string = "Dota 2 Analyzer";

console.log(projectName);
```

Компиляция:

```powershell
npx tsc src/hello.ts
```

Рядом появится `hello.js`. В настоящем проекте параметры хранятся в `tsconfig.json`, а результат направляется в `dist`.

## 3. Проверка без создания JavaScript

```powershell
npx tsc --noEmit
```

Compiler проверяет проект, но не записывает output. Это удобно для editor task и CI.

Наш package script:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsc"
  }
}
```

Команды:

```powershell
pnpm run typecheck
pnpm run build
```

## 4. Базовый `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": ".",
    "outDir": "dist",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "types": ["node"],
    "sourceMap": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

## 5. Разбор параметров

### `target`

Версия JavaScript, которую compiler создаёт. `ES2023` подходит нашей учебной версии Node.js.

### `module` и `moduleResolution`

`NodeNext` моделирует современные правила ES modules в Node.js. TypeScript учитывает ближайший `package.json` и его `"type": "module"`.

### `rootDir`

Общий корень исходников. У нас компилируются и `src`, и `test`, поэтому корень — текущая директория.

### `outDir`

Скомпилированные файлы попадают в `dist`, а не смешиваются с исходниками.

### `strict`

Включает семейство строгих проверок. Для нового проекта его включают сразу. Исправлять сотни накопившихся нестрогих мест позднее намного труднее.

### `noUncheckedIndexedAccess`

Напоминает, что элемент по индексу может отсутствовать:

```ts
const firstPlayer = players[0];
// Player | undefined
```

### `exactOptionalPropertyTypes`

Различает отсутствующее свойство и свойство со значением `undefined`, если тип явно не допускает `undefined`.

### `verbatimModuleSyntax`

Заставляет точнее различать обычный import и import только типа:

```ts
import type { Match } from "./models.js";
```

### `types`

Подключает declarations для Node.js: `process`, `node:fs/promises`, `node:path` и другие API.

### `sourceMap`

Создаёт `.js.map`, чтобы stack trace и debugger могли указывать на TypeScript-строки.

## 6. Почему import заканчивается `.js`

В TypeScript-файле:

```ts
import { analyzeMatch } from "./analyze-match.js";
```

Хотя исходник называется `analyze-match.ts`, после compilation Node.js будет загружать `analyze-match.js`. В режиме `NodeNext` TypeScript сопоставляет `.js` specifier с `.ts` source.

Это сначала непривычно, но соответствует реальному runtime-файлу.

## 7. `@types/node` не является Node.js

Пакет `@types/node` содержит type declarations — описания API. Он не реализует `readFile` и не запускает процесс.

```text
Node.js → runtime implementation
@types/node → compile-time descriptions
```

Версии declarations выбирают близко к major-версии Node.js проекта.

## 8. Что хранить в Git

Храним:

- `.ts`;
- `package.json`;
- `pnpm-lock.yaml`;
- `tsconfig.json`;
- тесты;
- данные fixture.

Обычно не храним:

- `node_modules`;
- `dist` для обычного backend-проекта;
- временные логи.

`.gitignore`:

```text
node_modules/
dist/
*.log
```

Не выполняйте попеременно `npm install` и `pnpm install`: проект должен иметь один выбранный package manager и один lockfile.

## 9. Как читать ошибку compiler

Пример:

```text
src/index.ts(12,7): error TS2322:
Type 'string' is not assignable to type 'number'.
```

Читайте по частям:

1. файл `src/index.ts`;
2. строка 12;
3. столбец 7;
4. код диагностики `TS2322`;
5. фактический тип `string`;
6. ожидаемый тип `number`.

Не исправляйте ошибку автоматически через `as`. Сначала найдите, почему значение имеет неправильную форму.

## Упражнения

1. Создайте минимальный TS-проект.
2. Добавьте `strict: true`.
3. Скомпилируйте `.ts` в `dist`.
4. Запустите получившийся `.js` через Node.js.
5. Добавьте неправильное присваивание и выполните `typecheck`.
6. Посмотрите, как изменится тип `players[0]` при включении `noUncheckedIndexedAccess`.

## Критерий готовности

Вы понимаете разницу между `typecheck`, `build` и запуском скомпилированного JavaScript.
