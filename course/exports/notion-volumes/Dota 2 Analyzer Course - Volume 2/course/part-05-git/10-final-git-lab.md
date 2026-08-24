# 10. Итоговая лабораторная: feature от branch до merge

## Цель

Добавить в TypeScript CLI option:

```text
--top=N
```

которая задаёт количество героев в таблице отчёта.

Примеры:

```powershell
node dist/src/index.js --top=3
node dist/src/index.js data/matches.json --top=10
```

При отсутствии option сохраняется прежнее поведение: top-5.

Лабораторная проверяет не только TypeScript, но и полный Git workflow:

```text
clean main
→ feature branch
→ parser + tests commit
→ presentation + tests commit
→ integration + docs commit
→ self-review
→ PR или local merge
→ final verification
```

## 1. Acceptance criteria

Feature готова, если:

- `--top=3` выводит три строки героев;
- default выводит пять;
- разрешены integers от 1 до 20;
- `0`, `21`, `abc`, пустое значение и дробь отклоняются;
- повторный `--top` отклоняется;
- неизвестная option отклоняется;
- можно передать один JSON path;
- порядок JSON path и `--top=N` не важен;
- ошибка даёт exit code 1 через существующий top-level handler;
- typecheck и tests проходят;
- feature состоит из нескольких понятных commits;
- diff не содержит generated files или secrets.

## 2. Подготовка repository

Работайте в `practice/dota-history-git`.

```powershell
Get-Location
git rev-parse --show-toplevel
git switch main
git status
```

Working tree должна быть clean. Если есть changes, не прячьте их случайным commit. Определите, к какой задаче они относятся.

Если настроен remote:

```powershell
git fetch origin
git status
git log --graph --decorate --oneline --all -15
git pull --ff-only
```

Запустите baseline:

```powershell
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
```

Если baseline уже красный, не начинайте feature, пока не зафиксирована причина. Иначе вы не узнаете, вызвала ли failure новая работа.

## 3. Создание branch

```powershell
git switch -c feature/configurable-top-heroes
git branch --show-current
```

Ожидаемо:

```text
feature/configurable-top-heroes
```

## 4. Первый vertical step: CLI parser

Создайте directory `src/cli` и файл `src/cli/parse-arguments.ts`:

```ts
export interface CliOptions {
  readonly inputPath: string | undefined;
  readonly topHeroes: number;
}

const DEFAULT_TOP_HEROES = 5;
const MAX_TOP_HEROES = 20;
const TOP_PREFIX = "--top=";

function parseTopHeroes(argument: string): number {
  const valueText = argument.slice(TOP_PREFIX.length);
  const value = Number(valueText);

  if (
    valueText === "" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_TOP_HEROES
  ) {
    throw new TypeError(
      `--top должен быть целым числом от 1 до ${MAX_TOP_HEROES}`,
    );
  }

  return value;
}

export function parseCliArguments(
  argumentsList: readonly string[],
): CliOptions {
  let inputPath: string | undefined;
  let topHeroes = DEFAULT_TOP_HEROES;
  let topWasProvided = false;

  for (const argument of argumentsList) {
    if (argument.startsWith(TOP_PREFIX)) {
      if (topWasProvided) {
        throw new TypeError("Option --top нельзя передавать повторно");
      }

      topHeroes = parseTopHeroes(argument);
      topWasProvided = true;
      continue;
    }

    if (argument.startsWith("--")) {
      throw new TypeError(`Неизвестная option: ${argument}`);
    }

    if (inputPath !== undefined) {
      throw new TypeError("Можно передать только один путь к JSON-файлу");
    }

    inputPath = argument;
  }

  return {
    inputPath,
    topHeroes,
  };
}
```

### Разбор design

- parser принимает готовый `readonly string[]`, поэтому не зависит напрямую от global `process.argv`;
- `inputPath` имеет явный тип `string | undefined`;
- default установлен в одном месте;
- range limit защищает output от бессмысленного размера;
- неизвестные options не игнорируются молча;
- повтор option считается пользовательской ошибкой;
- функция pure и легко тестируется.

