# Глава 1. Стратегия тестирования и критические пути

## 1. Что тест действительно доказывает

Тест — программа, которая выполняет действие и сравнивает наблюдаемый результат с ожидаемым. Он доказывает только проверенный сценарий в конкретной среде.

```ts
expect(calculateContestRate({ picks: 30, bans: 50, drafts: 100 }))
  .toBe(0.8);
```

Этот тест доказывает одно вычисление. Он не доказывает, что SQL выбрал правильные матчи, API вернул число, а mobile показал 80%.

## 2. Уровни тестов

| Уровень | Что запускается | Скорость | Что ловит |
|---|---|---:|---|
| unit | функция/небольшой service | миллисекунды | формулы, ветвления, state machine |
| integration | код + PostgreSQL/Redis/adapter | секунды | SQL, constraints, migrations, serialization |
| backend E2E | HTTP → Nest → БД | секунды | routing, DTO, auth, transaction |
| component | React Native tree + controlled dependencies | секунды | состояния экрана и действия |
| device E2E | собранное приложение + ОС + staging/fake backend | минуты | navigation, deep link, native integration |
| smoke production | безопасное чтение | минуты | жив ли развёрнутый критический путь |

Чем выше уровень, тем тест реалистичнее, медленнее и сложнее диагностируется. Поэтому большинство правил проверяется низко, а несколько главных пользовательских путешествий — сквозным тестом.

## 3. Критические пути Dota Analyzer

Приоритет P0:

```text
ingestion -> canonical match -> API -> mobile match detail
raw provider fixture -> повторная обработка без дубля
Steam verification -> session -> refresh rotation
user A -> watchlist ownership -> user B не видит запись
match reminder -> outbox -> push delivery record
backup -> новая БД -> API читает восстановленные данные
```

P1:

- фильтры и cursor pagination;
- meta snapshot и freshness;
- guest watchlist merge;
- notification preferences;
- logout/account switch;
- provider outage и stale data.

Не начинайте с тестирования цвета каждой иконки, пока P0 не защищён.

## 4. Arrange, Act, Assert

Удобная структура:

```ts
it('не считает remakes в win rate', () => {
  // Arrange: подготовили входные матчи.
  const matches = [wonMatch(), lostMatch(), remakeMatch()];

  // Act: выполнили одно действие.
  const result = calculateWinRate(matches);

  // Assert: проверили публичный результат.
  expect(result).toEqual({ wins: 1, games: 2, rate: 0.5 });
});
```

Название теста формулирует правило продукта. Комментарии необязательны, если блоки и имена достаточно ясны.

## 5. Given/When/Then для сценариев

```text
Given пользователь A и его watchlist entry
When пользователь B отправляет DELETE по этому entry ID
Then API возвращает 404 или 403 согласно контракту
And запись пользователя A остаётся в базе
```

Проверка только статуса недостаточна: нужно убедиться, что состояние не изменилось.

## 6. Детерминизм

Тест повторяется одинаково:

- время берётся из injected clock;
- UUID — из controlled generator или проверяется по форме;
- random seed фиксируется;
- timezone явно UTC;
- внешняя сеть заменена fixture adapter;
- тест создаёт собственные данные;
- порядок тестов не важен;
- shared mutable singleton очищается.

Вместо прямого `new Date()` в domain service:

```ts
export interface Clock {
  now(): Date;
}

export class FixedClock implements Clock {
  constructor(private readonly value: Date) {}
  now(): Date {
    return new Date(this.value);
  }
}
```

В production используется `SystemClock`, в тесте — `FixedClock`.

## 7. Test data builders

Большие литералы быстро становятся нечитаемыми:

```ts
const match = matchBuilder()
  .withId('8173564281')
  .withTeams('2163', '39')
  .finishedRadiantWin()
  .build();
```

Builder задаёт валидные defaults, а тест меняет только важные поля. Не используйте один огромный global fixture для всех тестов: изменение одного поля сломает десятки несвязанных сценариев.

## 8. Coverage как индикатор

Coverage показывает выполненные строки/ветви, но не качество assertions. Полезная политика:

- включать в отчёт также неимпортированные source files;
- повышать threshold постепенно;
- отдельно защищать security/domain modules;
- не тестировать бессмысленные getters ради процента;
- review пропущенных ветвей важнее абсолютного числа.

## 9. Test matrix

Создайте `docs/testing/critical-paths.md`:

| Правило | Unit | Integration | HTTP E2E | Mobile | Device |
|---|---:|---:|---:|---:|---:|
| match ID остаётся строкой | ✓ | ✓ | ✓ | ✓ |  |
| cursor не теряет одинаковое время |  | ✓ | ✓ | ✓ |  |
| refresh reuse отзывает family | ✓ | ✓ | ✓ |  |  |
| push открывает match |  |  |  | ✓ | ✓ |
| provider replay идемпотентен | ✓ | ✓ |  |  |  |

Пустая клетка допустима. Каждое правило не обязано дублироваться на всех уровнях.

## 10. Упражнение

Выпишите десять наиболее дорогих сбоев приложения. Для каждого выберите самый низкий уровень теста, который уверенно его обнаружит, и один более высокий smoke-сценарий для связи слоёв.

[Назад к оглавлению](README.md) · [Следующая глава](02-vitest-unit-tests.md)

