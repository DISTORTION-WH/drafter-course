# Модуль 6. Фоновый импорт через Redis и BullMQ

## Результат

Появится отдельное приложение `apps/worker`. Оно регулярно ставит задачу синхронизации в Redis, получает данные через provider и идемпотентно сохраняет матчи в PostgreSQL. API больше не ждёт внешний сервис во время пользовательского запроса.

## 1. Создать настоящий worker package

```powershell
New-Item -ItemType Directory -Force apps/worker/src
```

Создайте `apps/worker/package.json`:

```json
{
  "name": "@dota/worker",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@dota/database": "workspace:*",
    "@dota/ingestion": "workspace:*",
    "bullmq": "^5.0.0",
    "dotenv": "^17.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  }
}
```

Создайте `apps/worker/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "declaration": false
  },
  "include": ["src/**/*.ts"]
}
```

Затем выполните `pnpm install`. Worker сразу использует окончательные packages `@dota/database` и `@dota/ingestion`, созданные в модулях 4–5; ничего переносить не требуется.

## 2. Конфигурация и имя job

Создайте `apps/worker/src/config.ts`:

```ts
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(process.cwd(), '../../.env') });

const workerEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  OPENDOTA_BASE_URL: z.string().url(),
});

export const workerEnv = workerEnvSchema.parse(process.env);
```

Создайте `apps/worker/src/redis-connection.ts`:

```ts
export function createRedisConnection(redisUrlString: string) {
  const redisUrl = new URL(redisUrlString);
  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password
      ? decodeURIComponent(redisUrl.password)
      : undefined,
    tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
  };
}
```

Эта функция остаётся общей для scheduler, worker и ручной operational-команды.

Создайте `apps/worker/test/redis-connection.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createRedisConnection } from '../src/redis-connection';

describe('createRedisConnection', () => {
  it('включает TLS для production rediss URL', () => {
    const connection = createRedisConnection('rediss://cache.example.com:6379');
    expect(connection.host).toBe('cache.example.com');
    expect(connection.port).toBe(6379);
    expect(connection.tls).toEqual({});
  });
});
```

Test остаётся защитой production ElastiCache connection из модуля 16.

Создайте `apps/worker/src/queues.ts`:

```ts
export const MATCH_SYNC_QUEUE = 'match-sync';
export const SYNC_RECENT_PRO_MATCHES = 'sync-recent-pro-matches';

export type SyncRecentProMatchesJob = {
  trigger: 'scheduled' | 'manual';
  requestedAt?: string;
};
```

Строковые constants устраняют незаметную опечатку между producer и consumer. `trigger` отличает регулярный импорт от ручного; реальное время постановки BullMQ уже хранит в `job.timestamp`, а `requestedAt` нужен ручной команде и поэтому optional.

## 3. Идемпотентное сохранение

Создайте `apps/worker/src/save-imported-match.ts`:

```ts
import type { Prisma, PrismaClient } from '@dota/database';
import type { ImportedProMatch, ImportedTeam } from '@dota/ingestion';

async function upsertTeam(
  prisma: Prisma.TransactionClient,
  team: ImportedTeam | null,
) {
  if (!team) return null;

  return prisma.team.upsert({
    where: { providerId: team.providerId },
    create: {
      providerId: team.providerId,
      name: team.name,
    },
    update: {
      name: team.name,
    },
  });
}

export async function saveImportedMatch(
  prisma: PrismaClient,
  imported: ImportedProMatch,
): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const radiantTeam = await upsertTeam(transaction, imported.radiantTeam);
    const direTeam = await upsertTeam(transaction, imported.direTeam);

    const league = imported.league
      ? imported.league.providerId
        ? await transaction.league.upsert({
            where: { providerId: imported.league.providerId },
            create: imported.league,
            update: { name: imported.league.name },
          })
        : await transaction.league.upsert({
            where: { name: imported.league.name },
            create: imported.league,
            update: {},
          })
      : null;

    await transaction.match.upsert({
      where: {
        provider_providerMatchId: {
          provider: imported.provider,
          providerMatchId: imported.providerMatchId,
        },
      },
      create: {
        provider: imported.provider,
        providerMatchId: imported.providerMatchId,
        startTime: imported.startTime,
        durationSeconds: imported.durationSeconds,
        radiantScore: imported.radiantScore,
        direScore: imported.direScore,
        winner: imported.winner,
        radiantTeamId: radiantTeam?.id,
        direTeamId: direTeam?.id,
        leagueId: league?.id,
      },
      update: {
        durationSeconds: imported.durationSeconds,
        radiantScore: imported.radiantScore,
        direScore: imported.direScore,
        winner: imported.winner,
        radiantTeamId: radiantTeam?.id,
        direTeamId: direTeam?.id,
        leagueId: league?.id,
      },
    });
  });
}
```

- `imported` — одна нормализованная команда сохранения.
- `transaction` — Prisma client, чьи операции либо применятся вместе, либо все откатятся.
- `radiantTeam`, `direTeam`, `league` — сохранённые relation rows.
- `upsert` = update existing or insert new. Повтор job обновляет тот же матч благодаря составному unique.
- `provider_providerMatchId` — имя compound unique, сгенерированное Prisma.

