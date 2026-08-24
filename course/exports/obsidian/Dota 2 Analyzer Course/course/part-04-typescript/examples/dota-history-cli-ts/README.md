# Dota History CLI на TypeScript

Эталон части 4 курса: strict TypeScript-версия анализатора истории матчей.

## Требования

- Node.js 24;
- pnpm 11;
- терминал в директории проекта.

## Установка

```powershell
pnpm install --frozen-lockfile
```

Проект содержит `pnpm-lock.yaml`; не выполняйте в этой же директории `npm install` и не создавайте второй lockfile.

## Команды

Проверить типы без output:

```powershell
pnpm run typecheck
```

Скомпилировать в `dist`:

```powershell
pnpm run build
```

Собрать и запустить встроенный пример:

```powershell
pnpm start
```

Использовать собственный JSON:

```powershell
node dist/src/index.js C:\путь\к\matches.json
```

Запустить tests:

```powershell
pnpm test
```

Проверить error path:

```powershell
node dist/src/index.js missing.json
```

## Безопасная граница

```text
readJsonFile(): Promise<unknown>
→ parseMatchHistory(unknown): readonly Match[]
→ analyzeMatchHistory(Match[]): HistoryReport
```

В проекте намеренно нет прикладного `any`, `@ts-ignore` и cast внешнего JSON к `Match[]`.

## Данные

[data/matches.json](data/matches.json) содержит вымышленные учебные матчи. Команды, игроки, match ID и статистика не описывают реальные события.

## Основные файлы

- [models.ts](src/domain/models.ts) — domain types;
- [parse-match-history.ts](src/domain/parse-match-history.ts) — runtime validation и normalization;
- [history-analytics.ts](src/domain/history-analytics.ts) — чистые расчёты;
- [read-json.ts](src/io/read-json.ts) — файловая граница;
- [index.ts](src/index.ts) — composition root.
