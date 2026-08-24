# Глава 10. Итоговая лабораторная: база матча

[← Глава 9](09-migrations-and-drizzle.md) · [Оглавление](README.md) · [Часть 8 →](../part-08-nestjs-backend/README.md)

## Цель

Создать воспроизводимую PostgreSQL schema и импортировать один проверенный матч из raw archive одной транзакцией.

## Структура

```text
practice/dota-data-pipeline/
├─ compose.yaml
├─ drizzle.config.ts
├─ drizzle/
│  └─ 0000_initial.sql
├─ src/
│  ├─ database/
│  │  ├─ client.ts
│  │  ├─ schema.ts
│  │  └─ repositories/
│  │     ├─ hero-repository.ts
│  │     └─ match-repository.ts
│  └─ import-match-cli.ts
└─ test/
   └─ database/
```

## Минимальная schema

Обязательны:

- `heroes`;
- `players`;
- `teams`;
- `matches`;
- `match_players`;
- `draft_actions`;
- все PK/FK/unique/check из глав;
- indexes для списка матчей и hero aggregations.

## Repository boundary

```ts
export type SaveMatchInput = {
  provider: string;
  providerMatchId: string;
  startTime: Date;
  durationSeconds: number;
  radiantWin: boolean;
  patchId: string | null;
  participants: readonly SaveParticipantInput[];
  draftActions: readonly SaveDraftActionInput[];
};

export interface MatchRepository {
  saveCompleteMatch(input: SaveMatchInput): Promise<{ internalMatchId: bigint }>;
}
```

Repository получает уже проверенную canonical model. Он не знает OpenDota field names и не читает CLI arguments.

## Алгоритм `saveCompleteMatch`

1. Получить connection из pool.
2. `BEGIN`.
3. Upsert справочники, которые разрешено обновлять.
4. Upsert match по `(provider, provider_match_id)` и получить internal ID.
5. Записать 10 participants по `(match_id, slot)`.
6. Записать draft actions по `(match_id, sequence)`.
7. Проверить ожидаемое число/уникальность данных.
8. `COMMIT`.
9. На любой ошибке `ROLLBACK`.
10. В `finally` release connection.

Для partial матча не притворяйтесь, что он complete; в части 9 добавим status.

## Запросы приёмки

```sql
-- Дубликаты provider identity должны отсутствовать
SELECT provider, provider_match_id, COUNT(*)
FROM matches
GROUP BY provider, provider_match_id
HAVING COUNT(*) > 1;

-- Участники по матчу
SELECT m.provider_match_id, COUNT(mp.*) AS participants
FROM matches AS m
LEFT JOIN match_players AS mp ON mp.match_id = m.id
GROUP BY m.id, m.provider_match_id;

-- Несуществующие связи невозможны из-за FK, но проверяем итог
SELECT mp.match_id
FROM match_players AS mp
LEFT JOIN matches AS m ON m.id = mp.match_id
WHERE m.id IS NULL;
```

## Integration tests

Минимум:

1. migrations применяются к пустой DB;
2. import создаёт одну match и 10 participants;
3. повторный import не создаёт дубликаты;
4. invalid participant откатывает весь match;
5. unknown player допустим;
6. unknown hero нарушает FK;
7. query списка сортируется стабильно;
8. query hero games/wins даёт ожидаемые counters.

Тестовая database должна быть отдельной. Не запускайте truncate/drop против URL, пока не проверили имя/host и явный test marker.

## Команды проверки

```powershell
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate
pnpm typecheck
pnpm test
pnpm import:match -- data/raw/<ваш-файл>.json
docker compose exec postgres psql -U dota_app -d dota_analyzer
```

Названия scripts вы добавляете в `package.json`; конкретная команда migrate должна соответствовать выбранному официальному Drizzle workflow.

## Commit plan

```text
chore(db): add local PostgreSQL service
feat(db): add initial relational schema
feat(db): add transactional match repository
feat(import): load canonical match into PostgreSQL
test(db): cover constraints and idempotent import
```

## Definition of done

- [ ] Чистая DB создаётся только миграциями.
- [ ] Schema имеет PK, FK, unique и check constraints.
- [ ] Все значения передаются SQL parameters.
- [ ] Import атомарен.
- [ ] Повторный import идемпотентен.
- [ ] Timestamp имеет UTC/offset, duration — seconds.
- [ ] Integration tests используют отдельную database.
- [ ] `EXPLAIN` проверен для списка матчей и hero aggregation.
- [ ] Вы объясняете grain каждой таблицы.

## Результат

Теперь данные переживают перезапуск процесса и доступны через проверяемые запросы. В части 8 мы поставим над repository HTTP-сервер NestJS и выдадим стабильный `/v1` контракт мобильному приложению.
