# Модуль 7. Команды, игроки, турниры и полный состав матча

## Результат

Приложение перестанет показывать только счёт. Worker дополнит каждый матч десятью участниками и героями, а API отдаст списки и карточки команд, игроков и турниров. Все эти данные нужны будущим экранам mobile и расчёту меты.

## 1. Дополнить публичные контракты

В `packages/contracts/src/players.ts` создайте:

```ts
import { z } from 'zod';

export const PlayerSummarySchema = z.object({
  id: z.string().min(1),
  nickname: z.string().min(1),
  realName: z.string().min(1).nullable(),
  team: z
    .object({
      id: z.string().min(1),
      name: z.string().min(1),
    })
    .nullable(),
});

export const PlayerListSchema = z.array(PlayerSummarySchema);
export type PlayerSummary = z.infer<typeof PlayerSummarySchema>;
```

В `packages/contracts/src/tournaments.ts`:

```ts
import { z } from 'zod';

export const TournamentSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  latestMatchAt: z.string().datetime().nullable(),
  matchCount: z.number().int().nonnegative(),
});

export const TournamentListSchema = z.array(TournamentSummarySchema);
export type TournamentSummary = z.infer<typeof TournamentSummarySchema>;
```

Экспортируйте оба файла из `index.ts`.

В публичном интерфейсе используем слово `tournament`, знакомое пользователю. В таблице пока остаётся `League`, потому что именно league ID отдаёт источник. Это осознанный mapping, а не случайное несовпадение.

## 2. Получать подробности матча

Endpoint последних pro matches обычно не содержит полный draft. Расширьте `packages/ingestion/src/data-provider.ts`:

```ts
export type ImportedParticipant = {
  slot: number;
  side: 'radiant' | 'dire';
  heroId: number;
  player: {
    providerId: string | null;
    steamId: string | null;
    nickname: string;
  } | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  isWinner: boolean | null;
};

export type ImportedMatchDetails = {
  providerMatchId: string;
  patch: string | null;
  participants: ImportedParticipant[];
};

export interface DataProvider {
  listRecentProMatches(): Promise<ImportedProMatch[]>;
  getMatchDetails(providerMatchId: string): Promise<ImportedMatchDetails>;
  listHeroes(): Promise<ImportedHero[]>;
}
```

Добавьте в `open-dota.schemas.ts` только реально используемые поля:

```ts
export const openDotaPlayerSchema = z.object({
  player_slot: z.number().int().nonnegative(),
  hero_id: z.number().int().positive(),
  account_id: z.number().int().nonnegative().nullable().optional(),
  personaname: z.string().nullable().optional(),
  kills: z.number().int().nonnegative().nullable().optional(),
  deaths: z.number().int().nonnegative().nullable().optional(),
  assists: z.number().int().nonnegative().nullable().optional(),
  win: z.number().int().min(0).max(1).nullable().optional(),
});

export const openDotaMatchDetailsSchema = z.object({
  match_id: z.number().int().positive(),
  patch: z.number().int().positive().nullable().optional(),
  players: z.array(openDotaPlayerSchema).length(10),
});
```

Затем реализуйте `OpenDotaProvider.getMatchDetails` тем же способом, что `listRecentProMatches`: `fetch`, timeout, проверка `response.ok`, `json: unknown`, Zod parse. Mapping participants:

```ts
const details = openDotaMatchDetailsSchema.parse(json);

return {
  providerMatchId: String(details.match_id),
  patch: details.patch ? String(details.patch) : null,
  participants: details.players.map((player) => {
    const side = player.player_slot < 128 ? 'radiant' : 'dire';
    const won = player.win === 1 ? true : player.win === 0 ? false : null;

    return {
      slot: player.player_slot,
      side,
      heroId: player.hero_id,
      player: player.account_id
        ? {
            providerId: String(player.account_id),
            steamId: (
              BigInt(player.account_id) + 76_561_197_960_265_728n
            ).toString(),
            nickname: player.personaname ?? `Player ${player.account_id}`,
          }
        : null,
      kills: player.kills ?? null,
      deaths: player.deaths ?? null,
      assists: player.assists ?? null,
      isWinner: won,
    };
  }),
};
```

