# Глава 10. Итоговая лабораторная: worker матча

[← Глава 9](09-data-quality-observability.md) · [Оглавление](README.md) · [Часть 10 →](../part-10-analytics/README.md)

## Цель

Автоматически получить один match через job и довести его до `complete` с raw lineage, не создавая дубликатов при пяти повторных обработках.

## Структура

```text
apps/worker/src/
├─ main.ts
├─ worker.module.ts
├─ ingestion/
│  ├─ ingest-match.job.ts
│  ├─ ingest-match.processor.ts
│  ├─ ingest-match.use-case.ts
│  ├─ ingestion-state.repository.ts
│  └─ retry-policy.ts
├─ providers/opendota/
│  ├─ opendota.client.ts
│  ├─ opendota.schemas.ts
│  ├─ opendota.adapter.ts
│  └─ fixtures/
├─ raw/
└─ observability/
packages/
├─ domain/
└─ database/
```

## Use case pseudo-code

```ts
async execute(command: IngestMatchCommand): Promise<Result> {
  const claim = await state.claim(command);
  if (!claim.acquired) return { outcome: 'skipped', reason: claim.reason };

  const raw = claim.reusableRaw ?? await provider.fetchMatch(command.matchId);
  const manifest = claim.reusableRaw
    ? claim.reusableRaw.manifest
    : await rawArchive.save(raw);

  await state.markRawSaved(command, manifest.id);

  const normalized = adapter.normalize(raw.payload);
  if (!normalized.ok) {
    await state.quarantine(command, normalized.issues, manifest.id);
    return { outcome: 'quarantined' };
  }

  await database.transaction(async (tx) => {
    await matchRepository.merge(tx, normalized.match, manifest);
    await state.complete(tx, command, manifest.id, parserVersion);
    await outbox.add(tx, matchUpdatedEvent(normalized.match));
  });

  return { outcome: 'complete' };
}
```

В реальном коде error boundary переводит exception в retry/quarantine и обновляет state. Если `markRawSaved` DB call упал, manifest всё равно существует; reconciliation связывает orphan object по metadata/hash.

## Фазы реализации

1. Добавьте Redis service и health.
2. Создайте migrations `raw_objects`, `ingestion_resources`, `outbox_events`.
3. Перенесите HTTP/OpenDota код части 6 в provider package.
4. Реализуйте raw storage interface + local implementation.
5. Напишите adapter из fixtures.
6. Реализуйте transactional canonical merge.
7. Соедините BullMQ processor с use case.
8. Добавьте discovery одного выбранного ID.
9. Добавьте reconciliation due/stuck resources.
10. Добавьте metrics/logs и shutdown.

## Acceptance tests

| Test | Ожидание |
|---|---|
| первый valid job | complete, match создан |
| тот же job 5 раз | одна match, без duplicate children |
| 503 затем success | retry, затем complete |
| invalid provider JSON | quarantined, raw сохранён |
| crash после raw save | retry использует raw, без нового fetch |
| DB fail before commit | canonical/status не частичные |
| partial incoming после full | full draft сохранён |
| Redis очищен | reconciler восстанавливает due work |
| secret configured | отсутствует в job/log/raw metadata |
| worker shutdown | connections закрыты |

## Ручной сценарий

```powershell
docker compose up -d postgres redis
pnpm db:migrate
pnpm --filter worker start:dev
pnpm enqueue:match -- 8000000000
```

Проверьте PostgreSQL state, raw file/object и API `GET /v1/matches/8000000000`.

## Commit plan

```text
chore(worker): bootstrap BullMQ worker and Redis
feat(raw): archive provider payloads with manifest
feat(opendota): normalize match into canonical model
feat(ingestion): persist match idempotently with state machine
feat(reconcile): recover due and stuck resources
test(ingestion): cover retries crashes and data regression
```

## Definition of done

- [ ] API никогда не вызывает provider.
- [ ] Job versioned, small и без secrets.
- [ ] Raw сохраняется до normalize.
- [ ] Adapter покрыт contract fixtures.
- [ ] State claim atomic, stuck state recoverable.
- [ ] Canonical merge + complete + outbox — одна transaction.
- [ ] Пять повторов не создают дубликаты.
- [ ] Partial payload не портит full data.
- [ ] Retry budget ограничен и классифицирован.
- [ ] Reconciliation восстанавливает DB→queue gap.
- [ ] Freshness/completeness/lag наблюдаемы.

## Результат

Приложение теперь само поддерживает базу матчей. В части 10 превратим эти факты в корректные, versioned показатели меты и выдадим `/v1/meta/heroes` с фильтрами, sample size и freshness.
