# Модуль 10. Экран профессиональных матчей

## Результат

Главный экран покажет реальные матчи из PostgreSQL и будет поддерживать pull-to-refresh, loading, empty и error состояния. Навигация появится только вместе с рабочей карточкой в следующем модуле.

## 1. Hook доступа к матчам

Создайте `apps/mobile/src/features/matches/use-matches.ts`:

```ts
import { MatchListSchema } from '@dota/contracts';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../api/api-client';

export const matchKeys = {
  all: ['matches'] as const,
  list: (limit: number) => ['matches', 'list', { limit }] as const,
};

export function useMatches(limit = 30) {
  return useQuery({
    queryKey: matchKeys.list(limit),
    queryFn: () => apiGet(`/matches?limit=${limit}`, MatchListSchema),
  });
}
```

- `matchKeys` централизует cache keys. При обновлении одного матча мы сможем инвалидировать `all`.
- `as const` сохраняет точные literal-типы элементов массива.
- `limit` одновременно входит в URL и key: ответы на 10 и 30 строк не смешаются.
- `useMatches` — custom hook. Экран знает, какие данные нужны, но не повторяет HTTP code.

## 2. Карточка, которая действительно используется

Создайте `apps/mobile/src/features/matches/match-card.tsx`:

```tsx
import type { MatchSummary } from '@dota/contracts';
import { StyleSheet, Text, View } from 'react-native';

type MatchCardProps = {
  match: MatchSummary;
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return `${minutes}:${restSeconds.toString().padStart(2, '0')}`;
}

export function MatchCard({ match }: MatchCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.league}>{match.leagueName ?? 'Турнир не указан'}</Text>
      <View style={styles.teamRow}>
        <Text style={styles.team}>{match.radiant.name}</Text>
        <Text>{match.radiant.score ?? '—'}</Text>
      </View>
      <View style={styles.teamRow}>
        <Text style={styles.team}>{match.dire.name}</Text>
        <Text>{match.dire.score ?? '—'}</Text>
      </View>
      <Text style={styles.meta}>{formatDuration(match.durationSeconds)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, backgroundColor: '#191927', gap: 8 },
  league: { color: '#aaa9ba', fontSize: 12 },
  teamRow: { flexDirection: 'row', justifyContent: 'space-between' },
  team: { color: '#ffffff', fontWeight: '600' },
  meta: { color: '#aaa9ba' },
});
```

- `MatchCardProps` перечисляет ровно то, что component получает снаружи.
- `match` — конкретная карточка списка.
- `minutes`, `restSeconds` — части реально отображаемой длительности.
- `padStart` превращает 5 секунд в `05`.
- `??` показывает fallback только при отсутствии значения; нулевой счёт остаётся нулём.

## 3. Главный экран

Замените `apps/mobile/app/index.tsx`:

```tsx
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { MatchCard } from '../src/features/matches/match-card';
import { useMatches } from '../src/features/matches/use-matches';

export default function MatchesScreen() {
  const matchesQuery = useMatches(30);

  if (matchesQuery.isPending) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  if (matchesQuery.isError) {
    return (
      <View style={styles.center}>
        <Text>Не удалось загрузить матчи</Text>
        <Text onPress={() => void matchesQuery.refetch()}>Повторить</Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={matchesQuery.data}
      keyExtractor={(match) => match.id}
      renderItem={({ item }) => (
        <MatchCard match={item} />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListEmptyComponent={<Text>Профессиональные матчи ещё не импортированы</Text>}
      refreshing={matchesQuery.isRefetching}
      onRefresh={() => void matchesQuery.refetch()}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  list: { padding: 16 },
});
```

### Переменные и функции экрана

- `matchesQuery` — состояние запроса целиком: data, pending, error, refreshing и refetch.
- `data` — массив для `FlatList`.
- `keyExtractor` даёт React стабильный ключ каждой строки.
- `renderItem` получает `item`; мы называем его `match` только внутри card prop.
- `refreshing` и `onRefresh` связывают жест pull-to-refresh с тем же query.
- `void` явно игнорирует возвращаемый Promise в event handler.

На этом этапе карточка ещё не нажимается: detail endpoint и настоящий route создаются вместе в следующем модуле. В репозитории не появляется временный экран-заглушка.

## 4. Ваша аналогичная задача: список команд

Создайте реальный route `app/teams.tsx`, hook `src/features/teams/use-teams.ts` и component `team-card.tsx`.

API уже имеет `GET /teams`, контракт — `TeamListSchema`.

Точные имена:

- `teamKeys.list` — `['teams', 'list']`;
- `useTeams()` вызывает `apiGet('/teams', TeamListSchema)`;
- `TeamCardProps` содержит `team: TeamSummary`;
- `TeamsScreen` хранит `teamsQuery`;
- `FlatList.keyExtractor` возвращает `team.id`;

Эталон hook:

```ts
export const teamKeys = {
  list: ['teams', 'list'] as const,
};

export function useTeams() {
  return useQuery({
    queryKey: teamKeys.list,
    queryFn: () => apiGet('/teams', TeamListSchema),
  });
}
```

`TeamCard` показывает `name`, `tag ?? 'Без тега'` и `countryCode ?? '—'`. Экран обязан иметь те же четыре состояния: loading, error с retry, empty, success. Переведите root layout на tabs `Матчи`, `Команды`, `Мета`; tabs останутся в итоговом продукте. Нажатие на команду добавляется в модуле 11 одновременно с рабочим team detail route.

## 5. Проверка и commit

```powershell
pnpm --filter @dota/mobile exec tsc --noEmit
pnpm --filter @dota/mobile start
git add apps/mobile
git commit -m "feat(mobile): show professional matches and teams"
```

Проверьте длинные названия команд, нулевой счёт, пустую базу, выключенный backend и pull-to-refresh. Экран считается готовым не только при идеальной сети.

[Следующий модуль](12_MODULE_11_MATCH_DETAILS.md)