## 5. Tests CLI parser

Создайте `test/parse-arguments.test.ts`:

```ts
import { deepEqual, throws } from "node:assert/strict";
import { test } from "node:test";
import { parseCliArguments } from "../src/cli/parse-arguments.js";

test("использует default top-5 без аргументов", () => {
  deepEqual(parseCliArguments([]), {
    inputPath: undefined,
    topHeroes: 5,
  });
});

test("принимает top и JSON path в любом порядке", () => {
  deepEqual(
    parseCliArguments(["--top=3", "data/matches.json"]),
    {
      inputPath: "data/matches.json",
      topHeroes: 3,
    },
  );

  deepEqual(
    parseCliArguments(["data/matches.json", "--top=3"]),
    {
      inputPath: "data/matches.json",
      topHeroes: 3,
    },
  );
});

test("отклоняет top вне диапазона и нецелые значения", () => {
  for (const argument of [
    "--top=",
    "--top=0",
    "--top=21",
    "--top=2.5",
    "--top=abc",
  ]) {
    throws(
      () => parseCliArguments([argument]),
      /--top должен быть целым числом от 1 до 20/,
    );
  }
});

test("отклоняет повторный top", () => {
  throws(
    () => parseCliArguments(["--top=3", "--top=4"]),
    /Option --top нельзя передавать повторно/,
  );
});

test("отклоняет неизвестную option", () => {
  throws(
    () => parseCliArguments(["--unknown=value"]),
    /Неизвестная option/,
  );
});

test("отклоняет второй JSON path", () => {
  throws(
    () => parseCliArguments(["first.json", "second.json"]),
    /Можно передать только один путь/,
  );
});
```

## 6. Проверка первого step

```powershell
pnpm run typecheck
pnpm test
git status --short
git diff -- src/cli/parse-arguments.ts test/parse-arguments.test.ts
git diff --check
```

Stage только parser и его test:

```powershell
git add src/cli/parse-arguments.ts test/parse-arguments.test.ts
git diff --staged --stat
git diff --staged
git commit -m "Parse configurable top heroes option"
```

После commit:

```powershell
git show --stat HEAD
git status --short
```

## 7. Второй step: presentation limit

Откройте `src/presentation/print-history-report.ts`.

Добавьте helper после import:

```ts
function assertTopHeroesLimit(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    throw new TypeError(
      "Количество героев должно быть целым числом от 1 до 20",
    );
  }
}
```

Измените signature:

```ts
export function buildHistoryReportLines(
  report: HistoryReport,
  topHeroesLimit = 5,
): string[] {
  assertTopHeroesLimit(topHeroesLimit);

  const topHeroes = report.heroStats.slice(0, topHeroesLimit);
```

Замените static title:

```ts
`Топ-${topHeroesLimit} героев по числу игр`,
```

Измените printer:

```ts
export function printHistoryReport(
  report: HistoryReport,
  topHeroesLimit = 5,
): void {
  for (const line of buildHistoryReportLines(report, topHeroesLimit)) {
    console.log(line);
  }
}
```

### Почему validation повторяется

CLI parser проверяет user input, но `buildHistoryReportLines` — exported function. Её может вызвать test, HTTP layer или будущий module напрямую. Она защищает собственный public contract.

Позднее range можно вынести в общий value object. Сейчас простое повторение яснее лишней abstraction.

## 8. Presentation test

Создайте `test/print-history-report.test.ts`:

```ts
import { equal, ok } from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { analyzeMatchHistory } from "../src/domain/history-analytics.js";
import { parseMatchHistory } from "../src/domain/parse-match-history.js";
import { readJsonFile } from "../src/io/read-json.js";
import { buildHistoryReportLines } from "../src/presentation/print-history-report.js";

const dataPath = fileURLToPath(
  new URL("../../data/matches.json", import.meta.url),
);
const rawData = await readJsonFile(dataPath);
const report = analyzeMatchHistory(parseMatchHistory(rawData));

test("строит таблицу с выбранным количеством героев", () => {
  const lines = buildHistoryReportLines(report, 3);
  const titleIndex = lines.indexOf("Топ-3 героев по числу игр");
  const matchesIndex = lines.indexOf("Матчи");

  ok(titleIndex >= 0);
  ok(matchesIndex > titleIndex);

  const heroRows = lines.slice(titleIndex + 2, matchesIndex - 1);

  equal(heroRows.length, 3);
});
```

