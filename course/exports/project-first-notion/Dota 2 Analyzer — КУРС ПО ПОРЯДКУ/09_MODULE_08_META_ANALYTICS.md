# Модуль 8. Реальная аналитика меты

## Результат

Endpoint `GET /v1/meta/heroes` рассчитает pick count, win count, pick rate и win rate по патчу и периоду. Пользователь увидит размер выборки и не примет статистику трёх игр за надёжный вывод.

## 1. Контракт ответа и фильтров

Создайте `packages/contracts/src/meta.ts`:

```ts
import { z } from 'zod';
import { parseRequest } from '../http/parse-request';

export const HeroMetaRowSchema = z.object({
  heroId: z.number().int().positive(),
  heroName: z.string().min(1),
  picks: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  pickRate: z.number().min(0).max(1),
  winRate: z.number().min(0).max(1),
});

export const HeroMetaResponseSchema = z.object({
  filters: z.object({
    patch: z.string().min(1).nullable(),
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  sample: z.object({
    matchCount: z.number().int().nonnegative(),
    pickCount: z.number().int().nonnegative(),
  }),
  heroes: z.array(HeroMetaRowSchema),
});

export type HeroMetaResponse = z.infer<typeof HeroMetaResponseSchema>;
```

`pickRate` — доля матчей, где герой был выбран; `winRate` — доля побед среди выборов героя. Это разные знаменатели, и контракт показывает исходные counts рядом с rates.

## 2. Входной query нельзя принимать как готовый

Создайте `apps/api/src/meta/meta.query.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const rawMetaQuerySchema = z.object({
  patch: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type MetaFilters = {
  patch: string | null;
  from: Date;
  to: Date;
};

export function parseMetaFilters(raw: unknown, now = new Date()): MetaFilters {
  const parsed = parseRequest(rawMetaQuerySchema, raw);
  const to = parsed.to ?? now;
  const from = parsed.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1_000);

  if (from >= to) {
    throw new BadRequestException('from must be earlier than to');
  }

  return { patch: parsed.patch ?? null, from, to };
}
```

- `raw` — непроверенный query object.
- `now` передаётся параметром, чтобы тест не зависел от часов компьютера.
- `to` — верхняя граница, по умолчанию сейчас.
- `from` — нижняя граница, по умолчанию ровно 30 суток до `to`.
- `30 * 24 * 60 * 60 * 1_000` переводит дни в миллисекунды.
- Проверка `from >= to` предотвращает бессмысленный диапазон.

## 3. SQL запроса, а не выгрузка всей таблицы в Node.js

Создайте `apps/api/src/meta/meta.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type { HeroMetaResponse } from '@dota/contracts';
import { Prisma } from '@dota/database';
import { PrismaService } from '../database/prisma.service';
import type { MetaFilters } from './meta.query';

type HeroMetaDatabaseRow = {
  heroId: number;
  heroName: string;
  picks: bigint;
  wins: bigint;
};

@Injectable()
export class MetaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getHeroMeta(filters: MetaFilters): Promise<HeroMetaResponse> {
    const patchCondition = filters.patch
      ? Prisma.sql`AND m."patch" = ${filters.patch}`
      : Prisma.empty;

    const matchCountRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count
      FROM "Match" m
      WHERE m."startTime" >= ${filters.from}
        AND m."startTime" < ${filters.to}
        ${patchCondition}
    `;

    const rows = await this.prisma.$queryRaw<HeroMetaDatabaseRow[]>`
      SELECT
        h."id" AS "heroId",
        h."localizedName" AS "heroName",
        COUNT(mp."id") AS "picks",
        COUNT(mp."id") FILTER (WHERE mp."isWinner" = true) AS "wins"
      FROM "MatchPlayer" mp
      JOIN "Match" m ON m."id" = mp."matchId"
      JOIN "Hero" h ON h."id" = mp."heroId"
      WHERE m."startTime" >= ${filters.from}
        AND m."startTime" < ${filters.to}
        ${patchCondition}
      GROUP BY h."id", h."localizedName"
      ORDER BY "picks" DESC, "heroName" ASC
    `;

    const matchCount = Number(matchCountRows[0]?.count ?? 0n);
    const pickCount = rows.reduce((total, row) => total + Number(row.picks), 0);

    return {
      filters: {
        patch: filters.patch,
        from: filters.from.toISOString(),
        to: filters.to.toISOString(),
      },
      sample: { matchCount, pickCount },
      heroes: rows.map((row) => {
        const picks = Number(row.picks);
        const wins = Number(row.wins);
        return {
          heroId: row.heroId,
          heroName: row.heroName,
          picks,
          wins,
          pickRate: matchCount === 0 ? 0 : picks / matchCount,
          winRate: picks === 0 ? 0 : wins / picks,
        };
      }),
    };
  }
}
```

### Почему этот код безопасен и корректен

- `${filters.from}` внутри tagged template Prisma — параметр SQL, а не склеенная строка. Это защищает от SQL injection.
- `patchCondition` либо безопасный SQL fragment, либо пустой fragment.
- PostgreSQL `COUNT` приходит как `bigint`; перед JSON его явно переводим в `number`.
- `total` — накопленная сумма picks; `row` — текущий герой в `reduce`.
- При нулевом знаменателе rate равен 0, а не `NaN`.
- Полуинтервал `>= from` и `< to` не считает граничный матч дважды в соседних отчётах.
- SQL агрегирует в базе. Node.js не загружает миллионы участников ради шести чисел.

Экспортируйте `Prisma` namespace из `packages/database/src/client.ts`:

```ts
export { Prisma } from './generated/prisma/client';
```

## 4. Service и endpoint

Создайте `meta.service.ts`:

```ts
@Injectable()
export class MetaService {
  constructor(private readonly metaRepository: MetaRepository) {}

