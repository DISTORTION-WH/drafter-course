# Глава 3. Patch, окно времени и фильтры

[← Глава 2](02-core-hero-metrics.md) · [Оглавление](README.md) · [Глава 4 →](04-sample-size-and-intervals.md)

## Не смешивайте patches по умолчанию

Баланс heroes/items/map изменяется. Основной endpoint требует один patch. Cross-patch trend — отдельный use case с рядами по patch, не одна средняя.

## Patch dimension

```sql
CREATE TABLE patches (
  id text PRIMARY KEY,
  display_name text NOT NULL UNIQUE,
  released_at timestamptz NOT NULL,
  ended_at timestamptz,
  mapping_version integer NOT NULL,
  CONSTRAINT patches_valid_range CHECK (
    ended_at IS NULL OR ended_at > released_at
  )
);
```

Если provider даёт достоверный patch ID, сохраните mapping. Date ranges помогают validation/backfill, но матч около release boundary не должен переопределяться только часами без provider evidence.

## Window defaults

Клиент может не передать `from/to`; service выбирает documented default, например весь текущий patch до `now`. Чтобы cache был устойчивым, округлите effective `to` до refresh bucket или используйте materialization watermark, а response возвращает фактически применённые boundaries.

## Filter normalization

```ts
type HeroMetaFilters = {
  patchId: string;
  from: Date;
  to: Date;
  leagueId: string | null;
  teamId: string | null;
  side: 'all' | 'radiant' | 'dire';
  minimumPicks: number;
};
```

Normalize один раз:

- trim/canonical patch ID;
- parse date-time с offset;
- validate `from < to`;
- ограничить max range;
- ID strings digits;
- defaults;
- sort/limit whitelist.

Эта normalized форма используется query, cursor и cache key.

## Tournament tier

Tier должен быть историческим атрибутом tournament/league edition, а не текущим label организации. Зафиксируйте controlled vocabulary и mapping provenance. Unknown tier остаётся `unknown`, не автоматически «tier 3».

## Team filter

Матч включён, если team была стороной в этом матче. Не вычисляйте через current roster. Team identity merge/split требует mapping/audit.

## Time zones

API принимает ISO date-time с `Z`/offset и возвращает normalized UTC. Calendar labels в UI переводятся в timezone пользователя. SQL boundaries передаются `timestamptz` parameters.

## Отсутствующий patch

Match без patch не попадает в patch-specific metric. Endpoint показывает excluded counters/coverage в metadata, а quality dashboard сигнализирует рост missing mapping. Не приписывайте его «текущему patch» по умолчанию.

## Data cutoff

Поздний match может появиться после refresh. Response должен вернуть:

```json
{
  "dataCutoff": "...",
  "lastMatchStartedAt": "...",
  "computedAt": "..."
}
```

Так две выборки можно честно сравнить.

## Практика

Напишите 12 tests filter normalization: missing patch, invalid range, no offset, too large range, unknown side, team ID with letters, defaults, UTC conversion, max minimum picks.

## Самопроверка

- [ ] Один core result относится к одному patch.
- [ ] Effective filters возвращаются клиенту.
- [ ] Historical team/tier не берётся из current state.
- [ ] Missing patch исключён и измерен.
- [ ] `dataCutoff` отделён от event window.
