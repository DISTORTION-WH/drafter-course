# Маршрут от полного нуля до запуска

## Что обещает этот маршрут

Если вы выполните все обязательные упражнения и проверки, у вас будет приложение, которое:

- получает разрешённые данные профессиональных матчей;
- показывает матчи, команды, игроков, драфты и мету;
- имеет backend, базу данных, mobile UI, auth, watchlist и уведомления;
- работает в AWS по HTTPS на собственном домене;
- проходит beta/store release;
- умеет безопасно проверять premium-подписку;
- имеет бюджеты, метрики, backup, support и rollback.

Маршрут не гарантирует доход. Он доводит продукт до состояния, в котором его можно законно предложить рынку и измерить готовность людей платить.

## Две учебные линии

### Обязательная линия запуска

```text
1–5 -> 6–10 -> 11–15 -> 16–17
-> 21 guided MVP
-> 22 AWS
-> 23 stores
-> 24 monetization
-> выпускной проект
```

### Необязательные расширения

```text
18 replay parser
19 ClickHouse
20 ML predictions
```

Не откладывайте первый запуск ради продвинутых частей. Добавляйте их после вопроса пользователя или метрики нагрузки.

## Реалистичный срок

Для абсолютного новичка при 8–12 часах в неделю:

| Фаза | Примерный диапазон |
|---|---:|
| программирование и инструменты | 2–4 месяца |
| backend/data/analytics | 3–5 месяцев |
| React Native и интеграция | 2–4 месяца |
| тесты/production principles | 1–2 месяца |
| сборка единого MVP | 2–3 месяца |
| AWS/store/monetization | 2–4 месяца |

Это ориентир, не дедлайн. Если контрольная точка не работает, календарь не даёт права её пропустить.

## Единый репозиторий

С части 21 вы работаете только в одном основном repository:

```text
dota-analytics/
  apps/
    api/
    worker/
    mobile/
    web-public/
  packages/
    contracts/
    domain/
    config/
    testing/
  infra/
    docker/
    aws-cdk/
  db/
    migrations/
    seeds/
  docs/
    adr/
    legal/
    runbooks/
    product/
  learning/
```

Учебные черновики остаются в `learning`, production code — в `apps/packages/infra`.

## Контрольные релизы

### R0 — CLI

Ввести fixture матча, проверить данные, рассчитать KDA и вывести результат.

### R1 — local vertical slice

```text
fixture -> PostgreSQL -> NestJS API -> Expo screen
```

### R2 — real provider slice

```text
provider -> raw archive -> normalized match -> API -> mobile
```

### R3 — usable MVP

- schedule/history;
- match details/draft;
- teams/players;
- hero meta;
- search;
- watchlist;
- notifications;
- data freshness.

### R4 — release candidate

- critical tests;
- threat/data-rights review;
- no secrets;
- on-device E2E;
- support/privacy/account deletion pages;
- synthetic staging.

### R5 — AWS beta

- domain/HTTPS;
- ECS/RDS/S3;
- CI/CD OIDC;
- budgets/alerts;
- restore drill;
- TestFlight/Play testing.

### R6 — commercial-ready

- written rights register;
- premium offer validated by interviews;
- store products configured;
- sandbox purchase/renew/cancel/refund tested;
- entitlement enforced backend-side;
- product metrics/support;
- public rollout plan.

## Правило одной вертикали

Каждая функция проходит целиком:

```text
source -> schema -> DB -> service -> API contract
-> generated client -> mobile states -> tests -> metrics -> deployment
```

Не создавайте 20 database tables без экрана и не рисуйте 20 screens без данных. Сначала одна законченная вертикаль.

## Weekly review

Раз в неделю ответьте:

1. Что теперь работает у пользователя?
2. Какой test доказывает это?
3. Какие данные/права использованы?
4. Как feature ведёт себя при ошибке provider?
5. Что стоит денег?
6. Можно ли откатить изменение?
7. Какой следующий самый маленький vertical slice?

## Стоп-условия

Не переходите к AWS, если local critical path нестабилен.

Не отправляйте app в store, если нет:

- production backend;
- privacy/support/account deletion;
- on-device tests;
- rights register;
- monitoring;
- rollback.

Не включайте платежи, если:

- коммерческое право на данные не подтверждено;
- premium value не проверена интервью/beta;
- purchase verification находится только в mobile;
- refund/cancel/restore не протестированы;
- unit economics отрицательна без осознанной инвестиционной гипотезы.

## Как пользоваться AI и Codex

Для каждой главы сначала делайте собственную попытку. Затем просите:

```text
Проверь только мой код этой главы по Definition of Done.
Не переписывай всё; укажи первую причинную ошибку.
Объясни stack trace по строкам.
Напиши тест, который воспроизводит найденную ошибку, но не исправление.
Сравни мой deployment plan с checklist главы.
```

Перед выполнением generated command вы обязаны понимать:

- где она запущена;
- какие файлы меняет;
- какие cloud resources создаёт;
- сколько они могут стоить;
- как их удалить/откатить.

## Когда курс действительно завершён

Не когда прочитан последний Markdown, а когда выпускной checklist подтверждён evidence:

- repository commit;
- test report;
- live HTTPS endpoint;
- physical-device build;
- AWS cost estimate/budget;
- restore record;
- store beta/review evidence;
- sandbox billing lifecycle;
- rights/legal register;
- user interviews и product metrics;
- runbooks и rollback.

[Как проходить курс](00-how-to-study.md) · [Карта курса](01-course-map.md) · [Главное оглавление](../README.md)