Разбор slice:

- `titleIndex + 1` — header columns;
- строки героев начинаются с `+2`;
- перед `Матчи` находится пустая строка, поэтому end — `matchesIndex - 1`;
- `slice` не включает end index.

Если output structure изменится осознанно, test тоже нужно пересмотреть.

## 9. Commit presentation step

```powershell
pnpm run typecheck
pnpm test
git diff --check
git diff -- src/presentation/print-history-report.ts test/print-history-report.test.ts
git add src/presentation/print-history-report.ts test/print-history-report.test.ts
git diff --staged
git commit -m "Limit hero rows in history report"
```

Не stage `dist` — он ignored и воспроизводим.

## 10. Третий step: integration в `index.ts`

Добавьте import:

```ts
import { parseCliArguments } from "./cli/parse-arguments.js";
```

Измените `main`:

```ts
async function main(): Promise<void> {
  const options = parseCliArguments(process.argv.slice(2));
  const inputPath = selectInputPath(options.inputPath);
  const rawData = await readJsonFile(inputPath);
  const matches = parseMatchHistory(rawData);
  const report = analyzeMatchHistory(matches);

  printHistoryReport(report, options.topHeroes);
}
```

Старую строку:

```ts
const inputPath = selectInputPath(process.argv[2]);
```

нужно удалить, а не оставить рядом.

`process.argv.slice(2)` передаёт parser только user arguments, без path Node.js и entry point.

## 11. Documentation

Добавьте в project README:

````markdown
## Количество героев

По умолчанию отчёт показывает пять героев:

```powershell
pnpm start
```

Выбрать от 1 до 20 строк:

```powershell
node dist/src/index.js --top=3
node dist/src/index.js data/matches.json --top=10
```
````

Внешний fence из четырёх backticks позволяет показать внутренние тройные fences как часть примера README.

## 12. Manual verification

```powershell
pnpm run typecheck
pnpm test
pnpm run build
node dist/src/index.js
node dist/src/index.js --top=3
node dist/src/index.js data/matches.json --top=10
node dist/src/index.js --top=0
```

После invalid command:

```powershell
$LASTEXITCODE
```

Ожидаемо `1`.

Также проверьте:

```powershell
node dist/src/index.js --top=3 --top=4
node dist/src/index.js --unknown=value
node dist/src/index.js first.json second.json
```

Errors должны быть понятными и не печатать успешный report.

## 13. Третий commit

```powershell
git status --short
git diff -- src/index.ts README.md
git add src/index.ts README.md
git diff --staged
git commit -m "Connect top heroes option to CLI report"
```

Если README change большая и самостоятельная, допустим четвёртый docs commit. Выберите границу и объясните её.

## 14. Проверка feature history

```powershell
git log --graph --decorate --oneline --all
git log --oneline main..HEAD
git diff --stat main...HEAD
git diff main...HEAD
```

Ожидаемые intentions:

```text
Parse configurable top heroes option
Limit hero rows in history report
Connect top heroes option to CLI report
```

Проверьте каждый:

```powershell
git show --stat <commit-id>
git show <commit-id>
```

## 15. Self-review checklist

- default остаётся 5;
- range совпадает в parser и presentation;
- unknown options не игнорируются;
- второй path отклоняется;
- input path может идти до или после option;
- нет `any`, `@ts-ignore` и non-null assertion;
- tests проверяют boundaries;
- error проходит к существующему catch;
- README commands соответствуют build layout;
- `pnpm-lock.yaml` не изменился без причины;
- `dist` и `node_modules` отсутствуют в diff;
- commits не содержат secrets.

