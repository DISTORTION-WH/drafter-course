# Модуль 19. Ограниченный запуск и выпускной результат

## Результат

Вы не просто «закончите код»: приложение пройдёт небольшой контролируемый beta launch, production monitoring, проверку экономики и store rollout. В конце есть доказуемый список того, что работает, и backlog, основанный на поведении пользователей.

## 1. События продукта, которые отвечают на вопросы

Не собирайте каждое касание экрана. Создайте минимальный `ProductEvent`:

```prisma
model ProductEvent {
  id        String   @id @default(cuid())
  userId    String?
  name      String
  properties Json
  occurredAt DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([name, occurredAt])
  @@index([userId, occurredAt])
}
```

В `User` добавьте `productEvents ProductEvent[]`. При удалении account `userId` события становится `null`; агрегированная метрика остаётся, связь с человеком исчезает.

Разрешённый server-side список event names:

```ts
const productEventNameSchema = z.enum([
  'account_created',
  'match_opened',
  'meta_filter_used',
  'team_watched',
  'comparison_opened',
  'paywall_opened',
  'purchase_started',
  'purchase_completed',
]);
```

Public `POST /v1/events` принимает только `match_opened`, `meta_filter_used`, `team_watched`, `comparison_opened`, `paywall_opened`, `purchase_started`; `userId` всегда берётся из access token. `account_created` пишет auth service, а `purchase_completed` — только RevenueCat reconciliation worker. Не позволяйте client прислать эти два server-confirmed события.

Сохраняйте только необходимые properties: entity type, patch присутствует/нет, plan identifier. Не отправляйте bearer tokens, Steam profile URL, free-form search query или raw device identifiers.

`purchase_completed` подтверждается server entitlement/webhook, а не только client tap. Это делает revenue funnel честным.

Перед сбором analytics приведите privacy policy/consent в соответствие с реальными странами и processors. Если правовое основание не определено, не включайте необязательное tracking.

## 2. Определить показатели до запуска

Зафиксируйте в `docs/product/metrics.md`:

```text
Activation:
  новый user в первые 7 дней открыл >= 3 матча
  и использовал meta filter или добавил команду в watchlist

Week-1 retention:
  activated user создал значимое событие на 8–14 день

Free -> paywall:
  unique paywall_opened / activated users

Trial/purchase conversion:
  confirmed purchase_completed / unique paywall_opened

Importer freshness:
  now - latest successfully stored professional match
```

`signups` сами по себе не показывают ценность. `downloads` не равны active users. Revenue считается только по подтверждённым store transactions с учётом refunds.

## 3. Первая beta — 20–50 подходящих людей

Найдите не случайных знакомых, а зрителей pro Dota, amateur analysts, fantasy/competitive community members. Запускайте через TestFlight/closed Play test.

Дайте им одну задачу без подсказок:

```text
Найдите последний матч интересующей команды,
посмотрите draft, сравните двух игроков,
добавьте команду в watchlist и настройте уведомления.
```

После выполнения спросите:

- где ожидали нажать, но не нашли;
- чему в статистике не доверяют и почему;
- какой фильтр реально нужен еженедельно;
- за какую продолжающуюся ценность готовы платить;
- что помешало включить watchlist/push;
- встретили ли неверный матч/состав/patch.

Не объясняйте интерфейс во время задания: наблюдаемая трудность — данные для продукта.

## 4. Stop conditions и incident runbooks

До production rollout запишите условия остановки:

- массово неверные победители/составы;
- importer stale больше согласованного окна;
- login/exchange failure выше порога;
- crash-free sessions ниже цели;
- entitlement даёт доступ не тому user или забирает оплаченный доступ;
- 5xx/latency alarm;
- неожиданный рост AWS расходов;
- источник данных отозвал право использования.

Runbooks:

```text
docs/runbooks/provider-outage.md
docs/runbooks/billing-incident.md
docs/runbooks/api-rollback.md
docs/runbooks/database-restore.md
docs/runbooks/data-correction.md
```

Каждый содержит: сигнал, ответственный, диагностику, безопасное временное действие, rollback/recovery, сообщение пользователям и postmortem.

