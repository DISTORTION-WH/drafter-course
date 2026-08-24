# Модуль 12. Экран меты, поиск и сравнение игроков

## Результат

Пользователь сможет фильтровать мету по периоду и patch, искать команду/игрока/турнир по одному запросу и сравнить двух профессиональных игроков. Все три функции используют существующую базу — нового хранилища пока не нужно.

## 1. Единый контракт поиска

Создайте `packages/contracts/src/search.ts`:

```ts
import { z } from 'zod';

export const SearchItemSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('team'),
    id: z.string(),
    title: z.string(),
    subtitle: z.string().nullable(),
  }),
  z.object({
    kind: z.literal('player'),
    id: z.string(),
    title: z.string(),
    subtitle: z.string().nullable(),
  }),
  z.object({
    kind: z.literal('tournament'),
    id: z.string(),
    title: z.string(),
    subtitle: z.string().nullable(),
  }),
]);

export const SearchResponseSchema = z.object({
  query: z.string(),
  items: z.array(SearchItemSchema).max(30),
});

export type SearchItem = z.infer<typeof SearchItemSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
```

`kind` — discriminator. После `if (item.kind === 'player')` TypeScript точно знает форму item и route назначения. `title/subtitle` дают экрану общий renderer без потери entity type.

## 2. Search endpoint

Создайте `apps/api/src/search/search.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import type { SearchItem, SearchResponse } from '@dota/contracts';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string): Promise<SearchResponse> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      return { query: normalizedQuery, items: [] };
    }

    const [teams, players, tournaments] = await Promise.all([
      this.prisma.team.findMany({
        where: { name: { contains: normalizedQuery, mode: 'insensitive' } },
        take: 10,
        orderBy: { name: 'asc' },
      }),
      this.prisma.player.findMany({
        where: { nickname: { contains: normalizedQuery, mode: 'insensitive' } },
        take: 10,
        orderBy: { nickname: 'asc' },
        include: { team: true },
      }),
      this.prisma.league.findMany({
        where: { name: { contains: normalizedQuery, mode: 'insensitive' } },
        take: 10,
        orderBy: { name: 'asc' },
      }),
    ]);

    const items: SearchItem[] = [
      ...teams.map((team) => ({
        kind: 'team' as const,
        id: team.id,
        title: team.name,
        subtitle: team.tag,
      })),
      ...players.map((player) => ({
        kind: 'player' as const,
        id: player.id,
        title: player.nickname,
        subtitle: player.team?.name ?? null,
      })),
      ...tournaments.map((tournament) => ({
        kind: 'tournament' as const,
        id: tournament.id,
        title: tournament.name,
        subtitle: null,
      })),
    ];

    return { query: normalizedQuery, items };
  }
}
```

- `normalizedQuery` — запрос без случайных пробелов.
- `Promise.all` запускает три независимых database query одновременно.
- `teams`, `players`, `tournaments` сохраняют typed results в соответствующем порядке.
- `items` приводит разные rows к одному public contract.
- `as const` не даёт TypeScript расширить `'team'` до произвольного `string`.
- Лимит 10 на тип и minimum 2 символа защищают базу от слишком широких запросов. Для первого релиза `contains` достаточно; PostgreSQL trigram index добавляется после измерения latency.

Controller проверяет query:

```ts
const searchQuerySchema = z.object({ q: z.string().max(80).default('') });

@Get()
async search(@Query() raw: unknown): Promise<SearchResponse> {
  const { q } = parseRequest(searchQuerySchema, raw);
  return SearchResponseSchema.parse(await this.searchService.search(q));
}
```

Создайте `SearchModule` и импортируйте его в `AppModule`.

## 3. Debounced search в mobile

Создайте `apps/mobile/src/shared/use-debounced-value.ts`:

```ts
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}
```

- `value` меняется при каждом символе.
- `debouncedValue` меняется только после паузы.
- `timeoutId` нужен, чтобы отменить предыдущий timer при новом символе.
- cleanup-функция `clearTimeout` предотвращает устаревший запрос.
- Generic `T` позволяет использовать hook не только со строками.

