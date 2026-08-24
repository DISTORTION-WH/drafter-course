# Часть 4. TypeScript и безопасные модели данных

[← Часть 3. Углублённый JavaScript и асинхронность](../part-03-advanced-javascript/README.md)

## Цель

Перенести анализатор истории матчей с JavaScript на TypeScript и научиться отделять две разные задачи:

1. проверку собственного кода до запуска;
2. проверку внешних данных во время выполнения.

В финале этой части путь данных выглядит так:

```text
JSON-файл
→ unknown
→ runtime parser
→ Match[]
→ типизированная аналитика
→ HistoryReport
→ CLI
```

## Что вы создадите

Рабочий TypeScript-проект, который:

- компилируется в JavaScript;
- работает в strict mode;
- моделирует `Match`, `Player`, `Team` и `Hero`;
- не использует `any` в прикладном коде;
- принимает результат `JSON.parse` как `unknown`;
- превращает недоверенные значения в domain-модели через runtime parser;
- рассчитывает историю матчей без изменения исходных данных;
- проверяется компилятором и автоматическими тестами.

## Главы

1. [Зачем TypeScript, если уже есть JavaScript](01-why-typescript.md)
2. [Установка, компиляция и `tsconfig.json`](02-install-compile-tsconfig.md)
3. [Примитивы, массивы, tuples и inference](03-primitives-arrays-tuples.md)
4. [Объектные модели: `type` и `interface`](04-object-models-type-interface.md)
5. [Unions, optional fields и narrowing](05-unions-optionals-narrowing.md)
6. [`unknown`, `any` и runtime validation](06-unknown-any-runtime-validation.md)
7. [Типизация функций и generics](07-functions-generics.md)
8. [Readonly и utility types](08-readonly-utility-types.md)
9. [Ошибки, `never` и Result-модель](09-errors-never-result.md)
10. [Типизированный асинхронный JSON pipeline](10-typed-async-pipeline.md)
11. [Лабораторная: миграция анализатора](11-migration-lab.md)
12. [Разбор эталонного TypeScript-проекта](12-reference-project.md)

## Эталон

[examples/dota-history-cli-ts](examples/dota-history-cli-ts) — самостоятельный проект с исходниками, JSON-данными и тестами.

## Как проходить

TypeScript нельзя выучить чтением одних определений. Для каждого примера:

1. перепечатайте код;
2. наведите курсор на переменные и посмотрите выведенные типы;
3. намеренно передайте неправильное значение;
4. прочитайте ошибку компилятора;
5. исправьте тип или логику, не применяя `any` и необоснованный `as`;
6. запустите код и убедитесь, что типы не заменяют runtime-проверки.

Ориентировочный темп — 2–4 недели по 60–90 минут в день.

## Версии

Эталон зафиксирован на TypeScript 7.0.2 и рассчитан на Node.js 24. Для Node.js используются отдельные declarations из `@types/node`. Зафиксированная версия делает упражнения воспроизводимыми; в новом production-проекте обновления выполняют отдельно и проверяют компиляцией и тестами.

Официальные материалы: [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/), [TSConfig `module`](https://www.typescriptlang.org/tsconfig/module.html), [utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html).

## Следующая часть

[Часть 5. Git и дисциплина разработки](../part-05-git/README.md) начинается с безопасной practice-копии TypeScript-проекта, local repository, staging area, diff и первых осмысленных commits.