## 5. Постепенный production rollout

Последовательность:

1. deploy backend и migration в staging;
2. automated + manual smoke;
3. тот же commit в production backend;
4. smoke production;
5. store release 5–10% аудитории;
6. наблюдать crash/5xx/billing/data freshness минимум сутки;
7. увеличивать процент только при зелёных gates;
8. после 100% оставить alarms и daily data-quality report.

Не выпускайте backend-breaking change, пока старые mobile versions ещё ходят в API. Сохраняйте `/v1` compatibility либо выпускайте `/v2`.

## 6. Экономика без обещания заработка

Создайте `docs/product/unit-economics.md` и обновляйте реальными числами:

```text
gross MRR = active monthly-equivalent subscribers × average gross monthly price
net receipts = store/provider payouts после commission, taxes, refunds
contribution = net receipts - AWS - data provider - Sentry/RevenueCat/other variable costs
break-even subscribers = monthly fixed costs / contribution per subscriber
```

Не подставляйте желаемую conversion как факт. Отдельно храните:

- observed beta conversion;
- число пользователей в каждой ступени funnel;
- refund rate;
- churn/renewal;
- infrastructure cost per active user;
- стоимость/условия data license;
- support time.

До подтверждённого retention не покупайте дорогую масштабируемую инфраструктуру «на будущее». До подтверждённых прав на данные не включайте оплату публичной аудитории.

## 7. Ваша финальная аналогичная задача: data-quality report

Создайте `apps/worker/src/jobs/daily-data-quality.ts`, потому что доверие — основа аналитического продукта.

Функция `buildDailyDataQualityReport(now)` возвращает:

- `latestMatchAgeMinutes`;
- `matchesLast24Hours`;
- `matchesWithoutWinner` старше 3 часов;
- `matchesWithoutTenParticipants`;
- `unknownHeroNames`;
- `duplicateProviderMatches` (должно быть 0 благодаря constraint);
- `failedJobsLast24Hours`;
- `generatedAt`.

Точные переменные каждого query отражают показатель: `latestMatch`, `incompleteMatches`, `unknownHeroes`. Никаких `data1`, `result2`.

Scheduler запускает job ежедневно, пишет structured event и custom CloudWatch metrics. Если freshness/incomplete выходит за threshold, alarm ссылается на `provider-outage.md` или `data-correction.md`.

Эталон вычисления возраста:

```ts
const latestMatchAgeMinutes = latestMatch
  ? Math.floor((now.getTime() - latestMatch.startTime.getTime()) / 60_000)
  : null;
```

Test фиксирует `now`, создаёт один полный и один неполный матч и проверяет все counts. Этот последний код соединяет освоенные навыки: Prisma, понятные переменные, даты, worker, tests, metrics и production runbook.

## 8. Выпускные критерии

Курс завершён, когда вы можете показать, а не только рассказать:

- public repository без secrets;
- reproducible local start одной документированной последовательностью;
- provider adapter с validation и legal decision record;
- повторный import без дублей;
- матчи, draft, команды, игроки, турниры и meta в API/mobile;
- Steam login, refresh rotation, logout и account deletion;
- watchlist и push на физическом устройстве;
- unit/integration/e2e/mobile tests в CI;
- staging и production AWS stacks;
- tested RDS restore и rollback procedure;
- TestFlight и Google Play test release;
- sandbox purchase, restore, expiration/refund reconciliation;
- privacy/terms/support/delete-account pages;
- beta feedback и измеренные activation/retention/conversion;
- data-quality report и работающие alarms.

Финальный commit/tag:

```powershell
pnpm -r typecheck
pnpm -r test
pnpm --filter @dota/api build
pnpm --filter @dota/worker build
git add apps packages infra docs scripts
git commit -m "release: complete Dota Analyzer v1"
git tag v1.0.0
```

Заработок не является гарантированным техническим результатом курса. Гарантируемый проверяемый результат — работающее опубликованное приложение, корректный billing path, измеримая воронка и данные, по которым можно решить, за что пользователи действительно платят.

[Вернуться к оглавлению](README.md)