В `SearchScreen`:

```tsx
const [query, setQuery] = useState('');
const debouncedQuery = useDebouncedValue(query.trim(), 350);
const searchQuery = useQuery({
  queryKey: ['search', debouncedQuery],
  queryFn: () =>
    apiGet(`/search?q=${encodeURIComponent(debouncedQuery)}`, SearchResponseSchema),
  enabled: debouncedQuery.length >= 2,
});
```

`query` отображается в `TextInput` немедленно, `debouncedQuery` идёт в сеть после 350 ms, `searchQuery` хранит server state. При нажатии route выбирается через `switch (item.kind)`.

## 4. Экран меты

Создайте `use-hero-meta.ts`:

```ts
export type HeroMetaFilters = {
  patch: string | null;
  from: string;
  to: string;
};

export function useHeroMeta(filters: HeroMetaFilters) {
  const params = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.patch) params.set('patch', filters.patch);

  return useQuery({
    queryKey: ['meta', 'heroes', filters],
    queryFn: () => apiGet(`/meta/heroes?${params}`, HeroMetaResponseSchema),
  });
}
```

На `MetaScreen` храните один объект `filters`, покажите `sample.matchCount` и строки героев. Простейшая честная полоса pick rate:

```tsx
<View style={{ height: 8, backgroundColor: '#2b2b3d' }}>
  <View
    style={{
      height: 8,
      width: `${Math.min(hero.pickRate * 100, 100)}%`,
      backgroundColor: '#6d5dfc',
    }}
  />
</View>
<Text>
  Picks {hero.picks} · Win rate {(hero.winRate * 100).toFixed(1)}%
</Text>
```

Ширина строится из значения 0–1. `Math.min` защищает layout от ошибочного значения выше 100%, хотя schema тоже это запрещает. Counts всегда видны рядом с процентом.

## 5. Ваша аналогичная задача: сравнение игроков

Эта функция станет Pro-feature в модуле 18, поэтому реализуйте её сейчас без paywall.

Public contract `PlayerComparisonSchema`:

- `from`, `to`, `patch`;
- `left` и `right` одинаковой формы;
- для каждого: `player: PlayerSummarySchema`, `matches`, `wins`, `winRate`, `averageKills`, `averageDeaths`, `averageAssists`.

Backend route:

```text
GET /v1/compare/players?leftId=...&rightId=...&from=...&to=...&patch=...
```

Создайте одну repository function `getPlayerMetrics(playerId, filters)`. Точные local variables:

- `rows` — подходящие `MatchPlayer` records;
- `matches` — `rows.length`;
- `wins` — количество `row.isWinner === true`;
- `sumKills`, `sumDeaths`, `sumAssists` — суммы, где null считается 0;
- helper `average(sum, count)` возвращает 0 при count 0.

Эталон средней:

```ts
function average(sum: number, count: number): number {
  return count === 0 ? 0 : sum / count;
}
```

Service вызывает metrics для двух ID через `Promise.all`, но отклоняет одинаковые ID. Mobile route `compare.tsx` получает игроков через search, хранит `leftPlayer`/`rightPlayer`, затем показывает две колонки. Добавьте test: игрок без матчей получает нули, не `NaN`.

## 6. Проверка и commit

```powershell
pnpm -r typecheck
pnpm -r test
Invoke-RestMethod "http://localhost:3000/v1/search?q=spirit"
Invoke-RestMethod "http://localhost:3000/v1/compare/players?leftId=<id>&rightId=<id>&from=2026-01-01&to=2026-08-01"
git add apps packages/contracts
git commit -m "feat(discovery): add meta search and player comparison"
```

Проверьте поиск кириллицей и латиницей, отмену timer, query из одного символа, пустой результат и очень маленькую выборку меты.

[Следующий модуль](14_MODULE_13_STEAM_AUTH.md)
