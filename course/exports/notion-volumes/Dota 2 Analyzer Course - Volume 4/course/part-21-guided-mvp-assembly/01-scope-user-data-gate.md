# Глава 1. Зафиксировать MVP, пользователя и коммерческий data gate

## Цель

Не начать полугодовую разработку продукта «для всех игроков». Выбрать одного пользователя, один critical path и только те данные, право на использование которых можно подтвердить.

## 1. Выбранный первый пользователь

Учебная гипотеза:

> Продвинутый зритель профессиональной Dota 2 хочет перед матчем быстро увидеть форму команд, драфтовые предпочтения и мету текущего патча, а после матча — результат и основные показатели.

Не смешивайте сразу:

- зрителя профессиональной сцены;
- обычного игрока с личной историей;
- тренера команды;
- betting-аудиторию;
- контент-мейкера;
- B2B API клиента.

У каждого разные данные, willingness to pay и риски.

## 2. Critical path

Первая версия считается полезной, если новый пользователь может:

```text
открыть приложение
-> увидеть ближайшие/недавние профессиональные матчи
-> открыть матч
-> увидеть команды, драфт, результат и freshness
-> открыть команду
-> увидеть форму и последние матчи
-> открыть мету текущего патча
-> добавить команду в watchlist
-> получить тестовое уведомление о следующем матче
```

Всё, что не поддерживает этот путь, попадает в backlog.

## 3. MVP screen map

Обязательные routes:

```text
/(tabs)/matches
/matches/[matchId]
/teams/[teamId]
/players/[playerId]
/(tabs)/meta
/(tabs)/watchlist
/settings
```

Search можно встроить в matches/meta header или сделать отдельным route. Начните с team/player/match search без fuzzy/AI.

## 4. MVP data contract

Создайте `docs/product/mvp-data-matrix.md`:

| Экран | Поля | Источник | Freshness | Fallback | Права |
|---|---|---|---|---|---|
| matches | ID, start, status, teams | ... | ... | cached/stale | pending/verified |
| details | draft, result, stats | ... | ... | partial | ... |
| team | roster, form | ... | ... | unknown roster | ... |
| meta | patch, picks/bans/wins | derived | ... | previous valid | ... |

Не пишите `source = Internet`. Нужен конкретный API/договор/fixture.

## 5. Commercial rights register

Создайте `docs/legal/data-rights-register.md` и заполните до production:

```text
resource_id
provider
exact endpoint/artifact
data fields/assets
intended use
commercial use evidence
attribution
retention
redistribution/export
personal data
review date
owner
status: verified | pending | denied
```

Отдельные строки для:

- Steam identity;
- professional match facts;
- replay/derived events;
- hero names/art;
- team names/logos;
- player names/photos;
- tournament logos;
- map images;
- open-source code.

## 6. Почему это блокирует код

Steam Web API Terms дают условия использования Steam Data, требуют privacy policy для непубличных пользовательских данных, конфиденциальность API key и запрещают создавать впечатление affiliation/endorsement. Условия могут измениться или доступ может прекратиться.

Вывод не «нельзя делать приложение», а:

```text
до коммерческого запуска
-> проверить каждый источник
-> получить явно достаточное право
-> иметь fallback/termination plan
```

Если provider даёт только hobby/personal-use доступ, используйте его для обучения и staging fixtures, но не продавайте production feature.

Официальный первичный источник: [Steam Web API Terms of Use](https://steamcommunity.com/dev/apiterms).

## 7. Branding

Рабочее название не должно выглядеть официальным:

Плохо:

```text
Official Dota 2 Analytics
Valve Dota Pro
```

Безопаснее:

```text
собственный уникальный бренд
описание: independent analytics app for professional matches
```

До store submission проверьте trademark/name/icon у специалиста и в правилах площадок. Не используйте Dota 2 logo как собственную иконку приложения без подтверждённого разрешения.

## 8. Product exclusions

В MVP нет:

- ставок и gambling CTA;
- обещания победы;
- пользовательских replay uploads;
- chat/social network;
- ML;
- ClickHouse;
- live in-game advice;
- публичного raw data dump;
- команды/фото/логотипа с неясными правами;
- пяти вариантов premium plan.

## 9. Acceptance и non-goals

Создайте `docs/product/mvp-v1.md`:

```markdown
## User
...

## Problem
...

## Critical path
...

## Screens
...

## Data and rights
...

## SLO/freshness
...

## Non-goals
...

## Success after beta
- >= 20 testers completed critical path
- crash-free threshold
- D7 retention hypothesis
- interviews show which feature is valuable
```

Не задавайте выдуманный revenue target до проверки аудитории.

## Практика

1. Проведите 5 первых интервью без демонстрации решения.
2. Запишите текущий workflow пользователя.
3. Выберите critical path.
4. Заполните screen/data matrix.
5. Создайте rights register.
6. Уберите все функции с `pending` rights из коммерческого scope.
7. Утвердите non-goals.

## Definition of Done

- один основной user segment;
- один проверяемый critical path;
- не больше 6–8 основных screens;
- каждому полю назначен источник/freshness/fallback;
- commercial rights status записан;
- branding не обещает affiliation;
- betting/ML/replay не блокируют MVP;
- beta success criteria заданы;
- документ подписан датой и версией.

[Оглавление](README.md) · [Следующая глава](02-production-monorepo.md)