- `player` — один внешний участник.
- `side` вычисляется из формата player slot источника и затем хранится в нашей форме.
- `won` сохраняет три состояния: победил, проиграл, неизвестно.
- `76_561_197_960_265_728n` — основание SteamID64; сложение выполняется как `BigInt`, чтобы не потерять точность.
- Анонимный участник имеет `player: null`, но его герой и статистика всё равно полезны.
- `nickname` fallback не притворяется реальным именем, а даёт стабильный видимый текст.

## 3. Отдельная job для подробностей

В `queues.ts` добавьте:

```ts
export const HYDRATE_MATCH_DETAILS = 'hydrate-match-details';

export type HydrateMatchDetailsJob = {
  providerMatchId: string;
};
```

Импортируйте `z` из `zod`, затем добавьте schemas для job data и общий type:

```ts
export const syncRecentProMatchesJobSchema = z.object({
  trigger: z.enum(['scheduled', 'manual']),
  requestedAt: z.string().datetime().optional(),
});

export const hydrateMatchDetailsJobSchema = z.object({
  providerMatchId: z.string().min(1),
});

export type MatchSyncJob =
  | SyncRecentProMatchesJob
  | HydrateMatchDetailsJob;
```

Замените generic queue/worker на `Queue<MatchSyncJob>` и `Worker<MatchSyncJob>`, а callback — на два реальных branch:

```ts
async (job) => {
  if (job.name === SYNC_RECENT_PRO_MATCHES) {
    syncRecentProMatchesJobSchema.parse(job.data);
    const matches = await provider.listRecentProMatches();
    for (const match of matches) {
      await saveImportedMatch(prisma, match);
      const storedMatch = await prisma.match.findUniqueOrThrow({
        where: {
          provider_providerMatchId: {
            provider: match.provider,
            providerMatchId: match.providerMatchId,
          },
        },
        select: { _count: { select: { participants: true } } },
      });
      if (storedMatch._count.participants === 10) continue;

      await queue.add(
        HYDRATE_MATCH_DETAILS,
        { providerMatchId: match.providerMatchId },
        {
          jobId: `opendota-${match.providerMatchId}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    }
    return;
  }

  if (job.name === HYDRATE_MATCH_DETAILS) {
    const data = hydrateMatchDetailsJobSchema.parse(job.data);
    const details = await provider.getMatchDetails(data.providerMatchId);
    await saveMatchDetails(prisma, details);
  }
}
```

`storedMatch` читает только число участников. Уже полный матч не тратит provider limit повторно; failed job после своих retry удаляется и может быть поставлена следующим sync. `data` — проверенное содержимое detail job; `details` — проверенный ответ provider. `return` после list branch не даёт случайно продолжить обработку другой ветки.

Создайте `apps/worker/src/save-match-details.ts`:

```ts
import type { PrismaClient } from '@dota/database';
import type { ImportedMatchDetails } from '@dota/ingestion';

