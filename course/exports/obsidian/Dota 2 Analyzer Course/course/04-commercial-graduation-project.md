# Выпускной проект: от пустой папки до работающего продукта

## Зачем отдельный выпускной проект

[Техническая аттестация](02-final-assessment.md) проверяет, умеете ли вы самостоятельно изменить код во всех слоях. Выпускной проект проверяет более широкий результат: приложение собрано в один продукт, работает в AWS, доступно тестировщикам, соблюдает права и privacy, а коммерческая гипотеза проверена безопасно.

Доход не входит в обязательный балл: рынок не подчиняется учебному заданию. Обязательны честный платёжный канал, измеренный эксперимент и решение по фактам.

## 1. Итоговый объект

```text
React Native application
  -> HTTPS production API in AWS
  -> PostgreSQL + ingestion workers
  -> permitted Dota 2 data
  -> matches/players/teams/meta/search
  -> auth/watchlist/notifications
  -> store beta/public listing
  -> optional Pro purchase UI
  -> official store verification
  -> server entitlements
  -> observability/support/privacy/deletion
```

Replay/Clarity, ClickHouse и ML из частей 18–20 не обязательны. Добавляйте их только после запуска, если rights, scale и product evidence оправдывают стоимость.

## 2. Обязательный функциональный сценарий

Новый пользователь:

1. устанавливает приложение из TestFlight/Google Play testing/public channel;
2. видит источник, временное окно и свежесть данных;
3. находит профессиональный матч, игрока или команду;
4. открывает матч и понимает draft/result;
5. смотрит meta с patch/time/sample/denominator;
6. создаёт аккаунт или продолжает как guest по вашей модели;
7. добавляет watchlist и управляет notifications;
8. может экспортировать/удалить аккаунт по вашей policy;
9. видит честный Free/Pro offer;
10. в sandbox, а при закрытых gates и production, покупает и восстанавливает Pro;
11. получает доступ только после server verification;
12. может управлять/отменить subscription через store.

## 3. Доказательства по уровням

### Уровень A. Техническая самостоятельность

- пройдена аттестация минимум на 80/100;
- вы объясняете переменные, функции, types, async flow и database constraints;
- изменение проходит migration → API → mobile → tests → deploy;
- Git history содержит небольшие осмысленные commits;
- generated code не редактируется вручную;
- критические tests работают в CI.

### Уровень B. Production

- staging/production воспроизводятся CDK;
- HTTPS/domain, ECS API/worker, private RDS, secrets, backups;
- GitHub OIDC и exact image digest;
- migration task, smoke, staged rollout, rollback;
- restore drill с RPO/RTO;
- dashboard технического здоровья и data freshness;
- budget/cost anomaly alerts;
- support/incident runbooks.

### Уровень C. Store и compliance

- asset/data rights register без критичных unknown;
- privacy/terms/support/delete pages;
- Apple App Privacy/Google Data safety совпадают с code/SDK;
- signing/account recovery;
- минимум один официальный beta channel, второй завершён либо имеет внешний blocker;
- reviewer demo account/notes;
- app deletion работает end-to-end;
- нет ложной официальности и неподтверждённых claims.

### Уровень D. Коммерческий эксперимент

- 15–20 problem interviews выбранного сегмента;
- landing/waitlist и behavior beta;
- Free/Pro matrix и paywall usability tests;
- sandbox purchase lifecycle на доступных платформах;
- backend official verification/notifications/reconciliation;
- premium API enforcement;
- unit economics low/base/high;
- ограниченный real offer только при закрытых gates;
- decision memo `scale | iterate | pivot | pause`.

## 4. Структура evidence

```text
evidence/
  01-learning/
    technical-assessment.md
    explanation-recording-or-notes.md
  02-product/
    scope.md
    user-scenarios.md
    usability-findings.md
  03-rights-privacy/
    data-rights-register.md
    asset-register.md
    privacy-manifest.md
    deletion-test.md
  04-quality/
    test-report.md
    security-review.md
    performance-report.md
  05-aws-launch/
    architecture.png
    release-manifest.json
    restore-drill.md
    rollback-drill.md
    cost-estimate.md
  06-stores/
    android-status.md
    ios-status.md
    review-notes.md
    beta-feedback.md
  07-commercial/
    interviews-summary.md
    sandbox-matrix.md
    billing-reconciliation.md
    cohort-funnel.md
    unit-economics.md
    decision-memo.md
```

Не кладите туда secrets, receipts/tokens, персональные интервью целиком, финансовые реквизиты и unredacted console screenshots.

## 5. Защита проекта

Без подсказки объясните:

1. Откуда приходит каждый класс данных и почему его можно использовать коммерчески?
2. Как raw provider payload становится canonical match и meta aggregate?
3. Как система предотвращает duplicates/corrections/stale data?
4. Почему mobile не содержит provider keys?
5. Что произойдёт при падении provider, worker, Redis, RDS или новом плохом release?
6. Как восстановить базу и какой фактический RTO/RPO?
7. Как пользователь удаляет аккаунт и что законно остаётся?
8. Почему client не может сам выдать Pro?
9. Как renewal/refund достигает backend, когда app закрыто?
10. Сколько стоит 100/1 000/10 000 MAU и сколько paying users нужно для break-even?
11. Какой segment/job подтверждён поведением?
12. Какие данные заставят остановить или изменить продукт?

Если объяснение опирается на «так сгенерировал AI», вернитесь к соответствующей главе и упростите реализацию.

## 6. Оценка: 100 баллов

| Раздел | Баллы |
|---|---:|
| самостоятельная техническая аттестация | 15 |
| корректность данных и аналитики | 15 |
| mobile core UX/accessibility/offline | 10 |
| tests/security/privacy/deletion | 12 |
| AWS IaC/deploy/restore/operations/cost | 15 |
| store beta/review/release ownership | 10 |
| billing verification/entitlements/lifecycle | 10 |
| права на data/assets и claims | 5 |
| interviews/retention/unit economics/decision | 5 |
| объяснение и качество evidence | 3 |

Зачёт: минимум 80 баллов и ни одного критического провала.

## 7. Критические провалы

- secret/provider key в Git, mobile binary или логах;
- публичная база/Redis/private bucket;
- отсутствует восстановление backup;
- аналитика имеет неверный denominator или скрывает freshness;
- коммерческий запуск с неизвестными/запрещёнными правами;
- чужой logo/media без разрешения;
- privacy/store forms не совпадают с фактом;
- account deletion фиктивно;
- Pro выдаётся по client boolean/непроверенному receipt;
- duplicate notification повторно продлевает доступ;
- реальная подписка включена без tax/legal/store readiness;
- review/bета/выручка или пользовательские метрики выдуманы;
- tests отключены ради зелёного CI;
- нет production rollback/incident owner.

## 8. Финальное решение

После защиты выберите одно:

- `scale` — постепенно увеличивать аудиторию/бюджет;
- `iterate` — исправить основное слабое место и повторить cohort;
- `pivot` — сменить сегмент/problem/offer, сохранив техническое ядро;
- `pause` — остановить расходы до изменения прав/экономики/спроса.

Не добавляйте replay, ClickHouse или ML как награду за окончание курса. Следующая технология появляется только из измеренной проблемы.

## Навигация

[Главное оглавление](../README.md) · [Маршрут с нуля до запуска](03-zero-to-launch-roadmap.md) · [Техническая аттестация](02-final-assessment.md) · [Часть 24](part-24-monetization-business/README.md)

