# Глава 10. Итоговая лабораторная replay pipeline

## Цель

Для одного разрешённого профессионального replay выполнить полный, повторяемый и наблюдаемый путь:

```text
download -> SHA/private raw object
-> parse run + lease
-> Java/Clarity overview/combat/positions
-> manifest + immutable artifacts
-> canonical validation
-> current pointer
-> heatmap/timeline API
-> mobile derived block
```

## 1. Репозитории и packages

```text
services/replay-parser/          Java + Gradle + Clarity
apps/worker/src/replay/          download/dispatch/reconciliation
packages/replay-contracts/       manifest/schema/generated TS models
apps/api/src/replay/             read-only derived endpoints
apps/mobile/src/features/replay/ timeline/heatmap UI
test/golden-replays/             manifests, not secret URLs
```

## 2. Миграции

- `replay_artifacts`;
- `replay_parse_runs`;
- execution attempts/leases при выбранной модели;
- `replay_current_outputs`;
- небольшие overview/derived aggregates;
- outbox/dispatch state;
- constraints и indexes по status/lease/artifact/version.

Parser runtime DB role получает только narrow replay schema access; лучше internal API/control-plane boundary, если platform позволяет избежать общей DB.

## 3. Parser v1

Обязательный output:

- manifest;
- overview;
- death events;
- hero-to-hero damage/heal subset;
- hero position samples;
- 32×32 heatmap aggregate;
- quality/warning counts.

Не добавляйте chat/voice/raw all-entity dump.

## 4. Pipeline behavior

- download stream limited/hashed;
- raw object immutable;
- duplicate request возвращает тот же logical run;
- worker lease восстанавливается;
- temp output не current;
- terminal corruption quarantine;
- retry temporary storage error;
- parser/base match independence;
- new parser output shadow until validation.

## 5. API

```text
GET /v1/matches/{matchId}/replay-status
GET /v1/matches/{matchId}/combat-summary
GET /v1/matches/{matchId}/heatmap?playerSlot=...
```

Response содержит:

- parser/schema/config/game build;
- source period/freshness;
- quality status/warnings category;
- sample/event/match denominator;
- `processing`, `unavailable`, `unsupported`, `failed` states;
- только validated current output.

Raw object key/signed URL/internal stack не возвращается.

## 6. Mobile UI

- replay-блок не мешает основным details;
- skeleton/processing state;
- unsupported/unavailable explanation;
- combat timeline virtualized;
- heatmap с legend/denominator;
- accessible text/top zones;
- parser methodology/version в details;
- cached old validated output остаётся при failed reparse.

## 7. Tests

### Java

- normalization/limits/manifest;
- golden overview/combat/positions;
- corrupted/truncated;
- deterministic output;
- timeout/output limit.

### Node/backend

- eligibility/download SSRF/size/hash;
- state/lease/idempotency;
- dispatch 202/reconciliation;
- current pointer quality gate;
- API schema/status.

### Mobile

- all states;
- heatmap accessibility;
- unknown schema/action safe fallback.

### End-to-end

- one golden artifact through container pipeline;
- kill parser during publish;
- retry same run;
- compare no duplicate/current corruption.

## 8. Observability

Dashboard:

- eligible/downloaded/parsed;
- success/error by parser/build category;
- queue oldest age/throughput;
- parse p50/p95 and peak resource;
- output bytes/events;
- unknown/warning rate;
- current parser-version coverage;
- golden suite latest result.

Alert на массовую regression/new build, queue freshness и resource saturation; один corrupted replay создаёт quarantine ticket/info.

## 9. Game day

В staging:

1. wrong hash;
2. truncated file;
3. parser killed mid-run;
4. object storage timeout;
5. output limit;
6. unsupported build;
7. bad parser release shadow mismatch;
8. rollback current pointer/image.

Подтвердите, что canonical match/API доступны во всех случаях.

## 10. Definition of Done части 18

- права/retention replay source проверены;
- Java 17+/Gradle wrapper/Clarity version pinned;
- parser изолирован и non-root;
- BullMQ internals не протекли в Java boundary;
- raw и outputs immutable/checksummed;
- run state/lease/idempotency протестированы;
- manifest versioned по parser/schema/build/config;
- combat semantics документированы и validated;
- position transform проверен landmarks/goldens;
- corrupted files terminal/quarantined;
- golden/differential update gate существует;
- API отдаёт только current validated derived data;
- mobile показывает quality/methodology;
- observability/runbook/game day готовы;
- parser failure не ломает базовый match flow.

## Что дальше

Когда объём replay events/positions перерастёт PostgreSQL и object artifacts, следующая часть курса вводит OLTP/OLAP-разделение, ClickHouse, партиционирование, columnar queries, pre-aggregation и нагрузочные тесты.

[Предыдущая глава](09-golden-replays-testing.md) · [Оглавление части](README.md) · [Дальше: часть 19](../part-19-clickhouse-scaling/README.md)
