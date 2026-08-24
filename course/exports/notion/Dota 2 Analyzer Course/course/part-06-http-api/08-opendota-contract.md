# Глава 8. Контракт OpenDota и исследование ответа

[← Глава 7](07-api-key-and-secrets.md) · [Оглавление](README.md) · [Глава 9 →](09-provider-client-and-raw-archive.md)

## Сначала документация, затем код

Откройте [официальную документацию OpenDota](https://docs.opendota.com/) и найдите актуальные определения endpoint. Для учебного пути нас интересуют:

- получение матча по ID;
- список профессиональных матчей;
- constants/heroes как справочник;
- при необходимости данные профессиональных команд и игроков.

Названия и response schema могут измениться. Не используйте случайную статью как источник контракта.

## Паспорт provider

Создайте `docs/providers/opendota.md`:

```md
# OpenDota provider passport

- Checked at: 2026-07-16
- Base URL: https://api.opendota.com/api/
- Official docs: https://docs.opendota.com/
- Authentication: re-check current plan
- Rate limit: do not hardcode; configure from current plan
- Match endpoint used by adapter: GET /matches/{match_id}
- Raw retention: private object storage/local ignored folder
- License/terms owner: project owner must approve before production
```

Так меняющийся внешний контракт не прячется внутри кода.

## Inspect, но не «угадывать тип»

Сохраните один sample только локально и выпишите:

- тип корневого значения;
- обязательные для MVP поля;
- nullable/optional поля;
- единицы времени;
- формат ID;
- массив игроков и поля draft;
- признаки parsed/unparsed ответа;
- неожиданные поля.

Не делайте поле обязательным только потому, что оно присутствовало в одном матче.

## Единицы измерения

Названия переменных должны содержать единицу:

```ts
const durationSeconds = 2_345;
const timeoutMs = 10_000;
const startTimeSeconds = 1_750_000_000;
```

Преобразование Unix seconds в Date:

```ts
function unixSecondsToDate(seconds: number): Date {
  return new Date(seconds * 1000);
}
```

В БД будем хранить `timestamptz` в UTC, а duration — integer seconds.

## Optional, nullable и отсутствующее

Это разные состояния:

```ts
type Example = {
  leagueId?: string;        // поле может отсутствовать
  teamName: string | null;  // поле есть, значение может быть null
};
```

Provider может не знать команду, матч может быть не полностью parsed, поле может появляться только для pro match. Parser должен отражать фактический контракт, а canonical model — бизнес-смысл.

## Частичная полнота

Не превращайте «нет значения» в `0`:

```ts
// Плохо: неизвестный gold_per_min становится реальным нулём
const gpm = input.gold_per_min ?? 0;
```

Неизвестное значение остаётся `null`/отсутствующим, а completeness записывается отдельно. Иначе аналитика будет систематически занижена.

## Terms, attribution и privacy

До production отдельно зафиксируйте:

- условия API и тариф;
- разрешённый объём и способ cache/redistribution;
- требования attribution;
- правила Valve/Steam для используемых данных;
- обработку профилей и запросов удаления;
- срок хранения raw payload.

Лицензия open-source repository не обязательно описывает право на коммерческое переиспользование всех данных публичного сервиса. Это продуктовая/юридическая проверка, не вывод из кода.

## Contract fixture

В тестах храните маленький обезличенный fixture, содержащий только необходимые поля и edge cases. Рядом запишите источник и дату. Не коммитьте огромный полный ответ без проверки прав и персональных данных.

## Практика

Сделайте таблицу из 12 полей match response:

| Provider field | JSON type | Optional? | Unit | Canonical field | Правило |
|---|---|---:|---|---|---|
| `match_id` | number/string | no | ID | `matchId` | string |
| `duration` | number | no | seconds | `durationSeconds` | integer ≥ 0 |

Остальные строки заполните по актуальному ответу и документации.

## Самопроверка

- [ ] Есть provider passport с датой проверки.
- [ ] Поля основаны не на одном sample.
- [ ] Единицы указаны в именах.
- [ ] `null`, absence и zero не смешиваются.
- [ ] Production ждёт отдельной проверки terms/attribution/privacy.
