# Модуль 5. Получаем матчи через изолированный data provider

## Результат

Worker сможет запросить профессиональные матчи у OpenDota, проверить неизвестный JSON и превратить его в собственную стабильную структуру. Ни controller, ни база не будут зависеть от названий полей внешнего API.

> OpenDota здесь — доступный учебный источник. До коммерческого запуска письменно проверьте его актуальные условия, лимиты, атрибуцию и право хранить/перепродавать производные данные. Adapter позволяет заменить источник, не переписывая приложение.

## 1. Контракт внутри ingestion

Сразу создайте окончательный workspace package, который будет использовать worker:

```text
packages/ingestion/
  package.json
  src/
    index.ts
    data-provider.ts
    opendota/
```

`packages/ingestion/package.json`:

```json
{
  "name": "@dota/ingestion",
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
    "@types/node": "^24.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  }
}
```

Создайте `packages/ingestion/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

Создайте `packages/ingestion/src/data-provider.ts`:

```ts
export type ImportedProMatch = {
  provider: 'opendota';
  providerMatchId: string;
  startTime: Date;
  durationSeconds: number | null;
  radiantScore: number | null;
  direScore: number | null;
  winner: 'RADIANT' | 'DIRE' | null;
  league: {
    providerId: string | null;
    name: string;
  } | null;
  radiantTeam: ImportedTeam | null;
  direTeam: ImportedTeam | null;
};

export type ImportedTeam = {
  providerId: string;
  name: string;
};

export interface DataProvider {
  listRecentProMatches(): Promise<ImportedProMatch[]>;
}
```

`ImportedProMatch` — команда на сохранение, а не публичный response. Здесь `Date` удобен Prisma, winner использует enum базы, а provider записан явно. `DataProvider` — минимальная возможность, нужная worker сейчас.

## 2. Проверить внешний JSON до использования

Создайте `packages/ingestion/src/opendota/open-dota.schemas.ts`:

```ts
import { z } from 'zod';

export const openDotaProMatchSchema = z.object({
  match_id: z.number().int().positive(),
  start_time: z.number().int().positive(),
  duration: z.number().int().nonnegative().nullable().optional(),
  radiant_score: z.number().int().nonnegative().nullable().optional(),
  dire_score: z.number().int().nonnegative().nullable().optional(),
  radiant_win: z.boolean().nullable().optional(),
  radiant_team_id: z.number().int().positive().nullable().optional(),
  radiant_name: z.string().nullable().optional(),
  dire_team_id: z.number().int().positive().nullable().optional(),
  dire_name: z.string().nullable().optional(),
  leagueid: z.number().int().positive().nullable().optional(),
  league_name: z.string().nullable().optional(),
});

export const openDotaProMatchesSchema = z.array(openDotaProMatchSchema);
export type OpenDotaProMatch = z.infer<typeof openDotaProMatchSchema>;
```

Названия snake_case существуют только в adapter. Весь остальной проект использует наши camelCase. `optional()` означает «ключ может отсутствовать», `nullable()` — «ключ есть, но значение null».

## 3. Mapping-функции

Создайте `packages/ingestion/src/opendota/open-dota.mapper.ts`:

```ts
import type { ImportedProMatch, ImportedTeam } from '../data-provider';
import type { OpenDotaProMatch } from './open-dota.schemas';

function mapTeam(
  id: number | null | undefined,
  name: string | null | undefined,
): ImportedTeam | null {
  if (!id || !name) return null;
  return { providerId: String(id), name };
}

export function mapOpenDotaProMatch(
  source: OpenDotaProMatch,
): ImportedProMatch {
  return {
    provider: 'opendota',
    providerMatchId: String(source.match_id),
    startTime: new Date(source.start_time * 1_000),
    durationSeconds: source.duration ?? null,
    radiantScore: source.radiant_score ?? null,
    direScore: source.dire_score ?? null,
    winner:
      source.radiant_win === true
        ? 'RADIANT'
        : source.radiant_win === false
          ? 'DIRE'
          : null,
    league:
      source.league_name
        ? {
            providerId: source.leagueid ? String(source.leagueid) : null,
            name: source.league_name,
          }
        : null,
    radiantTeam: mapTeam(source.radiant_team_id, source.radiant_name),
    direTeam: mapTeam(source.dire_team_id, source.dire_name),
  };
}
```

Разбор реальных решений:

- `source` — одна уже проверенная запись OpenDota.
- `id` и `name` — два входа `mapTeam`; без любого из них корректную команду не создать.
- `String(id)` исключает проблему больших внешних ID.
- Unix timestamp хранит секунды, JavaScript `Date` принимает миллисекунды, поэтому `* 1_000`.
- Проверка `=== true`/`=== false` сохраняет третье состояние `null`.
- `?? null` нормализует и отсутствующее поле, и `undefined` в один формат базы.
- Функции чистые: не ходят в сеть и базу, поэтому легко тестируются на сохранённых fixtures.

## 4. HTTP adapter

Создайте `packages/ingestion/src/opendota/open-dota.provider.ts`:

```ts
import type { DataProvider, ImportedProMatch } from '../data-provider';
import { mapOpenDotaProMatch } from './open-dota.mapper';
import { openDotaProMatchesSchema } from './open-dota.schemas';

