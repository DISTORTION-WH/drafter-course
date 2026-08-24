# Глава 2. Provider adapter и canonical model

[← Глава 1](01-ingestion-architecture.md) · [Оглавление](README.md) · [Глава 3 →](03-raw-archive-and-provenance.md)

## Anti-corruption layer

Provider adapter не позволяет чужому contract стать нашей моделью:

```text
OpenDota snake_case/null/seconds/slot encoding
→ OpenDota runtime schema
→ OpenDota adapter
→ CanonicalMatch
```

Если позже добавится Steam WebAPI или parser, каждый пишет свой adapter в ту же canonical model.

## Canonical model

```ts
export type Side = 'radiant' | 'dire';
export type DraftActionType = 'pick' | 'ban';

export type CanonicalParticipant = {
  slot: number;
  side: Side;
  providerPlayerId: string | null;
  heroId: number;
  kills: number;
  deaths: number;
  assists: number;
  goldPerMinute: number | null;
  xpPerMinute: number | null;
  isWinner: boolean;
};

export type CanonicalMatch = {
  provider: 'opendota';
  providerMatchId: string;
  startedAt: Date;
  durationSeconds: number;
  winner: Side;
  patchId: string | null;
  participants: readonly CanonicalParticipant[];
  draftActions: readonly CanonicalDraftAction[];
  completeness: MatchCompleteness;
};
```

`readonly` запрещает случайную мутацию после validation. Date не сериализуется в database автоматически без driver mapping, но внутри domain это момент времени.

## Mapping slot

Provider может кодировать side bit/offset в `player_slot`. Логика живёт в adapter и тестируется fixtures:

```ts
function mapSide(providerSlot: number): Side {
  return providerSlot < 128 ? 'radiant' : 'dire';
}
```

Это только пример правила: подтвердите актуальный OpenDota contract. Canonical slot `0..9` должен быть последовательным и независимым от provider encoding.

## Patch mapping

Если provider даёт patch numeric ID, а API хочет display version, используйте versioned mapping table:

```text
provider_patch_id → canonical_patch_id → display_name/start/end
```

Не вычисляйте patch только по текущей дате в mobile. Историческая граница должна быть сохранена и исправляема.

## Identity mapping

Один player может иметь Steam ID, OpenDota account ID и internal ID. Не применяйте арифметику конвертации в разных файлах. Создайте service/value object и таблицу external identities с `(provider, entity_type, external_id)` unique.

## Completeness

```ts
export type MatchCompleteness = {
  hasCore: boolean;
  hasParticipants: boolean;
  hasDraft: boolean;
  hasDetailedStats: boolean;
  isParsed: boolean;
};
```

Один boolean `complete` часто слишком груб. Analytics metric declares required flags.

## Parser result

```ts
export type NormalizeResult =
  | { ok: true; match: CanonicalMatch; warnings: readonly NormalizeWarning[] }
  | { ok: false; issues: readonly NormalizeIssue[] };
```

Ожидаемые плохие данные не обязаны бросать generic exception. Result сохраняет список путей/кодов. Неожиданный bug всё ещё exception.

## Валидация коллекции

Проверьте:

- unique canonical slots;
- 5 radiant/5 dire только когда match заявлен complete;
- hero IDs positive/known policy;
- participant winner согласован с match winner;
- draft sequence unique/order;
- duration/start time reasonable, но не удаляйте редкий факт без quarantine.

## Практика

Сделайте fixtures: full parsed match, partial match без draft, anonymous player, duplicate slot, неизвестный patch, неправильный boolean. Adapter tests не обращаются в сеть.

## Самопроверка

- [ ] Provider names не выходят за adapter.
- [ ] IDs/units преобразуются в одном месте.
- [ ] Partial data явно отмечена.
- [ ] Fixture покрывает edge cases.
- [ ] Warning отличается от fatal issue.
