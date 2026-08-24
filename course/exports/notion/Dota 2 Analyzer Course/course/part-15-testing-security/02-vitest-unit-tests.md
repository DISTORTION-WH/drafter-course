# Глава 2. Unit-тесты с Vitest

## 1. Установка и scripts

В backend/domain package:

```bash
pnpm add -D vitest @vitest/coverage-v8
```

`package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

`vitest` без `run` удобен локально и ждёт изменения. В CI нужен завершающийся `vitest run`.

## 2. Минимальная конфигурация

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/generated/**'],
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
```

`restoreMocks` возвращает подменённые функции, `clearMocks` очищает историю вызовов. Generated OpenAPI code исключён: мы тестируем наш контракт pipeline, а не строки генератора.

В monorepo можно иметь root workspace/project config и разные environments. Не заставляйте React Native tests использовать Node-конфигурацию backend.

## 3. Первый тест формулы меты

```ts
import { describe, expect, it } from 'vitest';
import { calculateHeroRates } from './calculate-hero-rates';

describe('calculateHeroRates', () => {
  it('считает pick, ban и contest rate от числа драфтов', () => {
    const result = calculateHeroRates({
      drafts: 100,
      picks: 30,
      bans: 50,
      wins: 18,
    });

    expect(result).toEqual({
      pickRate: 0.3,
      banRate: 0.5,
      contestRate: 0.8,
      winRate: 0.6,
    });
  });
});
```

Добавьте edge cases:

- ноль drafts;
- picks больше drafts — invalid input;
- wins больше picks;
- герой только banned;
- remake/excluded match не входит в denominator;
- округление выполняется только в UI.

## 4. `toBe` и `toEqual`

```ts
expect(2 + 2).toBe(4);
expect({ games: 10 }).toEqual({ games: 10 });
```

`toBe` сравнивает примитивы или одну ссылку. `toEqual` рекурсивно сравнивает содержимое объекта. Для floating point:

```ts
expect(result.rate).toBeCloseTo(2 / 3, 10);
```

Не округляйте domain number только ради точного equality.

## 5. Тест state machine

```ts
it.each([
  ['scheduled', 'live', true],
  ['live', 'finished', true],
  ['finished', 'live', false],
] as const)(
  '%s -> %s: %s',
  (from, to, expected) => {
    expect(canTransitionMatch(from, to)).toBe(expected);
  },
);
```

Table-driven test компактно покрывает правила переходов. Но если конкретная строка имеет сложное бизнес-объяснение, выделите отдельный именованный test.

## 6. Dependency injection вместо глобального mock

```ts
export interface MatchProvider {
  fetchMatch(matchId: string): Promise<ProviderMatch>;
}

const provider: MatchProvider = {
  fetchMatch: vi.fn().mockResolvedValue(providerMatchFixture()),
};

const service = new IngestMatchService(provider, repository, clock);
```

Подмена interface проще и безопаснее, чем глобальный `vi.mock` HTTP-библиотеки. Module mock применяйте на действительно неудобной границе, понимая hoisting и reset.

## 7. Проверяем результат и взаимодействие

Главное assertion — состояние/возврат:

```ts
expect(result.status).toBe('stored');
expect(await repository.findById('8173564281')).toEqual(expectedMatch);
```

Interaction assertion полезен на boundary:

```ts
expect(provider.fetchMatch).toHaveBeenCalledOnce();
expect(provider.fetchMatch).toHaveBeenCalledWith('8173564281');
```

Не проверяйте каждый внутренний method call: рефакторинг без изменения поведения не должен ломать тест.

## 8. Ошибки

```ts
await expect(service.ingest('bad-id')).rejects.toMatchObject({
  code: 'INVALID_MATCH_ID',
});
```

Проверяйте стабильный `code`, а не весь английский текст или stack trace.

## 9. Fake timers

Для backoff/debounce:

```ts
vi.useFakeTimers();

const promise = retryOperation(operation);
await vi.advanceTimersByTimeAsync(1_000);
await promise;

vi.useRealTimers();
```

Всегда возвращайте реальные timers после теста. Не используйте fake timers, если тесту нужна настоящая сеть/контейнер.

## 10. Mutation testing мышлением

Мысленно измените `>` на `>=`, `radiantWin` на `direWin`, удалите проверку `isRemake`. Если тесты всё равно зелёные, assertions недостаточны. Специализированный mutation testing можно добавить позже, но привычка уже полезна.

## 11. Практика

Покройте unit-тестами:

- четыре meta rate;
- Wilson interval;
- cursor encode/decode/expiry;
- match state machine;
- notification dedup key;
- refresh token transition rules;
- filter normalization;
- error presentation mapping.

Официальные справочники: [Vitest Guide](https://vitest.dev/guide/) и [Coverage](https://vitest.dev/guide/coverage.html).

[Предыдущая глава](01-testing-strategy-pyramid.md) · [Оглавление](README.md) · [Следующая глава](03-integration-testcontainers.md)