export async function saveMatchDetails(
  prisma: PrismaClient,
  details: ImportedMatchDetails,
): Promise<void> {
  const match = await prisma.match.findUniqueOrThrow({
    where: {
      provider_providerMatchId: {
        provider: 'opendota',
        providerMatchId: details.providerMatchId,
      },
    },
  });

  await prisma.$transaction(async (transaction) => {
    await transaction.match.update({
      where: { id: match.id },
      data: { patch: details.patch },
    });

    for (const participant of details.participants) {
      const participantTeamId =
        participant.side === 'radiant'
          ? match.radiantTeamId
          : match.direTeamId;
      const player = participant.player?.providerId
        ? await transaction.player.upsert({
            where: { providerId: participant.player.providerId },
            create: {
              providerId: participant.player.providerId,
              steamId: participant.player.steamId,
              nickname: participant.player.nickname,
              teamId: participantTeamId,
            },
            update: {
              nickname: participant.player.nickname,
              teamId: participantTeamId,
            },
          })
        : null;

      await transaction.hero.upsert({
        where: { id: participant.heroId },
        create: {
          id: participant.heroId,
          name: `npc_dota_hero_${participant.heroId}`,
          localizedName: `Hero ${participant.heroId}`,
        },
        update: {},
      });

      await transaction.matchPlayer.upsert({
        where: {
          matchId_slot: { matchId: match.id, slot: participant.slot },
        },
        create: {
          matchId: match.id,
          playerId: player?.id,
          heroId: participant.heroId,
          slot: participant.slot,
          side: participant.side === 'radiant' ? 'RADIANT' : 'DIRE',
          kills: participant.kills,
          deaths: participant.deaths,
          assists: participant.assists,
          isWinner: participant.isWinner,
        },
        update: {
          playerId: player?.id,
          heroId: participant.heroId,
          side: participant.side === 'radiant' ? 'RADIANT' : 'DIRE',
          kills: participant.kills,
          deaths: participant.deaths,
          assists: participant.assists,
          isWinner: participant.isWinner,
        },
      });
    }
  });
}
```

`match` находит нашу внутреннюю запись. `participant` — текущий из десяти. `player` может быть `null`, но `MatchPlayer` всё равно создаётся. Hero placeholder нужен только пока не загружен справочник; он останется fallback для нового ID, а отдельная справочная sync-job обновит имя.

## 4. Справочник настоящих имён героев

Placeholder `Hero 1` защищает foreign key во время первого импорта, но не годится для интерфейса. Добавьте в `data-provider.ts`:

```ts
export type ImportedHero = {
  id: number;
  name: string;
  localizedName: string;
};
```

Проверьте ответ `/api/constants/heroes`:

```ts
const openDotaHeroSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  localized_name: z.string().min(1),
});

const openDotaHeroesSchema = z.record(z.string(), openDotaHeroSchema);
```

Реализуйте `OpenDotaProvider.listHeroes` тем же проверенным `fetch` helper, что используется для матчей:

```ts
const heroesById = openDotaHeroesSchema.parse(json);
return Object.values(heroesById).map((hero) => ({
  id: hero.id,
  name: hero.name,
  localizedName: hero.localized_name,
}));
```

`heroesById` — объект источника, ключи которого нам не нужны; `Object.values` возвращает реальные записи. `hero` — одна запись, преобразуемая в нашу форму.

Добавьте в `queues.ts` job и замените ранее объявленный `MatchSyncJob` union версией с третьим type:

```ts
export const SYNC_HEROES = 'sync-heroes';
export const syncHeroesJobSchema = z.object({
  trigger: z.enum(['startup', 'scheduled']),
});
export type SyncHeroesJob = z.infer<typeof syncHeroesJobSchema>;

export type MatchSyncJob =
  | SyncRecentProMatchesJob
  | HydrateMatchDetailsJob
  | SyncHeroesJob;
```

В callback worker добавьте третий branch. Handler:

```ts
const heroes = await provider.listHeroes();
for (const hero of heroes) {
  await prisma.hero.upsert({
    where: { id: hero.id },
    create: hero,
    update: {
      name: hero.name,
      localizedName: hero.localizedName,
    },
  });
}
```

Перед handler вызовите `syncHeroesJobSchema.parse(job.data)`. Scheduler:

```ts
await queue.upsertJobScheduler(
  'heroes-every-day',
  { every: 24 * 60 * 60 * 1_000 },
  { name: SYNC_HEROES, data: { trigger: 'scheduled' } },
);