  getHeroMeta(filters: MetaFilters): Promise<HeroMetaResponse> {
    return this.metaRepository.getHeroMeta(filters);
  }
}
```

Создайте `meta.controller.ts`:

```ts
@Controller('meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Get('heroes')
  async heroes(@Query() rawQuery: unknown): Promise<HeroMetaResponse> {
    const filters = parseMetaFilters(rawQuery);
    const response = await this.metaService.getHeroMeta(filters);
    return HeroMetaResponseSchema.parse(response);
  }
}
```

Создайте `MetaModule` с controller, `MetaService`, `MetaRepository`; импортируйте в `AppModule`.

## 5. Тест математического смысла

Integration fixture должен создать два матча одного патча:

- Hero A выбран дважды, выиграл один раз;
- Hero B выбран один раз и выиграл;
- в выборке два матча.

Ожидания:

```ts
expect(heroA).toMatchObject({
  picks: 2,
  wins: 1,
  pickRate: 1,
  winRate: 0.5,
});

expect(heroB).toMatchObject({
  picks: 1,
  wins: 1,
  pickRate: 0.5,
  winRate: 1,
});
```

Тест проверяет не реализацию строка-в-строку, а бизнес-определения показателей.

## 6. Ваша аналогичная задача: форма команды

Добавьте production endpoint `GET /v1/meta/teams/:teamId/form?limit=10`. Он покажет последние результаты команды и войдёт в будущую карточку команды.

Контракт строки:

```ts
const TeamFormItemSchema = z.object({
  matchId: z.string(),
  startedAt: z.string().datetime(),
  opponentName: z.string(),
  won: z.boolean(),
});
```

Напишите repository function `getTeamForm(teamId: string, requestedLimit: number)`. Точные переменные:

- `limit` — `requestedLimit`, ограниченный 1–20;
- `matches` — Prisma rows, где команда Radiant или Dire;
- `isRadiant` — boolean для текущей строки;
- `opponent` — противоположная relation;
- `won` — сравнение стороны с `match.winner`.

Основной запрос:

```ts
const matches = await this.prisma.match.findMany({
  where: {
    OR: [{ radiantTeamId: teamId }, { direTeamId: teamId }],
    winner: { not: null },
  },
  take: limit,
  orderBy: { startTime: 'desc' },
  include: { radiantTeam: true, direTeam: true },
});
```

Эталон mapping:

```ts
return matches.map((match) => {
  const isRadiant = match.radiantTeamId === teamId;
  const opponent = isRadiant ? match.direTeam : match.radiantTeam;
  const won = isRadiant
    ? match.winner === 'RADIANT'
    : match.winner === 'DIRE';

  return {
    matchId: match.id,
    startedAt: match.startTime.toISOString(),
    opponentName: opponent?.name ?? 'Unknown team',
    won,
  };
});
```

Добавьте endpoint в `MetaController`, query validation и тест: неизвестный `limit=500` должен привести к максимум 20 rows.

## 7. Проверка и commit

```powershell
pnpm -r test
pnpm -r typecheck
Invoke-RestMethod "http://localhost:3000/v1/meta/heroes?patch=57&from=2026-01-01&to=2026-08-01"
git add apps/api/src/meta packages/contracts packages/database
git commit -m "feat(meta): calculate hero and team analytics"
```

Не публикуйте rate без `picks`, `wins` и периода: число `70%` на двух матчах технически верно, но вводит пользователя в заблуждение.

[Следующий модуль](10_MODULE_09_MOBILE_BOOTSTRAP.md)
