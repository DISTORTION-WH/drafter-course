# Глава 11. Разбор эталонного проекта

Эталон находится в [examples/dota-match-cli](examples/dota-match-cli).

## 1. Как запускать

Перейдите в папку проекта:

```powershell
Set-Location .\examples\dota-match-cli
```

Проверьте:

```powershell
Get-Location
Get-ChildItem
```

Запуск:

```powershell
npm start
```

Тесты:

```powershell
npm test
```

В проекте нет внешних dependencies, поэтому для запуска не требуется `npm install`. В обычном repository с dependencies установка обязательна.

## 2. Почему данные отдельно

[src/data/match.js](examples/dota-match-cli/src/data/match.js.md) экспортирует fixture. Domain не знает, откуда объект был получен.

Позже вместо fixture появится:

```text
OpenDota HTTP response
→ validation
→ canonical Match
```

Функции отчёта продолжат принимать объект.

## 3. Почему calculations отдельно

[src/domain/calculations.js](examples/dota-match-cli/src/domain/calculations.js.md) содержит чистые расчёты без console, файлов и сети.

Это самый простой для тестирования слой.

## 4. Почему validation отдельно

[src/domain/validation.js](examples/dota-match-cli/src/domain/validation.js.md) описывает допустимую форму входа.

Когда в курс войдёт TypeScript и runtime schema validation, эти правила станут более формальными, но их смысл сохранится.

## 5. Почему report импортирует два domain-модуля

[src/domain/match-report.js](examples/dota-match-cli/src/domain/match-report.js.md) координирует:

- валидацию;
- расчёты;
- создание новых enriched objects;
- агрегирование.

Он не печатает результат и не завершает process.

При вычислении среднего KDA модуль суммирует точные KDA из исходных kills/deaths/assists и округляет только финальное среднее. Если сначала округлить каждого игрока, а затем усреднить, небольшие ошибки округления накапливаются.

## 6. Почему presentation отдельно

[src/presentation/print-report.js](examples/dota-match-cli/src/presentation/print-report.js.md) знает о консоли и текстовом формате.

Позже появятся другие presentation layers:

- JSON HTTP response;
- React Native components;
- admin dashboard;
- notification text.

Domain-расчёты при этом не должны дублироваться.

## 7. Почему entry point маленький

[src/index.js](examples/dota-match-cli/src/index.js.md) является composition root:

1. Получает данные.
2. Запускает use case.
3. Передаёт результат presentation.
4. Обрабатывает верхнеуровневую ошибку.

Он соединяет компоненты, но не реализует их внутреннюю логику.

## 8. Что проверяют tests

- [calculations.test.js](examples/dota-match-cli/test/calculations.test.js.md) — чистые формулы;
- [validation.test.js](examples/dota-match-cli/test/validation.test.js.md) — правила входа;
- [match-report.test.js](examples/dota-match-cli/test/match-report.test.js.md) — общий domain use case.

Такое разделение помогает быстро понять слой регрессии.

## 9. Что можно сделать иначе

Корректное решение может:

- использовать `for...of` вместо `reduce`;
- разбить validation на дополнительные функции;
- использовать fixture factory;
- выводить больше полей;
- хранить test fixtures отдельно.

Главные инварианты:

- исходный match не меняется;
- domain не зависит от console;
- невалидный input не становится нормальным отчётом;
- тесты воспроизводимы;
- imports направлены от entry point к нижним слоям.

## 10. Контрольные вопросы

1. Почему `package.json` содержит `type: module`?
2. Почему локальный import заканчивается `.js`?
3. Чем `npm start` отличается от `node src/index.js`?
4. Почему test runner встроен в Node.js?
5. Где находится текущая рабочая папка при запуске?
6. Почему `printMatchReport` не вызывается внутри `createMatchReport`?
7. Что произойдёт, если validation обнаружит отрицательные kills?
8. Как CI поймёт, что CLI завершился ошибкой?

## 11. Переход к следующей части

В части 3 мы углубим JavaScript и заменим hardcoded объект чтением JSON-файла. Темы:

- callback и higher-order functions;
- immutable transformations;
- `Map` и `Set`;
- `Promise`;
- `async/await`;
- event loop;
- `node:fs/promises`;
- обработка asynchronous errors;
- импорт истории матчей из JSON.