Поиск опасных shortcuts:

```powershell
rg -n "\bany\b|@ts-ignore|@ts-nocheck" src test
```

## 16. Track A: local merge

Если remote не используется:

```powershell
git switch main
git status
git merge --no-ff feature/configurable-top-heroes
pnpm run typecheck
pnpm test
git log --graph --decorate --oneline --all
```

Почему `--no-ff` здесь допустим: лаборатория специально сохраняет видимую границу feature. В настоящем project следуйте policy.

После проверки:

```powershell
git branch -d feature/configurable-top-heroes
```

## 17. Track B: GitHub pull request

Если origin настроен и repository ваш:

```powershell
git push -u origin feature/configurable-top-heroes
```

Откройте PR:

- base: `main`;
- compare: `feature/configurable-top-heroes`;
- title: `Allow CLI users to configure displayed hero count`;
- description: Why, Changes, Verification, Risks.

Перед merge:

- Files changed прочитан;
- CI green;
- review conversations resolved;
- выбранная strategy понятна;
- branch не содержит main-unrelated changes.

После GitHub merge:

```powershell
git switch main
git pull --ff-only
pnpm run typecheck
pnpm test
git branch -d feature/configurable-top-heroes
git fetch --prune origin
```

Удаление remote branch выполняйте только после подтверждённого merge.

## 18. Если main изменилась во время работы

```powershell
git fetch origin
git log --graph --decorate --oneline --all -20
git diff --stat origin/main...HEAD
```

Не force push. Выберите integration method согласно policy:

- merge актуальной main в feature;
- rebase feature на main, если команда допускает rewrite feature commits;
- разрешение conflicts и полный повтор tests.

В рамках beginner workflow используйте merge:

```powershell
git merge origin/main
```

находясь в feature branch. До команды working tree должна быть clean.

## 19. Финальная проверка main

```powershell
git switch main
git status
git log --graph --decorate --oneline --all -20
pnpm run typecheck
pnpm test
pnpm run build
node dist/src/index.js --top=3
```

`main` должна содержать feature, working tree — быть понятной и без unintended files.

## 20. Разбор возможных failures

### Compiler не находит module

Проверьте:

- path файла `src/cli/parse-arguments.ts`;
- import заканчивается `.js` для NodeNext;
- casing совпадает;
- файл включён `src/**/*.ts`.

### Test path к JSON не работает после compilation

Test выполняется из `dist/test`. Путь `../../data/matches.json` возвращается к project root. `tsc` сам не копирует JSON.

### `--top=0` проходит

Проверьте условие `value < 1` и что `parseCliArguments` действительно вызывается в `main`.

### Всегда выводится пять

Проверьте передачу:

```ts
printHistoryReport(report, options.topHeroes);
```

и dynamic `slice(0, topHeroesLimit)`.

### Git показывает огромный diff

Проверьте current branch, root repository, generated files и line endings. Не stage весь diff до объяснения причины.

## 21. Финальные контрольные вопросы

1. Почему parser не читает `process.argv` напрямую?
2. Где выполняется runtime validation range?
3. Почему presentation повторно защищает contract?
4. Почему feature разделена на три commits?
5. Какая команда показывает именно PR diff?
6. Что проверить до push?
7. Чем local merge track отличается от PR track?
8. Почему после merge снова запускаются tests?
9. Что делать, если remote main изменилась?
10. Какие files нельзя увидеть в feature diff?

## Definition of Done части 5

- option `--top=N` работает от 1 до 20;
- default top-5 сохранён;
- invalid arguments дают exit code 1;
- typecheck и все tests проходят;
- feature создана от clean main;
- history состоит из понятных commits;
- staged diff проверен перед каждым commit;
- full feature diff прошёл self-review;
- local merge или GitHub PR завершён осознанно;
- main проверена после integration;
- feature branch удалена только после merge;
- force push, hard reset и clean не использовались;
- secrets и generated files не попали в history.

После этой лабораторной вы готовы вести все следующие части курса через branches, reviewable diffs и воспроизводимую Git history.
