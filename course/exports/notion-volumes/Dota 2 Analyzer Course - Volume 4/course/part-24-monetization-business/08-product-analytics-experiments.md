# Глава 8. Product analytics, privacy и эксперименты

## Результат главы

Вы будете понимать путь пользователя от первого запуска до повторной ценности и подписки, не собирая всё подряд и не доверяя client revenue events.

## 1. North Star и guardrails

Кандидат North Star:

```text
weekly users who complete at least N meaningful analysis sessions
```

Meaningful analysis — не просто screen view. Например:

```text
открыл матч + изучил draft/comparison
или применил meta filter + просмотрел достаточный результат
```

Guardrails:

- data correctness/freshness;
- crash-free users;
- API latency/errors;
- privacy opt-out/delete success;
- refund/support rate;
- provider quota/cost.

Рост clicks при неверной статистике — не успех.

## 2. Funnel

```text
install
-> onboarding_complete
-> account_created/login
-> first_search
-> first_match_analyzed   = activation candidate
-> second_session
-> watchlist_created
-> paywall_viewed(trigger)
-> purchase_started
-> server_verified_paid   = revenue conversion source
-> renewed
```

Финальное paid событие создаёт backend после official verification, а не mobile после закрытия store sheet.

## 3. Event contract

```ts
type ProductEventMap = {
  search_submitted: {
    queryType: 'player' | 'team' | 'match';
    resultCountBucket: '0' | '1-10' | '11+';
  };
  match_analysis_viewed: {
    source: 'search' | 'watchlist' | 'notification';
    freshnessBucket: '<1h' | '1-24h' | '>24h';
  };
  paywall_viewed: {
    trigger: 'advanced_filter' | 'watchlist_limit' | 'saved_report';
    experimentVariant: string | null;
  };
};
```

Не отправляйте query text/Steam ID/match notes автоматически. Bucket уменьшает чувствительность и cardinality.

Каждое событие имеет:

- owner;
- purpose/decision;
- schema version;
- allowed properties;
- retention;
- client/backend source;
- privacy classification;
- test.

## 4. Identity

Используйте случайный internal user ID. До login — anonymous installation/session ID с понятным consent/retention. Merge anonymous и authenticated history делайте только при законном основании и необходимости.

Не используйте email, Steam ID или purchase token как analytics user ID. Delete workflow должен удалить/анонимизировать product analytics согласно policy.

## 5. Activation и retention

Определите activation через наблюдение:

```text
activated = сделал действие, после которого вероятность вернуться заметно выше
```

Сравните cohorts:

- source;
- segment;
- platform/build;
- activated/not activated;
- free/pro;
- week joined.

Не подменяйте retention push-notification spam. Смотрите voluntary repeat value.

## 6. Эксперименты

Карточка:

```md
- hypothesis:
- population/exclusions:
- control/treatment:
- primary metric:
- guardrails:
- minimum duration/sample rationale:
- stop conditions:
- analysis owner:
- decision:
```

На маленькой beta чаще полезнее usability/qualitative evidence, чем ложная статистическая точность A/B теста.

## 7. Feature flags

Server-defined assignment:

```ts
type FeatureAssignment = {
  experiment: string;
  variant: 'control' | 'treatment';
  assignedAt: string;
};
```

Assignment стабилен для пользователя. Billing access не должен зависеть только от экспериментального client flag: entitlement имеет приоритет.

## 8. No dark patterns

Запрещённые продуктовые привычки:

- fake countdown/discount;
- спрятанная отмена/restore;
- предварительно выбранная дорогая опция без ясности;
- запутанное закрытие paywall;
- уведомление, притворяющееся системным;
- «остался один слот» без факта;
- guilt copy при отказе;
- consent, связанный с не нужным tracking.

Доверие особенно важно для аналитического продукта.

## 9. Data quality

Проверяйте:

- duplicate events;
- timezone;
- app version;
- offline queue/retry;
- bots/internal/test accounts;
- schema breaking changes;
- revenue reconciliation со store reports;
- dashboard freshness.

Не принимайте решение по dashboard без определения denominator.

## Практика

1. Выберите North Star и три guardrails.
2. Создайте event catalog максимум из 15 ключевых событий.
3. Добавьте schema validation/tests.
4. Постройте activation/retention funnel.
5. Удалите один event без decision purpose.
6. Проведите один безопасный experiment или qualitative test.

## Готово, если

- события отвечают на решения;
- verified purchase приходит с backend;
- personal IDs/tokens не попадают в analytics;
- cohorts имеют явный denominator;
- experiments имеют guardrails/stop;
- delete/retention применены;
- dark patterns отсутствуют.