export class OpenDotaProvider implements DataProvider {
  constructor(private readonly baseUrl: string) {}

  async listRecentProMatches(): Promise<ImportedProMatch[]> {
    const url = new URL('/api/proMatches', this.baseUrl);
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`OpenDota returned HTTP ${response.status}`);
    }

    const json: unknown = await response.json();
    const sourceMatches = openDotaProMatchesSchema.parse(json);
    return sourceMatches.map(mapOpenDotaProMatch);
  }
}
```

- `url` безопасно соединяет base URL и path.
- `response` содержит HTTP status, headers и body.
- `AbortSignal.timeout` прекращает зависший запрос через 10 секунд: worker сможет повторить job.
- `json: unknown` запрещает использовать внешний ответ до Zod-проверки.
- `sourceMatches` — массив с гарантированной формой.
- В mobile этого кода и API key никогда нет. Источник вызывает только backend.

`baseUrl` приходит через constructor, поэтому package не зависит от NestJS и environment конкретного процесса. Worker передаст проверенный `OPENDOTA_BASE_URL` в следующем модуле.

Создайте `packages/ingestion/src/index.ts`:

```ts
export * from './data-provider';
export * from './opendota/open-dota.mapper';
export * from './opendota/open-dota.provider';
export * from './opendota/open-dota.schemas';
```

## 5. Тест mapping

Создайте `packages/ingestion/test/open-dota.mapper.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mapOpenDotaProMatch } from '../src/opendota/open-dota.mapper';

describe('mapOpenDotaProMatch', () => {
  it('превращает Unix seconds и winner в доменные значения', () => {
    const result = mapOpenDotaProMatch({
      match_id: 123,
      start_time: 1_700_000_000,
      duration: 2400,
      radiant_win: true,
      radiant_team_id: 10,
      radiant_name: 'Radiant Test',
      dire_team_id: 20,
      dire_name: 'Dire Test',
    });

    expect(result.providerMatchId).toBe('123');
    expect(result.startTime.toISOString()).toBe('2023-11-14T22:13:20.000Z');
    expect(result.winner).toBe('RADIANT');
  });
});
```

Это fixture реального формата источника и regression test mapping, поэтому он остаётся в проекте.

## 6. Ваша аналогичная задача: mapping лиги

Сейчас mapping лиги встроен в большую функцию. Вынесите его в отдельную production-функцию `mapLeague`, потому что worker позже будет переиспользовать её при импорте турниров.

Точные требования:

- входы `id` и `name` тех же типов, что соответствующие внешние поля;
- результат `{ providerId: string | null; name: string } | null`;
- если `name` отсутствует или пустое, вернуть `null`;
- если ID отсутствует, команда всё равно сохраняется с `providerId: null`;
- `mapOpenDotaProMatch` вызывает новую функцию.

Эталон:

```ts
export function mapLeague(
  id: number | null | undefined,
  name: string | null | undefined,
): ImportedProMatch['league'] {
  if (!name) return null;
  return {
    providerId: id ? String(id) : null,
    name,
  };
}
```

Замените поле `league`:

```ts
league: mapLeague(source.leagueid, source.league_name),
```

Добавьте тест с `leagueid: undefined`, `league_name: 'The International'` и ожидайте league с `providerId: null`.

## 7. Проверка и commit

```powershell
pnpm --filter @dota/ingestion test
pnpm --filter @dota/ingestion typecheck
git add packages/ingestion pnpm-lock.yaml
git commit -m "feat(ingestion): add validated OpenDota provider adapter"
```

Не запускайте бесконечный polling в API. В следующем модуле для него появится отдельный worker с очередью и retry.

[Следующий модуль](07_MODULE_06_INGESTION_WORKER.md)
