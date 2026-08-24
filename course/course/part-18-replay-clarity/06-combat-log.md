# Глава 6. Combat log и нормализация событий

## 1. Что даёт combat log

Clarity текущей версии предоставляет `CombatLogEntry` и callback `@OnCombatLogEntry`. Entry может описывать, среди прочего:

- damage;
- heal;
- death;
- ability use;
- item use;
- modifier add/remove;
- gold/XP и другие types в зависимости от replay/build.

Мы не сохраняем всё сразу. Первая schema имеет allowlist и explicit unknown count.

## 2. Processor boundary

Conceptual Java code:

```java
import skadistats.clarity.model.CombatLogEntry;
import skadistats.clarity.processor.gameevents.OnCombatLogEntry;

public final class CombatEventProcessor {
    private final CombatEventSink sink;
    private long sequence;

    public CombatEventProcessor(CombatEventSink sink) {
        this.sink = sink;
    }

    @OnCombatLogEntry
    public void onEntry(CombatLogEntry entry) {
        normalize(entry).ifPresent(event -> {
            sink.write(event.withSequence(sequence));
            sequence += 1;
        });
    }
}
```

Точный exception contract/immutable API адаптируйте. Callback не выполняет remote HTTP/DB: только bounded normalization и streaming sink.

## 3. Canonical types

```java
public sealed interface CombatEvent
    permits DamageEvent, HealEvent, DeathEvent, AbilityEvent {
    long sequence();
    int tick();
    double gameTimeSeconds();
}
```

`sealed interface` ограничивает известные реализации. Каждый record имеет только поля своего type.

Например:

```java
public record DamageEvent(
    long sequence,
    int tick,
    double gameTimeSeconds,
    ActorRef attacker,
    ActorRef target,
    String inflictorTechnicalName,
    long amount,
    boolean attackerIllusion,
    boolean targetIllusion
) implements CombatEvent {}
```

Не используйте `double` для целого damage, если source даёт integer. Не интерпретируйте отрицательное/overflow без validation.

## 4. Actor identity

Combat log technical name не всегда однозначно равен игроку:

- hero;
- illusion;
- summon;
- creep/tower;
- neutral;
- unknown entity;
- owner отсутствует в конкретном event.

```ts
type ActorRef = {
  kind: 'hero' | 'illusion' | 'summon' | 'creep' | 'building' | 'unknown';
  technicalName?: string;
  heroId?: string;
  playerSlot?: number;
  team?: 'radiant' | 'dire' | 'neutral';
  ownerPlayerSlot?: number;
};
```

Unknown остаётся unknown, а не случайным hero. Mapping имеет version/source.

## 5. Time

Сохраняйте:

- replay tick;
- combat timestamp/game time, как даёт Clarity;
- derived phase (`pregame`, `game`) только versioned rule;
- raw/normalized precision policy.

Pause и pregame означают, что tick и game seconds нельзя считать одной линейной wall-clock шкалой без проверки.

## 6. Technical names

`npc_dota_hero_*`, ability/item/modifier names преобразуются через patch/build-aware constants catalog. Raw technical name сохраняется в private derived artifact; public API отдаёт stable hero/ability ID и fallback label.

Если mapping неизвестен:

```text
technical name kept
canonical id = null
quality warning increment
не удалять событие молча
```

## 7. Damage semantics

До публикации статистики выясните на golden replays:

- pre/post mitigation amount;
- HP before/after availability;
- reflection/HP removal;
- overkill;
- illusions;
- source/inflictor null;
- repeated/multi-target events;
- buildings/creeps vs heroes.

Название метрики обязано отражать реально наблюдаемую величину. Не называйте её «фактический урон герою», пока это не доказано.

## 8. Teamfight — derived heuristic

Один из versioned approaches:

```text
candidate hero-vs-hero damage/death events
-> group по time gap <= threshold
-> optional spatial distance threshold
-> require N unique real heroes / both teams
-> expand until quiet period
-> aggregate participants, damage, deaths
```

Parameters входят в `configHash`. Teamfight не является raw fact; UI показывает methodology. Изменение threshold пересчитывает output version.

## 9. Validation

- replay match ID/winner совпадают canonical;
- hero roster mapping coverage;
- death counts сравниваются с overview/player totals с documented exceptions;
- negative/absurd amount quarantined/warned;
- record/output limits;
- unknown event rate по game build;
- duplicate deterministic identities отсутствуют.

## 10. Практика

Реализуйте только death, hero-to-hero damage и heal. Сохраните counts/unknown types, сравните 5–10 вручную известных моментов в golden replay и сформулируйте точную семантику каждого поля.

Исходный пример API: [Clarity combat log example](https://github.com/skadistats/clarity-examples/blob/master/src/main/java/skadistats/clarity/examples/combatlog/Main.java).

[Предыдущая глава](05-parser-schema-output.md) · [Оглавление](README.md) · [Следующая глава](07-positions-heatmaps.md)

