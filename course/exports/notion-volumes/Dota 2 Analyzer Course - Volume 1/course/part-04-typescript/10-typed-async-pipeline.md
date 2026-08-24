# 10. Типизированный асинхронный JSON pipeline

## 1. Полная цепочка типов

```text
filePath: string
→ readFile: Promise<string>
→ parseJson: unknown
→ parseMatchHistory: readonly Match[]
→ analyzeMatchHistory: HistoryReport
→ buildHistoryReportLines: string[]
```

Каждая стрелка — контракт функции.

## 2. I/O возвращает `unknown`

```ts
export function parseJson(
  text: string,
  source = "JSON",
): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      `Не удалось разобрать JSON: ${source}`,
      { cause: error },
    );
  }
}
```

`JSON.parse` в стандартных declarations исторически возвращает permissive значение, но публичная функция намеренно объявляет `unknown`. Так опасность не вытекает из I/O-слоя в domain.

## 3. Асинхронное чтение

```ts
export async function readJsonFile(
  filePath: string,
): Promise<unknown> {
  let text: string;

  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Не удалось прочитать ${filePath}`, {
      cause: error,
    });
  }

  return parseJson(text, filePath);
}
```

Обратите внимание:

- input строго `string`;
- Promise успешного результата содержит `unknown`;
- parsing выполняется вне catch чтения;
- ошибка parsing не получает неправильную подпись файловой ошибки.

## 4. Граница доверия

```ts
const rawData = await readJsonFile(inputPath);
const matches = parseMatchHistory(rawData);
```

До второй строки rawData нельзя анализировать. После успешного parser `matches` имеет type `readonly Match[]`.

## 5. Чистая аналитика

```ts
export function analyzeMatchHistory(
  matches: readonly Match[],
): HistoryReport {
  // только расчёты
}
```

TypeScript не позволяет случайно передать rawData напрямую:

```ts
analyzeMatchHistory(rawData);
// unknown не соответствует readonly Match[]
```

Это ключевое преимущество границы `unknown → parser → model`.

## 6. Типизируем accumulator

```ts
interface HeroAccumulator {
  readonly hero: string;
  readonly games: number;
  readonly wins: number;
  readonly kills: number;
  readonly assists: number;
}

const statsByHero = new Map<string, HeroAccumulator>();
```

Compiler знает тип ключа и значения:

```ts
const current = statsByHero.get(heroName);
// HeroAccumulator | undefined
```

Нужно обработать отсутствие через `??` или `if`.

## 7. Тип результата

```ts
interface HistoryReport {
  readonly totalMatches: number;
  readonly radiantWins: number;
  readonly direWins: number;
  readonly mostPickedHero: HeroStats;
  readonly heroStats: readonly HeroStats[];
}
```

Если функция забудет поле или вернёт неправильную форму, ошибка возникает при compilation.

## 8. Первый элемент при strict index access

```ts
const mostPickedHero = heroStats[0];

if (mostPickedHero === undefined) {
  throw new Error("Нельзя определить популярного героя");
}
```

Хотя business logic гарантирует игроков в непустой истории, compiler не выводит этот факт из runtime parser. Мы явно переносим invariant в функцию.

## 9. Presentation получает готовый report

```ts
export function buildHistoryReportLines(
  report: HistoryReport,
): string[] {
  return [
    `Матчей: ${report.totalMatches}`,
    `Побед Dire: ${report.direWins}`,
  ];
}
```

Printer не видит `unknown`, не читает файл и не повторяет validation.

## 10. Composition root

```ts
async function main(): Promise<void> {
  const inputPath = selectInputPath(process.argv[2]);
  const rawData = await readJsonFile(inputPath);
  const matches = parseMatchHistory(rawData);
  const report = analyzeMatchHistory(matches);

  printHistoryReport(report);
}
```

Типы последовательно меняются, и ни один unsafe этап нельзя незаметно перескочить.

## 11. Ошибка верхнего уровня

```ts
try {
  await main();
} catch (error: unknown) {
  printUnknownError(error);
  process.exitCode = 1;
}
```

В annotation `: unknown` можно быть явным, хотя strict configuration уже рассматривает catch variable безопасно.

## 12. Как pipeline изменится при HTTP

```text
сейчас: readFile → unknown
позже: fetch + response.json → unknown
```

Parser, domain models, analytics и presentation остаются. Именно это делает архитектурное разделение практичным.

## Упражнения

1. Подпишите тип каждого промежуточного значения pipeline.
2. Попробуйте передать `unknown` сразу в analytics.
3. Типизируйте Map accumulator.
4. Обработайте пустой `heroStats` без `!`.
5. Перенесите console из analytics в presentation.

## Критерий готовности

В вашем pipeline существует ровно одна понятная граница, после которой внешним данным можно доверять как domain-модели.

