# Модуль 4. Сохраняем матчи в PostgreSQL через Prisma

## Результат

API начнёт читать реальные строки из локального PostgreSQL. Появятся таблицы матчей, команд, лиг, героев и участников; migration станет частью истории проекта; `/v1/system/readiness` действительно проверит базу.

## 1. Сразу создать окончательный database package

Schema и generated client нужны API, worker и migration task, поэтому они с первого дня живут в `packages/database`, а не переезжают позднее.

Создайте `packages/database/package.json`:

```json
{
  "name": "@dota/database",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/client.js",
  "types": "./dist/client.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "generate": "prisma generate",
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@prisma/adapter-pg": "^7.0.0",
    "@prisma/client": "^7.0.0",
    "dotenv": "^17.0.0",
    "pg": "^8.0.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "@types/pg": "^8.0.0",
    "prisma": "^7.0.0",
    "typescript": "^5.0.0"
  }
}
```

Создайте `packages/database/tsconfig.json`:

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

Затем:

```powershell
pnpm install
pnpm --filter @dota/api add @dota/database@workspace:*
```

Теперь Prisma client является обязательной частью общей сборки. В корневом `package.json` замените `build:packages`:

```json
"build:packages": "pnpm --filter @dota/database generate && pnpm --filter \"./packages/*\" build"
```

Prisma 7 использует driver adapter. `pg` открывает соединения с PostgreSQL, `@prisma/adapter-pg` соединяет драйвер с Prisma, `@prisma/client` даёт типизированные запросы, а CLI `prisma` создаёт client и migrations.

## 2. Конфигурация Prisma

Создайте `packages/database/prisma.config.ts`:

```ts
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig, env } from 'prisma/config';

config({ path: resolve(process.cwd(), '../../.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

Здесь `env` — функция Prisma, не наш объект из API. Она требует `DATABASE_URL` при выполнении CLI. `schema` указывает, где описаны модели; `migrations.path` — где хранится история SQL.

Создайте `packages/database/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}

enum MatchWinner {
  RADIANT
  DIRE
}

enum MatchSide {
  RADIANT
  DIRE
}