## 4. Consumer и scheduler

Создайте `apps/worker/src/main.ts`:

```ts
import { createPostgresAdapter, PrismaClient } from '@dota/database';
import { OpenDotaProvider } from '@dota/ingestion';
import { Queue, Worker } from 'bullmq';
import { workerEnv } from './config';
import {
  MATCH_SYNC_QUEUE,
  SYNC_RECENT_PRO_MATCHES,
  type SyncRecentProMatchesJob,
} from './queues';
import { createRedisConnection } from './redis-connection';
import { saveImportedMatch } from './save-imported-match';

async function main(): Promise<void> {
const redis = createRedisConnection(workerEnv.REDIS_URL);
const prisma = new PrismaClient({
  adapter: createPostgresAdapter(workerEnv.DATABASE_URL),
});
const provider = new OpenDotaProvider(workerEnv.OPENDOTA_BASE_URL);
const queue = new Queue<SyncRecentProMatchesJob>(MATCH_SYNC_QUEUE, {
  connection: redis,
});

const worker = new Worker<SyncRecentProMatchesJob>(
  MATCH_SYNC_QUEUE,
  async (job) => {
    if (job.name !== SYNC_RECENT_PRO_MATCHES) return;
    const matches = await provider.listRecentProMatches();
    for (const match of matches) {
      await saveImportedMatch(prisma, match);
    }
  },
  {
    connection: redis,
    concurrency: 2,
  },
);

await queue.upsertJobScheduler(
  'recent-pro-matches-every-five-minutes',
  { every: 5 * 60 * 1_000 },
  {
    name: SYNC_RECENT_PRO_MATCHES,
    data: { trigger: 'scheduled' },
    opts: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  },
);

async function shutdown(): Promise<void> {
  await worker.close();
  await queue.close();
  await prisma.$disconnect();
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

Разбор:

- `redis` — проверенные поля соединения BullMQ; helper разбирает локальный `redis://` или production `rediss://` и включает TLS только для `rediss:`.
- `prisma`, `provider`, `queue`, `worker` существуют весь срок жизни процесса.
- callback `async (job)` — обработчик одной задачи.
- `matches` — полученная партия; `match` — текущий элемент.
- `for...of` сознательно сохраняет последовательно: на первом этапе это бережнее к маленькой базе. Позже concurrency меняется по метрикам.
- `upsertJobScheduler` не создаёт второй scheduler с тем же ID после перезапуска.
- `every` в миллисекундах: 5 минут × 60 секунд × 1000.
- `attempts` и exponential backoff переживают временную ошибку сети.
- `shutdown` не бросает незавершённый job при остановке ECS.

Добавьте root script:

```json
"dev:worker": "pnpm --filter @dota/worker dev"
```

## 5. Ваша аналогичная задача: ручная постановка sync job

Production нужна управляемая команда для первой загрузки и диагностики. Создайте `apps/worker/src/enqueue-once.ts`.

Требования:

1. Импортировать `Queue`, config и constants.
2. Создать переменную `queue` для `MATCH_SYNC_QUEUE`.
3. Добавить job с именем `SYNC_RECENT_PRO_MATCHES`.
4. Передать `trigger: 'manual'` и `requestedAt: new Date().toISOString()`.
5. Задать `jobId: 'manual-' + Date.now()` и `attempts: 5`.
6. Закрыть queue.

Эталон:

```ts
import { Queue } from 'bullmq';
import { workerEnv } from './config';
import {
  MATCH_SYNC_QUEUE,
  SYNC_RECENT_PRO_MATCHES,
  type SyncRecentProMatchesJob,
} from './queues';
import { createRedisConnection } from './redis-connection';

async function main(): Promise<void> {
const queue = new Queue<SyncRecentProMatchesJob>(MATCH_SYNC_QUEUE, {
  connection: createRedisConnection(workerEnv.REDIS_URL),
});

await queue.add(
  SYNC_RECENT_PRO_MATCHES,
  { trigger: 'manual', requestedAt: new Date().toISOString() },
  { jobId: `manual-${Date.now()}`, attempts: 5 },
);

await queue.close();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

Добавьте script `"sync:once": "tsx src/enqueue-once.ts"`. Это будет настоящая operational-команда, а не одноразовый учебный файл.

## 6. Проверка и commit

Запустите API и worker в двух терминалах:

```powershell
docker compose up -d
pnpm dev:worker
pnpm --filter @dota/worker sync:once
pnpm dev:api
Invoke-RestMethod http://localhost:3000/v1/matches
```

Повторите `sync:once`. Число строк не должно удвоиться. Затем:

```powershell
pnpm -r typecheck
pnpm -r test
git add apps packages package.json pnpm-lock.yaml
git commit -m "feat(worker): import professional matches idempotently"
```

Если внешний provider временно недоступен, проверьте job в failed/retry, но не отключайте validation или unique constraint ради зелёного запуска.

[Следующий модуль](07-teams-players-tournaments.md)
