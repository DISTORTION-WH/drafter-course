# Модуль 11. Карточка матча и draft

## Результат

По нажатию откроется полноценная карточка: команды, итог, patch, турнир, продолжительность и десять участников с героями и K/D/A. Route использует внутренний match ID и показывает 404 как понятное состояние.

## 1. Контракт подробностей

Добавьте в `packages/contracts/src/matches.ts`:

```ts
export const MatchParticipantSchema = z.object({
  slot: z.number().int().nonnegative(),
  side: z.enum(['radiant', 'dire']),
  hero: z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
  }),
  player: z
    .object({
      id: z.string().min(1),
      nickname: z.string().min(1),
    })
    .nullable(),
  kills: z.number().int().nonnegative().nullable(),
  deaths: z.number().int().nonnegative().nullable(),
  assists: z.number().int().nonnegative().nullable(),
});

export const MatchDetailsSchema = MatchSummarySchema.extend({
  patch: z.string().nullable(),
  participants: z.array(MatchParticipantSchema).max(10),
});

export type MatchParticipant = z.infer<typeof MatchParticipantSchema>;
export type MatchDetails = z.infer<typeof MatchDetailsSchema>;
```

`extend` не копирует восемь полей summary вручную. `max(10)`, а не `length(10)`, позволяет показать частично импортированный старый матч, но worker test всё равно требует 10 для новой полной записи.

## 2. Repository query

Расширьте `MatchesRepository`:

```ts
findById(id: string): Promise<MatchDetails | null>;
```

В `PrismaMatchesRepository` добавьте:

```ts
async findById(id: string): Promise<MatchDetails | null> {
  const match = await this.prisma.match.findUnique({
    where: { id },
    include: {
      radiantTeam: true,
      direTeam: true,
      league: true,
      participants: {
        orderBy: { slot: 'asc' },
        include: { hero: true, player: true },
      },
    },
  });

  if (!match) return null;

  return {
    id: match.id,
    startTime: match.startTime.toISOString(),
    durationSeconds: match.durationSeconds,
    leagueName: match.league?.name ?? null,
    radiant: {
      id: match.radiantTeam?.id ?? null,
      name: match.radiantTeam?.name ?? 'Unknown Radiant',
      score: match.radiantScore,
    },
    dire: {
      id: match.direTeam?.id ?? null,
      name: match.direTeam?.name ?? 'Unknown Dire',
      score: match.direScore,
    },
    winner: mapWinner(match.winner),
    patch: match.patch,
    participants: match.participants.map((participant) => ({
      slot: participant.slot,
      side: participant.side === 'RADIANT' ? 'radiant' : 'dire',
      hero: {
        id: participant.hero.id,
        name: participant.hero.localizedName,
      },
      player: participant.player
        ? { id: participant.player.id, nickname: participant.player.nickname }
        : null,
      kills: participant.kills,
      deaths: participant.deaths,
      assists: participant.assists,
    })),
  };
}
```

Поле `participants` в Prisma result и поле ответа называются одинаково, но mapping нужен: relation содержит database columns, response — только разрешённые public fields.

В service:

```ts
async findById(id: string): Promise<MatchDetails> {
  const match = await this.matchesRepository.findById(id);
  if (!match) throw new NotFoundException('Match not found');
  return match;
}
```

В controller:

```ts
@Get(':id')
async findById(@Param('id') id: string): Promise<MatchDetails> {
  const match = await this.matchesService.findById(id);
  return MatchDetailsSchema.parse(match);
}
```

Важно: route `@Get(':id')` объявляйте после более конкретных routes вроде `@Get('live')`, иначе слово `live` может быть принято за ID.

## 3. Hook details с отдельным cache key

Теперь, когда detail endpoint существует, обновите `MatchCard`: верните `Pressable`, добавьте в `MatchCardProps` функцию `onPress: () => void` и назначьте её prop `onPress`. В `MatchesScreen` добавьте:

```tsx
function openMatch(matchId: string): void {
  router.push(`/matches/${matchId}`);
}

// внутри renderItem
<MatchCard match={item} onPress={() => openMatch(item.id)} />
```

`matchId` — единственные данные, нужные navigation. Функция и prop останутся в итоговом приложении; до появления рабочего route их намеренно не создавали.

Создайте `apps/mobile/src/features/matches/use-match.ts`:

```ts
import { MatchDetailsSchema } from '@dota/contracts';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../api/api-client';

export function useMatch(matchId: string) {
  return useQuery({
    queryKey: ['matches', 'details', matchId],
    queryFn: () => apiGet(`/matches/${encodeURIComponent(matchId)}`, MatchDetailsSchema),
    enabled: matchId.length > 0,
  });
}
```

- `matchId` — динамический route parameter.
- Он входит в key, поэтому две карточки не делят один cache result.
- `encodeURIComponent` не даёт ID изменить структуру URL.
- `enabled` запрещает запрос до появления parameter.

## 4. Участник draft

Создайте `participant-row.tsx`:

```tsx
import type { MatchParticipant } from '@dota/contracts';
import { StyleSheet, Text, View } from 'react-native';

export function ParticipantRow({ participant }: { participant: MatchParticipant }) {
  const kda = [participant.kills, participant.deaths, participant.assists]
    .map((value) => value ?? '—')
    .join(' / ');

  return (
    <View style={styles.row}>
      <View style={styles.identity}>
        <Text style={styles.hero}>{participant.hero.name}</Text>
        <Text>{participant.player?.nickname ?? 'Anonymous'}</Text>
      </View>
      <Text>{kda}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  identity: { flex: 1 },
  hero: { fontWeight: '700' },
});
```

`kda` собирается из реальных трёх полей. `value` по очереди равен kills/deaths/assists; `join` создаёт единое отображение.

## 5. Route карточки

Замените `app/matches/[matchId].tsx`:

```tsx
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { ParticipantRow } from '../../src/features/matches/participant-row';
import { useMatch } from '../../src/features/matches/use-match';

export default function MatchDetailsScreen() {
  const params = useLocalSearchParams<{ matchId: string }>();
  const matchId = typeof params.matchId === 'string' ? params.matchId : '';
  const matchQuery = useMatch(matchId);

  if (matchQuery.isPending) return <ActivityIndicator />;
  if (matchQuery.isError) return <Text>Матч не найден или backend недоступен</Text>;

  const match = matchQuery.data;
  const radiant = match.participants.filter((item) => item.side === 'radiant');
  const dire = match.participants.filter((item) => item.side === 'dire');

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text>{match.leagueName ?? 'Турнир не указан'}</Text>
      <Text>{match.radiant.name} {match.radiant.score ?? '—'}</Text>
      <Text>{match.dire.name} {match.dire.score ?? '—'}</Text>
      <Text>Патч: {match.patch ?? 'не определён'}</Text>
      <View>
        <Text>Radiant</Text>
        {radiant.map((participant) => (
          <ParticipantRow key={participant.slot} participant={participant} />
        ))}
      </View>
      <View>
        <Text>Dire</Text>
        {dire.map((participant) => (
          <ParticipantRow key={participant.slot} participant={participant} />
        ))}
      </View>
    </ScrollView>
  );
}
```

`params` может прийти не в ожидаемой форме, поэтому из него отдельно строится `matchId`. `match` объявляется только после loading/error guards. `radiant` и `dire` — два реально отображаемых массива.

## 6. Ваша аналогичная задача: карточка команды

Создайте public `TeamDetailsSchema`, расширив `TeamSummarySchema`:

- `recentForm`: массив объектов из задания модуля 8;
- `players`: массив `PlayerSummarySchema`;
- `recentMatches`: массив `MatchSummarySchema`, максимум 10.

Затем:

1. Добавьте repository method `findDetailsById` с Prisma include игроков и двух выборок матчей.
2. Добавьте `GET /teams/:id/details` перед `GET /teams/:id` или используйте единый details endpoint.
3. Создайте `useTeam(teamId)` с key `['teams', 'details', teamId]`.
4. Создайте route `app/teams/[teamId].tsx` и добавьте `onPress` в существующий `TeamCard` по точному образцу `MatchCard`.
5. Покажите name/tag, roster, последние W/L и последние матчи.

Точные переменные экрана: `params`, `teamId`, `teamQuery`, `team`. Для roster key используйте `player.id`; для match — `match.id`. Повторите guards loading/error до чтения `.data`.

## 7. Проверка и commit

```powershell
pnpm -r typecheck
pnpm -r test
pnpm --filter @dota/mobile start
git add apps packages/contracts
git commit -m "feat(matches): add match and team detail views"
```

Проверьте матч с десятью участниками, старый частично imported матч, анонимного игрока, неизвестный ID и очень длинные nickname/hero names.

[Следующий модуль](13_MODULE_12_META_SEARCH_COMPARE.md)