model Team {
  id          String        @id @default(cuid())
  providerId  String?       @unique
  name        String
  tag         String?
  logoUrl     String?
  countryCode String?
  radiantIn   Match[]       @relation("RadiantTeam")
  direIn      Match[]       @relation("DireTeam")
  players     Player[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

model Player {
  id         String        @id @default(cuid())
  providerId String?       @unique
  steamId    String?       @unique
  nickname   String
  realName   String?
  teamId     String?
  team       Team?         @relation(fields: [teamId], references: [id])
  matches    MatchPlayer[]
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt
}

model League {
  id         String   @id @default(cuid())
  providerId String?  @unique
  name       String   @unique
  matches    Match[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Hero {
  id         Int           @id
  name       String        @unique
  localizedName String
  participants MatchPlayer[]
}

model Match {
  id              String        @id @default(cuid())
  provider         String
  providerMatchId String
  startTime       DateTime
  durationSeconds Int?
  radiantScore    Int?
  direScore       Int?
  winner          MatchWinner?
  patch           String?
  radiantTeamId   String?
  direTeamId      String?
  leagueId        String?
  radiantTeam     Team?         @relation("RadiantTeam", fields: [radiantTeamId], references: [id])
  direTeam        Team?         @relation("DireTeam", fields: [direTeamId], references: [id])
  league          League?       @relation(fields: [leagueId], references: [id])
  participants    MatchPlayer[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@unique([provider, providerMatchId])
  @@index([startTime(sort: Desc)])
  @@index([patch, startTime])
}

model MatchPlayer {
  id        String  @id @default(cuid())
  matchId   String
  playerId  String?
  heroId    Int
  side      MatchSide
  slot      Int
  kills     Int?
  deaths    Int?
  assists   Int?
  isWinner  Boolean?
  match     Match   @relation(fields: [matchId], references: [id], onDelete: Cascade)
  player    Player? @relation(fields: [playerId], references: [id])
  hero      Hero    @relation(fields: [heroId], references: [id])

  @@unique([matchId, slot])
  @@index([heroId, isWinner])
}
```

### Почему модели именно такие

- `providerMatchId` — ID у источника; внутренний `id` принадлежит нашему приложению.
- Составной unique `[provider, providerMatchId]` делает повторный импорт безопасным и позволяет сменить провайдера.
- `radiantTeamId` и `direTeamId` — внешние ключи. Relations дают Prisma возможность добавить команды в выборку.
- `MatchPlayer` — связь «участник конкретного матча». Герой, сторона и K/D/A относятся к игре, а не навсегда к `Player`.
- `slot` — позиция участника в исходных данных; unique не допускает дубль одного слота.
- `patch` нужен для мета-аналитики.
- Индексы ускоряют именно будущие production-запросы: последние игры и статистику героя по патчу.

## 3. Создать migration и client

Убедитесь, что контейнеры запущены:

```powershell
docker compose up -d
pnpm --filter @dota/database exec prisma migrate dev --name initial_domain
pnpm --filter @dota/database generate
pnpm --filter @dota/database build
```

Не редактируйте уже применённую migration. Если модель меняется, создавайте следующую. Так staging и production получают одну и ту же историю базы.

## 4. Общий client и один PrismaService на API

Создайте `packages/database/src/client.ts`:

```ts
import { PrismaPg } from '@prisma/adapter-pg';

export function createPostgresAdapter(databaseUrl: string): PrismaPg {
  return new PrismaPg({ connectionString: databaseUrl });
}

export { Prisma, PrismaClient } from './generated/prisma/client';
export type { MatchWinner } from './generated/prisma/client';
```

`createPostgresAdapter` остаётся единственным местом, где проект знает способ подключения Prisma к PostgreSQL. API и worker создадут отдельные pools, потому что это отдельные процессы.

Создайте `apps/api/src/database/prisma.service.ts`:

```ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createPostgresAdapter, PrismaClient } from '@dota/database';
import { env } from '../config/env';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const adapter = createPostgresAdapter(env.DATABASE_URL);
    super({ adapter });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

Создайте `apps/api/src/database/database.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

- `adapter` хранит способ подключения к PostgreSQL.
- `super({ adapter })` вызывает constructor родительского `PrismaClient`.
- `$disconnect` аккуратно закрывает pool при остановке контейнера.
- `@Global()` позволяет не импортировать database module в каждый feature module. Сам `DatabaseModule` всё равно один раз добавляется в `AppModule`.

## 5. Реализация repository

Создайте `apps/api/src/matches/prisma-matches.repository.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type { MatchSummary } from '@dota/contracts';
import type { MatchWinner } from '@dota/database';
import { PrismaService } from '../database/prisma.service';
import type { MatchesRepository } from './matches.repository';

function mapWinner(winner: MatchWinner | null): MatchSummary['winner'] {
  if (winner === 'RADIANT') return 'radiant';
  if (winner === 'DIRE') return 'dire';
  return null;
}

@Injectable()
export class PrismaMatchesRepository implements MatchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listRecent(limit: number): Promise<MatchSummary[]> {
    const rows = await this.prisma.match.findMany({
      take: limit,
      orderBy: { startTime: 'desc' },
      include: {
        radiantTeam: true,
        direTeam: true,
        league: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      startTime: row.startTime.toISOString(),
      durationSeconds: row.durationSeconds,
      leagueName: row.league?.name ?? null,
      radiant: {
        id: row.radiantTeam?.id ?? null,
        name: row.radiantTeam?.name ?? 'Unknown Radiant',
        score: row.radiantScore,
      },
      dire: {
        id: row.direTeam?.id ?? null,
        name: row.direTeam?.name ?? 'Unknown Dire',
        score: row.direScore,
      },
      winner: mapWinner(row.winner),
    }));
  }
}
```

`rows` — database records с relations. `row` — одна запись при проходе `map`. `?.` безопасно читает nullable relation; `??` задаёт fallback только для `null`/`undefined`. `mapWinner` отделяет внутренний enum базы от публичного JSON.

Создайте `apps/api/src/matches/matches.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MATCHES_REPOSITORY } from './matches.repository';
import { MatchesService } from './matches.service';
import { PrismaMatchesRepository } from './prisma-matches.repository';

@Module({
  controllers: [MatchesController],
  providers: [
    MatchesService,
    {
      provide: MATCHES_REPOSITORY,
      useClass: PrismaMatchesRepository,
    },
  ],
})
export class MatchesModule {}
```

В `AppModule.imports` добавьте `DatabaseModule` и `MatchesModule`. Объект `{ provide, useClass }` говорит Nest: когда service просит token `MATCHES_REPOSITORY`, создать `PrismaMatchesRepository`.

## 6. Readiness теперь проверяет PostgreSQL

В `SystemController` передайте `PrismaService` через constructor и замените метод:

```ts
constructor(private readonly prisma: PrismaService) {}

@Get('readiness')
async getReadiness(): Promise<{ ready: true }> {
  await this.prisma.$queryRaw`SELECT 1`;
  return { ready: true };
}
```

Если база недоступна, promise завершится ошибкой и load balancer не будет считать контейнер готовым.

## 7. Ваша аналогичная задача: PrismaTeamsRepository

Контракт `TeamSummary` уже создан в модуле 3. Создайте `apps/api/src/teams/teams.repository.ts`:

```ts
import type { TeamSummary } from '@dota/contracts';

export const TEAMS_REPOSITORY = Symbol('TEAMS_REPOSITORY');

export interface TeamsRepository {
  findById(id: string): Promise<TeamSummary | null>;
}
```

Затем создайте `prisma-teams.repository.ts`. Точные имена:

- class `PrismaTeamsRepository`;
- constructor variable `prisma`;
- function `findById`;
- input variable `id`;
- database result `team`.

Эталон:

```ts
import { Injectable } from '@nestjs/common';
import type { TeamSummary } from '@dota/contracts';
import { PrismaService } from '../database/prisma.service';
import type { TeamsRepository } from './teams.repository';

@Injectable()
export class PrismaTeamsRepository implements TeamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TeamSummary | null> {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) return null;

    return {
      id: team.id,
      name: team.name,
      tag: team.tag,
      logoUrl: team.logoUrl,
      countryCode: team.countryCode,
    };
  }
}
```

Этот файл не подключаем временным endpoint: он станет частью полного `TeamsModule` в модуле 7.

## 8. Проверка и commit

```powershell
pnpm --filter @dota/database exec prisma validate
pnpm --filter @dota/database exec prisma migrate status
pnpm --filter @dota/api typecheck
pnpm dev:api
Invoke-RestMethod http://localhost:3000/v1/system/readiness
Invoke-RestMethod http://localhost:3000/v1/matches
git add apps/api packages/contracts packages/database pnpm-lock.yaml
git commit -m "feat(database): persist match domain with Prisma"
```

Пустой массив матчей сейчас правильный: база работает, но importer ещё ничего не загрузил.

[Следующий модуль](06_MODULE_05_DATA_PROVIDER.md)
