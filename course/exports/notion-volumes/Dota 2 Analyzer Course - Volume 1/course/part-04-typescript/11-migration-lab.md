# 11. Лабораторная: миграция анализатора на TypeScript

## Результат

Вы перенесёте проект части 3 на TypeScript без `any`, сохранив поведение CLI и тесты.

Сначала работайте самостоятельно. Эталон открывайте после собственной попытки или при конкретной ошибке, которую вы уже исследовали.

## 1. Создайте новую директорию

Не переименовывайте рабочий JavaScript-проект на месте. Создайте соседний `dota-history-cli-ts`, чтобы сравнивать версии и возвращаться к рабочему состоянию.

Структура:

```text
dota-history-cli-ts/
├── data/
│   └── matches.json
├── src/
│   ├── domain/
│   │   ├── history-analytics.ts
│   │   ├── models.ts
│   │   └── parse-match-history.ts
│   ├── io/
│   │   └── read-json.ts
│   ├── presentation/
│   │   └── print-history-report.ts
│   └── index.ts
├── test/
│   ├── history-analytics.test.ts
│   ├── parse-match-history.test.ts
│   └── read-json.test.ts
├── .gitignore
├── package.json
└── tsconfig.json
```

## 2. Настройте package

Добавьте:

```json
{
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsc",
    "start": "pnpm run build && node dist/src/index.js",
    "test": "pnpm run build && node --test dist/test/*.test.js"
  }
}
```

Установите TypeScript и Node declarations как dev dependencies через pnpm. Добавьте `"packageManager": "pnpm@11.7.0"` и храните `pnpm-lock.yaml`.

## 3. Включите строгую конфигурацию

Минимум:

- `strict`;
- `noUncheckedIndexedAccess`;
- `exactOptionalPropertyTypes`;
- `verbatimModuleSyntax`;
- `NodeNext` modules;
- отдельный `dist`.

Сразу выполните:

```powershell
pnpm run typecheck
```

Пустой проект должен проверяться до добавления логики.

## 4. Опишите domain-модели

Создайте:

- `TeamSide`;
- `Team`;
- `Hero`;
- `Player`;
- `Match`;
- `HeroStats`;
- `MatchSummary`;
- `HistoryReport`.

Правила:

- domain-поля readonly;
- side — literal union;
- статус завершённого матча — literal `"finished"`;
- коллекции, которые аналитика не меняет, — readonly arrays;
- у публичных моделей нет `any`.

## 5. Сделайте I/O безопасным

```ts
parseJson(text: string, source?: string): unknown
readJsonFile(path: string): Promise<unknown>
```

Не пишите `Promise<Match[]>`: чтение и parsing синтаксиса ещё не доказывают domain-форму.

## 6. Напишите parser

Создавайте parser снизу вверх:

1. `isRecord`;
2. `assertNonEmptyString`;
3. `assertNonNegativeNumber`;
4. `parseTeamSide` или assertion;
5. `parsePlayer`;
6. `parseMatch`;
7. `parseMatchHistory`.

`parseMatch` должен превратить строки команд и героя из transport JSON во вложенные `Team` и `Hero`.

Проверьте runtime-invariants:

- history не пустая;
- status — `finished`;
- duration положительна;
- игроков 10;
- стороны 5 на 5;
- account ID уникальны внутри матча;
- показатели конечны и неотрицательны.

## 7. Перенесите analytics

Добавляйте type annotations к boundary-функциям:

```ts
buildHeroStats(matches: readonly Match[]): HeroStats[]
analyzeMatchHistory(matches: readonly Match[]): HistoryReport
```

Типизируйте `Map<string, HeroAccumulator>`.

Не используйте:

- `any`;
- `as HeroStats`;
- `heroStats[0]!`;
- изменение входного `matches`.

## 8. Перенесите presentation

```ts
buildHistoryReportLines(report: HistoryReport): string[]
printHistoryReport(report: HistoryReport): void
```

Сохраните отдельную pure-функцию строк: её легко тестировать без перехвата console.

## 9. Соедините в `main`

```text
string path
→ Promise<unknown>
→ readonly Match[]
→ HistoryReport
→ void
```

Обрабатывайте catch как `unknown`.

Помните, что `import.meta.url` во время запуска относится к скомпилированному `dist/src/index.js`, а не к исходному `src/index.ts`. Если JSON остаётся в корневой `data`, от `dist/src/index.js` путь к нему равен `../../data/matches.json`. Альтернативный production-подход — отдельным build step копировать assets в `dist/data`.

## 10. Перенесите тесты

Тесты тоже пишутся на TypeScript и компилируются в `dist/test`.

Минимально проверьте:

- корректный JSON возвращает unknown-значение;
- повреждённый JSON даёт контекст;
- parser создаёт вложенные Hero и Team;
- 9 игроков отклоняются;
- отрицательные kills отклоняются;
- повтор account ID отклоняется;
- агрегаты совпадают;
- input не меняется;
- CLI error path возвращает exit code 1 вручную.

## 11. Цикл работы

После каждого небольшого изменения:

```powershell
pnpm run typecheck
pnpm test
```

Исправляйте первую содержательную ошибку compiler, затем запускайте снова. Одна причина часто создаёт несколько последующих сообщений.

## 12. Запрещённые «исправления»

Не закрывайте диагностику так:

```ts
const matches = raw as any;
const first = matches[0]!;
// @ts-ignore
```

Разрешённый путь:

```ts
const matches = parseMatchHistory(raw);
const first = matches[0];

if (first === undefined) {
  throw new Error("История пуста");
}
```

## Definition of Done

- `pnpm run typecheck` проходит;
- `pnpm run build` создаёт `dist`;
- `pnpm test` проходит;
- `pnpm start` печатает отчёт;
- source imports корректны для NodeNext;
- raw JSON имеет тип `unknown`;
- parser выполняет runtime validation;
- domain получает только `Match[]`;
- нет `any`, `@ts-ignore` и необоснованных assertions;
- error path выставляет exit code 1;
- вы можете объяснить каждую annotation и каждый этап narrowing.

После выполнения сравните проект с [эталоном](examples/dota-history-cli-ts).
