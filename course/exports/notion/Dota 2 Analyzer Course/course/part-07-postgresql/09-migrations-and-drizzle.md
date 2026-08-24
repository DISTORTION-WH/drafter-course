# Глава 9. Миграции и Drizzle

[← Глава 8](08-transactions-and-upsert.md) · [Оглавление](README.md) · [Глава 10 →](10-final-database-lab.md)

## Миграция — версия структуры

Ручное изменение одной локальной database нельзя воспроизвести в test/staging/production. Миграция — tracked файл с упорядоченным изменением schema.

```text
drizzle/
├─ 0000_initial.sql
├─ 0001_add_match_patch.sql
└─ meta/...
```

Не редактируйте уже применённую production migration. Добавьте следующую.

## Зачем Drizzle, если SQL всё равно нужен

Drizzle даёт TypeScript schema, typed query builder и migration tooling. Он не отменяет SQL, plans, indexes, transactions и constraints. Для сложной аналитики raw SQL остаётся нормальным инструментом.

## Установка

Сверьте актуальный PostgreSQL driver в [официальном руководстве Drizzle](https://orm.drizzle.team/docs/get-started-postgresql). Типовой вариант:

```powershell
pnpm add drizzle-orm pg
pnpm add -D drizzle-kit @types/pg
```

Не копируйте номер версии из курса через годы. Зафиксируйте реально установленное в `pnpm-lock.yaml` и обновляйте отдельным PR.

## Фрагмент schema

`src/database/schema.ts`:

```ts
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const heroes = pgTable('heroes', {
  id: integer('id').primaryKey(),
  machineName: text('machine_name').notNull().unique(),
  displayName: text('display_name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const matches = pgTable(
  'matches',
  {
    // Internal bigint identity добавьте по актуальному API Drizzle.
    provider: text('provider').notNull(),
    providerMatchId: text('provider_match_id').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
  },
  (table) => [
    unique('matches_provider_identity').on(table.provider, table.providerMatchId),
    check('matches_duration_non_negative', sql`${table.durationSeconds} >= 0`),
  ],
);
```

API Drizzle развивается; если signature из актуальной официальной документации отличается, следуйте текущему migration guide. SQL-инвариант остаётся тем же.

## Config

`drizzle.config.ts` не должен содержать пароль литералом:

```ts
import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  dbCredentials: { url },
});
```

## Generate, inspect, apply

```powershell
pnpm drizzle-kit generate
```

Всегда прочитайте generated SQL. Затем примените migration командой проекта. Для production `push` напрямую в schema не заменяет reviewed migrations.

Workflow:

```text
изменить TypeScript schema
→ generate migration
→ прочитать SQL
→ применить к пустой test DB
→ применить к копии realistic DB
→ запустить tests
→ commit schema + migration вместе
```

## Опасные изменения

`DROP COLUMN`, изменение типа и `NOT NULL` на заполненной таблице могут потерять данные или долго блокировать. Безопасный expand/contract:

1. добавить nullable новый столбец;
2. deploy код, который пишет оба;
3. backfill малыми batches;
4. проверить `NULL`;
5. добавить constraint;
6. переключить чтение;
7. позже удалить старое.

## Практика

Сделайте две миграции: initial schema и добавление `patch_id`. Поднимите чистую database и примените обе с нуля. Затем сравните `\d` с ожидаемой схемой.

## Самопроверка

- [ ] Schema и migration закоммичены вместе.
- [ ] Generated SQL прочитан.
- [ ] Migration работает на пустой БД.
- [ ] Production не зависит от ручного `ALTER TABLE`.
- [ ] Drizzle не заменяет знание SQL.
