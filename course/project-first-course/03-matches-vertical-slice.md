# Модуль 3. Первый настоящий срез: список профессиональных матчей

## Результат

В проекте появится единый контракт матча, endpoint `GET /v1/matches` и тест бизнес-логики. Пока данные подставляет тестовый repository; в следующем модуле тот же интерфейс получит реализацию на PostgreSQL. Контракт, service, controller и тест останутся в итоговом приложении.

## 1. Общий пакет контрактов

Создайте `packages/contracts/package.json`:

```json
{
  "name": "@dota/contracts",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  }
}
```

Создайте `packages/contracts/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

`@dota/contracts` нужен и API, и мобильному приложению. Благодаря этому поле не сможет называться `duration` на сервере и `durationSeconds` в телефоне незаметно для TypeScript.

Установите пакет в API:

```powershell
pnpm install
pnpm --filter @dota/api add @dota/contracts@workspace:*
```

## 2. Контракт одного матча

Создайте `packages/contracts/src/matches.ts`:

```ts
import { z } from 'zod';

export const TeamSideSchema = z.object({
  id: z.string().nullable(),
  name: z.string().min(1),
  score: z.number().int().nonnegative().nullable(),
});

export const MatchSummarySchema = z.object({
  id: z.string().min(1),
  startTime: z.string().datetime(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  leagueName: z.string().min(1).nullable(),
  radiant: TeamSideSchema,
  dire: TeamSideSchema,
  winner: z.enum(['radiant', 'dire']).nullable(),
});

export const MatchListSchema = z.array(MatchSummarySchema);

export type TeamSide = z.infer<typeof TeamSideSchema>;
export type MatchSummary = z.infer<typeof MatchSummarySchema>;
```

Создайте `packages/contracts/src/index.ts`:

```ts
export * from './matches';
```

Создайте `packages/contracts/test/matches.test.ts`, чтобы публичный contract нельзя было незаметно ослабить:

```ts
import { describe, expect, it } from 'vitest';
import { MatchSummarySchema } from '../src/matches';

describe('MatchSummarySchema', () => {
  it('отклоняет отрицательный счёт', () => {
    const result = MatchSummarySchema.safeParse({
      id: 'match-1',
      startTime: '2026-08-01T12:00:00.000Z',
      durationSeconds: 2400,
      leagueName: 'Test League',
      radiant: { id: 'team-1', name: 'Radiant', score: -1 },
      dire: { id: 'team-2', name: 'Dire', score: 10 },
      winner: 'dire',
    });

    expect(result.success).toBe(false);
  });
});
```

`result` — не exception, а результат `safeParse`; test подтверждает реальное правило публичного API.

### Что здесь делает каждое имя

- `TeamSideSchema` — проверяемое во время работы описание одной стороны матча. В Dota это Radiant или Dire.
- `id` — строка, потому что идентификаторы внешних систем могут быть больше безопасного диапазона JavaScript `number`. Если провайдер не знает команду, значение `null`.
- `name` — отображаемое название команды. `min(1)` запрещает пустую строку.
- `score` — число убийств; оно целое и неотрицательное. Во время незавершённого импорта допускается `null`.
- `MatchSummarySchema` — форма данных карточки матча, а не все подробности матча.
- `startTime` — ISO-строка даты. Такой формат одинаково понимают Node.js, React Native и JSON.
- `winner` — только одна из двух сторон либо `null`, если результат неизвестен.
- `MatchListSchema` — проверка массива карточек.
- `z.infer` строит TypeScript type из реальной Zod-схемы. Мы не описываем одну структуру дважды.

## 3. Repository и service

Создайте `apps/api/src/matches/matches.repository.ts`:

```ts
import type { MatchSummary } from '@dota/contracts';

export const MATCHES_REPOSITORY = Symbol('MATCHES_REPOSITORY');

export interface MatchesRepository {
  listRecent(limit: number): Promise<MatchSummary[]>;
}
```

Создайте `apps/api/src/matches/matches.service.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import type { MatchSummary } from '@dota/contracts';
import {
  MATCHES_REPOSITORY,
  type MatchesRepository,
} from './matches.repository';

@Injectable()
export class MatchesService {
  constructor(
    @Inject(MATCHES_REPOSITORY)
    private readonly matchesRepository: MatchesRepository,
  ) {}

  async listRecent(requestedLimit = 20): Promise<MatchSummary[]> {
    const safeLimit = Math.min(Math.max(requestedLimit, 1), 100);
    return this.matchesRepository.listRecent(safeLimit);
  }
}
```

Разбор:

- `MATCHES_REPOSITORY` — уникальный runtime-ключ. TypeScript interface исчезает после компиляции, поэтому Nest нужен реальный `Symbol` для dependency injection.
- `MatchesRepository` — договор: любая база должна уметь вернуть последние матчи. Service не знает SQL.
- `matchesRepository` — конкретный объект, переданный Nest. `private` запрещает обращаться к нему снаружи класса; `readonly` запрещает заменить объект после создания service.
- `requestedLimit` — значение из запроса пользователя; по умолчанию 20.
- `safeLimit` — то же значение после ограничения диапазоном 1–100. Пользователь не сможет случайно запросить миллион строк.
- `Math.max(requestedLimit, 1)` поднимает слишком маленькое число до 1; внешний `Math.min(..., 100)` опускает слишком большое до 100.
- `Promise<MatchSummary[]>` означает, что функция асинхронно вернёт массив карточек.

## 4. Controller

Сначала создайте единственную production-функцию для превращения Zod validation failure в HTTP 400: `apps/api/src/http/parse-request.ts`.

```ts
import { BadRequestException } from '@nestjs/common';
import type { ZodType } from 'zod';

export function parseRequest<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new BadRequestException({
      message: 'Invalid request',
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
      })),
    });
  }
  return result.data;
}
```

`result` — discriminated union успеха/ошибки. Мы не возвращаем внутренние stack traces или весь полученный body, но даём клиенту безопасные path/code. Эту функцию используют все query/body/params следующих модулей.

Создайте `apps/api/src/matches/matches.controller.ts`:

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { MatchListSchema, type MatchSummary } from '@dota/contracts';
import { z } from 'zod';
import { parseRequest } from '../http/parse-request';
import { MatchesService } from './matches.service';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
});

@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  async list(@Query() rawQuery: unknown): Promise<MatchSummary[]> {
    const query = parseRequest(listQuerySchema, rawQuery);
    const matches = await this.matchesService.listRecent(query.limit);
    return MatchListSchema.parse(matches);
  }
}
```

