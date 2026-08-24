# Глава 5. Версии parser/schema и выходной manifest

## 1. Четыре разных версии

```text
parserVersion — release нашего Java service/Clarity dependency
schemaVersion — формат output artifacts
gameBuild     — Dota server build из replay
configHash    — sampling/allowlist/map transform configuration
```

Не заменяйте всё `version: 1`. Один parser release способен читать несколько builds и писать одну schema; изменение sampling config меняет heatmap без code version.

## 2. Manifest

```json
{
  "manifestVersion": 1,
  "runId": "uuid",
  "matchId": "8173564281",
  "input": {
    "sha256": "...",
    "byteLength": "123456789"
  },
  "parser": {
    "name": "dota-clarity-parser",
    "version": "2026.07.1",
    "clarityVersion": "4.0.1",
    "schemaVersion": 1,
    "configHash": "..."
  },
  "replay": {
    "engine": "SOURCE2",
    "gameBuild": "...",
    "firstTick": 0,
    "lastTick": 123456
  },
  "artifacts": [],
  "quality": {
    "status": "validated",
    "warnings": [],
    "canonicalMatchCompared": true
  }
}
```

Большие integer/ID представлены строками там, где JSON consumer может потерять точность.

## 3. Artifact descriptor

```json
{
  "kind": "combat-events",
  "format": "ndjson+zstd",
  "schemaVersion": 1,
  "objectKey": "replays/outputs/...",
  "sha256": "...",
  "recordCount": "85432",
  "byteLength": "4381120"
}
```

Manifest публикуется после закрытия writers и вычисления hashes/counts. Consumer не читает temp prefix.

## 4. Output formats

MVP:

- overview/manifest JSON;
- combat/positions NDJSON compressed для простоты streaming/debug;
- агрегаты PostgreSQL;
- позже Parquet/ClickHouse для columnar scale.

Не храните один гигантский JSON array: невозможно stream-ить удобно, ошибка в конце требует переписать всё, память возрастает.

## 5. Event identity

Replay может содержать несколько событий одного type/tick. Deterministic identity:

```text
matchId + parser schema + tick + event kind + sequenceWithinTick
```

`sequenceWithinTick` выдаётся в стабильном callback order текущего parser contract и проверяется golden tests. Hash raw representation без canonicalization может меняться при upgrade.

## 6. Canonical event envelope

```ts
type ReplayEventEnvelope<T> = {
  matchId: string;
  tick: number;
  gameTimeSeconds?: number;
  sequence: number;
  type: string;
  payload: T;
  parserVersion: string;
  schemaVersion: number;
  gameBuild?: string;
};
```

Tick/game time semantics документируются. До pregame время может быть отрицательным; pause меняет соотношение wall/tick/game time.

## 7. Schema evolution

Совместимо:

- добавить optional field;
- новый event type, если consumer игнорирует unknown;
- новый artifact kind.

Ломает:

- поменять единицу координат;
- переименовать required field;
- изменить смысл damage amount;
- другой sampling interval без config/version;
- удалить event type.

Consumer понимает поддерживаемые versions, иначе отвечает `UNSUPPORTED_REPLAY_SCHEMA`, не читает «как получится».

## 8. Publishing current output

После parse:

```text
manifest integrity
-> schema validation
-> canonical overview comparison
-> quality thresholds
-> transactional pointer replay_current_outputs
-> derived aggregation job
```

Новый parser run может succeeded технически, но quality rejected; старый validated output остаётся current.

## 9. Reprocessing

Parser upgrade не перезаписывает старые artifacts. Создаёт новый run/manifest, выполняет shadow comparison, затем pointer переключается. Rollback — вернуть pointer на прошлый validated run, если API schema совместима.

## 10. Практика

Опишите JSON Schema/Java records/TypeScript generated types для manifest v1. Создайте validator и tests: unknown optional accepted, missing required rejected, big IDs strings, checksum/count verified.

[Предыдущая глава](04-storage-queue-state-machine.md) · [Оглавление](README.md) · [Следующая глава](06-combat-log.md)