const startupDay = new Date().toISOString().slice(0, 10);
await queue.add(
  SYNC_HEROES,
  { trigger: 'startup' },
  { jobId: `heroes-startup-${startupDay}`, removeOnComplete: true },
);
```

`startupDay` даёт максимум одну стартовую sync в день даже при двух production workers.

После этой job уже импортированные placeholders тоже получают правильные названия. Добавьте test: hero с тем же ID меняет `localizedName`, а число строк остаётся 1.

## 5. Настоящий Teams feature

Расширьте созданный ранее `TeamsRepository`:

```ts
export interface TeamsRepository {
  list(limit: number): Promise<TeamSummary[]>;
  findById(id: string): Promise<TeamSummary | null>;
}
```

В `PrismaTeamsRepository` добавьте:

```ts
async list(limit: number): Promise<TeamSummary[]> {
  const teams = await this.prisma.team.findMany({
    take: limit,
    orderBy: { name: 'asc' },
  });

  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    tag: team.tag,
    logoUrl: team.logoUrl,
    countryCode: team.countryCode,
  }));
}
```

Создайте `teams.service.ts`:

```ts
@Injectable()
export class TeamsService {
  constructor(
    @Inject(TEAMS_REPOSITORY)
    private readonly teamsRepository: TeamsRepository,
  ) {}

  list(): Promise<TeamSummary[]> {
    return this.teamsRepository.list(100);
  }

  async findById(id: string): Promise<TeamSummary> {
    const team = await this.teamsRepository.findById(id);
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }
}
```

Создайте `teams.controller.ts`:

```ts
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  list(): Promise<TeamSummary[]> {
    return this.teamsService.list();
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<TeamSummary> {
    return this.teamsService.findById(id);
  }
}
```

Добавьте обычный `TeamsModule` с controller, service и binding token → `PrismaTeamsRepository`; импортируйте в `AppModule`.

`id` приходит из сегмента URL. Service отвечает за 404, repository — только за базу, controller — за HTTP. Не смешивайте эти обязанности.

## 6. Турниры как агрегат над League

Создайте `TournamentsRepository.list`. Реализация использует relation count и последнюю игру:

```ts
const leagues = await this.prisma.league.findMany({
  orderBy: { name: 'asc' },
  include: {
    _count: { select: { matches: true } },
    matches: {
      take: 1,
      orderBy: { startTime: 'desc' },
      select: { startTime: true },
    },
  },
});

return leagues.map((league) => ({
  id: league.id,
  name: league.name,
  latestMatchAt: league.matches[0]?.startTime.toISOString() ?? null,
  matchCount: league._count.matches,
}));
```

`_count` считает связанные матчи в БД. `matches[0]` существует только если турнир уже имеет матч, поэтому optional chaining обязателен.

## 7. Ваша аналогичная задача: Players feature

По образцу Teams создайте четыре файла в `apps/api/src/players`:

- `players.repository.ts` с token `PLAYERS_REPOSITORY` и `findById(id)`;
- `prisma-players.repository.ts`;
- `players.service.ts`, который выдаёт 404;
- `players.controller.ts` с `GET /players/:id`;
- `players.module.ts` и его импорт в `AppModule`.

Ключевой Prisma-запрос:

```ts
const player = await this.prisma.player.findUnique({
  where: { id },
  include: { team: true },
});
```

Эталон mapping:

```ts
if (!player) return null;

return {
  id: player.id,
  nickname: player.nickname,
  realName: player.realName,
  team: player.team
    ? { id: player.team.id, name: player.team.name }
    : null,
};
```

Имена и роли должны повторять Teams feature. Это намеренное повторение архитектурного шаблона, который реально поддерживает проект.

## 8. Проверка и commit

```powershell
pnpm --filter @dota/worker sync:once
pnpm -r test
pnpm -r typecheck
Invoke-RestMethod http://localhost:3000/v1/teams
Invoke-RestMethod http://localhost:3000/v1/tournaments
Invoke-RestMethod http://localhost:3000/v1/players/<реальный-id>
git add apps packages
git commit -m "feat(domain): add teams players tournaments and match participants"
```

Откройте Prisma Studio и убедитесь: у hydrated match ровно 10 `MatchPlayer`, повтор job не создаёт ещё 10, а API возвращает 404 для неизвестного ID.

[Следующий модуль](08-meta-analytics.md)