- `rawQuery: unknown` честно сообщает: данные из интернета ещё не проверены.
- `query` — проверенный объект. Строка URL `?limit=20` превращается в число.
- `matches` — результат service.
- Последний `parse` защищает публичный API: даже ошибка mapping базы не отправит клиенту объект неправильной формы.

Модуль подключим после появления PostgreSQL implementation в модуле 4. Сейчас проверим независимую бизнес-логику.

## 5. Реальный тест, который останется в проекте

Создайте `apps/api/src/matches/matches.service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { MatchesRepository } from './matches.repository';
import { MatchesService } from './matches.service';

describe('MatchesService', () => {
  it('ограничивает размер выдачи ста матчами', async () => {
    const repository: MatchesRepository = {
      listRecent: vi.fn().mockResolvedValue([]),
    };
    const service = new MatchesService(repository);

    await service.listRecent(500);

    expect(repository.listRecent).toHaveBeenCalledWith(100);
  });
});
```

`repository` — маленькая тестовая реализация настоящего интерфейса. Она не является фальшивым учебным проектом: тест навсегда защищает production-ограничение. `vi.fn()` запоминает вызовы, а `mockResolvedValue([])` имитирует асинхронный ответ базы.

## 6. Ваша аналогичная задача: контракт команды

Эта работа будет использована в модуле 7. Создайте `packages/contracts/src/teams.ts`.

Требования:

1. Объявите `TeamSummarySchema`.
2. Поле `id`: непустая строка.
3. Поле `name`: непустая строка.
4. Поле `tag`: строка длиной 1–10 символов либо `null`.
5. Поле `logoUrl`: корректный URL либо `null`.
6. Поле `countryCode`: ровно два символа либо `null`.
7. Создайте `TeamListSchema` как массив команд.
8. Выведите type `TeamSummary` через `z.infer`.
9. Экспортируйте файл из `src/index.ts`.

Сначала напишите сами, потом сравните:

```ts
import { z } from 'zod';

export const TeamSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tag: z.string().min(1).max(10).nullable(),
  logoUrl: z.string().url().nullable(),
  countryCode: z.string().length(2).nullable(),
});

export const TeamListSchema = z.array(TeamSummarySchema);
export type TeamSummary = z.infer<typeof TeamSummarySchema>;
```

В `index.ts` добавьте:

```ts
export * from './teams';
```

Имена выбраны не произвольно: `TeamSummary` — карточка списка, а будущий `TeamDetails` будет содержать состав и историю матчей.

## 7. Проверка и commit

```powershell
pnpm --filter @dota/contracts build
pnpm --filter @dota/api test
pnpm -r typecheck
git add apps/api/src/matches packages/contracts pnpm-lock.yaml
git commit -m "feat(matches): define match contracts and service"
```

Готово, если тест доказывает ограничение 100, TypeScript не сообщает ошибок, а вы можете объяснить разницу между `unknown`, schema, type, repository и service.

[Следующий модуль](04-postgresql-prisma.md)
