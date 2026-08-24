# Глава 9. Golden replays, тесты и обновление Clarity

## 1. Что такое golden replay

Контролируемый replay с известной provenance/checksum и утверждённым ожидаемым output. Набор покрывает разные:

- patches/game builds;
- длительности;
- tournament/mode;
- pausing/pregame;
- heroes/illusions/summons;
- corrupted/truncated cases;
- map transform versions;
- source/provider variants.

## 2. Где хранить

Replay может быть большим и иметь отдельные data rights. Не кладите автоматически в public Git/LFS.

```text
private test object storage
-> immutable object + SHA-256
-> manifest в repository без secret URL
-> CI role получает short-lived read access
```

Если terms не позволяют хранение/CI use, используйте собственные разрешённые test captures или другой легальный fixture strategy.

## 3. Golden catalog

```yaml
id: pro-match-build-a
matchId: "8173564281"
objectReference: golden/replays/sha256.dem
sha256: "..."
engine: SOURCE2
gameBuild: "..."
expected:
  winner: radiant
  players: 10
  deathEvents: 42
  positionCoverageMin: 0.95
rightsRevision: internal-approved-2026-01
```

Не содержит signed URL/credential.

## 4. Уровни tests

### Unit

Mapping, event normalization, transform, grid, manifest, retry classification.

### Small binary fixtures

Header/truncation/format boundary, если lawful и технически возможны.

### Golden integration

Clarity full parse → manifest/artifacts → semantic assertions.

### Pipeline E2E

Object storage → run/lease → parser container → publish → derived API.

## 5. Не snapshot всего файла без смысла

Full output snapshot огромен и создаёт нечитабельный diff. Сравнивайте:

- manifest schema/hashes/counts;
- overview fields;
- selected known events/ticks;
- aggregate counts/distributions;
- position coverage/landmarks;
- warnings/unknown rate;
- determinism hash при одинаковой версии/config.

При ожидаемом изменении создаётся review report старое/новое.

## 6. Differential run

Перед Clarity/our parser update:

```text
old image parses full golden set
new image parses same inputs/config
-> compare success/errors
-> overview differences
-> event counts/types
-> position coverage/grid divergence
-> runtime/RSS/output size
-> unknown warnings
```

Порог не скрывает единичный критический mismatch winner/match ID.

## 7. Patch canary

После нового Dota patch/build:

1. parser support default off/limited percentage;
2. несколько current replays shadow parse;
3. compare canonical overview/data quality;
4. review unknown properties/event rates;
5. update extractor/mapping/goldens;
6. gradual rollout;
7. старый validated output остаётся current до успеха.

## 8. Determinism

Один input hash + parser version + schema + config должен давать одинаковый semantic output. Исключите:

- current timestamp из hashed content (поместить отдельно);
- random ordering/hash map iteration;
- locale/timezone;
- platform-specific float formatting;
- unstable compression metadata;
- parallel writer race.

Artifact byte hash может отличаться из-за compressor metadata; тогда определите canonical semantic hash или настройте deterministic compression.

## 9. Performance regression

Измеряйте:

- wall/CPU time;
- peak RSS/heap;
- temp/read/write bytes;
- event throughput;
- output size;
- startup time.

CI benchmark шумный; используйте broad regression gate и стабильный scheduled environment. Functional correctness важнее маленького ускорения.

## 10. Dependency update checklist

- прочитать Clarity changelog/source changes/license;
- pin dependency/Gradle lock/checksums;
- build Java toolchain;
- unit/golden/differential;
- scan dependency/image;
- stage shadow reparse;
- verify metrics/Sentry/source mapping for Java;
- canary current builds;
- rollback pointer/image готов;
- update parser version/support matrix.

## 11. Практика

Соберите минимум 5 разрешённых golden replays из 2–3 game builds плюс corrupted variants. Создайте machine comparison report и manual approval для parser update.

[Предыдущая глава](08-corrupted-replays-security.md) · [Оглавление](README.md) · [Следующая глава](10-final-replay-lab.md)

