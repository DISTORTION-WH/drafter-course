# 12. Разбор эталонного TypeScript-проекта

Эталон: [examples/dota-history-cli-ts](examples/dota-history-cli-ts).

## 1. Карта типов и runtime

```text
matches.json
    │ runtime value
    ▼
readJsonFile(): Promise<unknown>
    │
    ▼
parseMatchHistory(unknown): readonly Match[]
    │ доверенная domain boundary
    ▼
analyzeMatchHistory(Match[]): HistoryReport
    │
    ▼
printHistoryReport(HistoryReport): void
```

До parser у нас нет права обращаться к domain-полям. После parser остальные модули не повторяют проверки каждой строки.

## 2. `models.ts`

Здесь нет runtime-логики. Файл хранит язык предметной области:

- допустимые стороны;
- структуру команды и героя;
- игрока и матч;
- строки статистики;
- итоговый отчёт.

Models импортируются через `import type`, потому что interfaces исчезают после compilation.

## 3. `read-json.ts`

I/O-слой намеренно обещает только `unknown`. Это честный контракт: синтаксически корректный JSON ещё не является матчем.

## 4. `parse-match-history.ts`

Самый важный файл части. Он:

- делает narrowing;
- формирует точные сообщения с path;
- проверяет domain-invariants;
- нормализует transport strings в `Hero` и `Team`;
- возвращает новые объекты.

Посмотрите, как после каждой assertion значение становится уже и как parser не использует `as Match`.

## 5. `history-analytics.ts`

Analytics больше не выполняет validation raw-данных. Её вход уже `readonly Match[]`.

`Map` полностью типизирован. `heroStats[0]` проверяется явно, потому что strict index access не допускает необоснованного доверия.

## 6. `print-history-report.ts`

Pure-функция создаёт `string[]`, а impure-функция выводит строки. Это оставляет presentation тестируемым и готовым к замене на HTTP response или React Native components.

## 7. `index.ts`

Entry point показывает весь use case несколькими строками. Здесь находятся:

- выбор пути;
- I/O;
- parser boundary;
- вызов analytics;
- presentation;
- последняя обработка unknown error.

Встроенный data path строится от будущего `dist/src/index.js`, поэтому содержит два перехода `..` до корневой `data`. `tsc` компилирует TypeScript, но сам по себе не копирует JSON assets. Это намеренно оставлено видимым; в backend-проекте копирование assets будет отдельным build step.

## 8. Почему transport и domain различаются

В JSON:

```json
{
  "hero": "Rubick",
  "team": "radiant"
}
```

В domain:

```ts
{
  hero: { name: "Rubick" },
  team: "radiant"
}
```

Команды также превращаются из строк в объекты с `side`. Это пример normalization на границе.

## 9. Что доказывает compiler, а что tests

Compiler доказывает:

- согласованность сигнатур;
- наличие обязательных properties;
- обработку `undefined`;
- корректность imports и Node declarations;
- отсутствие неразрешённых операций с `unknown`.

Tests доказывают на выбранных примерах:

- runtime parser отклоняет плохие данные;
- формулы дают ожидаемые результаты;
- input не мутирует;
- I/O читает fixture.

Ни один из механизмов не заменяет другой.

## 10. Порядок чтения

1. `package.json` и `tsconfig.json`;
2. `models.ts`;
3. `index.ts`;
4. `read-json.ts`;
5. `parse-match-history.ts`;
6. `history-analytics.ts`;
7. `print-history-report.ts`;
8. тесты.

## 11. Эксперименты

1. Добавьте optional `leagueName` и корректно нормализуйте его.
2. Добавьте literal union для tournament tier.
3. Временно удалите проверку `heroStats[0]` и прочитайте compiler error.
4. Попробуйте изменить readonly account ID.
5. Добавьте generic `top<T>` с callback получения score.
6. Создайте Result для поиска match ID.
7. Добавьте ошибочный JSON и убедитесь, что `as Match[]` нигде не понадобился.

## 12. Что вы умеете после части 4

- настраивать strict TypeScript-проект;
- читать compiler diagnostics;
- описывать примитивы, массивы и tuples;
- моделировать domain через type/interface;
- применять literal и discriminated unions;
- выполнять narrowing;
- отличать `unknown` от `any`;
- писать runtime parser;
- использовать generics и utility types;
- безопасно обрабатывать ошибки;
- строить typed asynchronous pipeline.

## 13. Переход к части 5

Следующая часть посвящена Git и дисциплине разработки. Мы поместим TypeScript-проект под version control и пройдём:

- repository и working tree;
- commit и история;
- branches;
- diff;
- `.gitignore`;
- маленькие безопасные изменения;
- merge conflicts;
- базовый code review.

После неё все дальнейшие части приложения будут развиваться через осмысленные commits.
