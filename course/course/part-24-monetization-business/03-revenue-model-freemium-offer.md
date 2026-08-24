# Глава 3. Модель дохода и freemium offer

## Результат главы

Вы сравните варианты монетизации и сформируете один понятный Pro offer, не разрушая доверие к данным.

## 1. Варианты

| Модель | Когда подходит | Риск |
|---|---|---|
| подписка B2C | постоянная свежая ценность | churn, store fees, billing complexity |
| one-time unlock | функция не требует постоянных расходов | слабое покрытие ongoing data cost |
| реклама | очень большая бесплатная аудитория | privacy, UX, низкий доход на малом масштабе |
| sponsorship | нишевая аудитория/контент | зависимость и disclosure конфликта |
| B2B/team seats | профессиональный workflow | sales/support/contracts длиннее |
| API/data export | права и инфраструктура явно разрешают | лицензии, abuse, высокий SLA |
| affiliate | совместимый релевантный продукт | disclosure/policy/reputation |

Не добавляйте real-money betting, loot boxes или prediction gambling как «быстрый доход». Это отдельный регулируемый бизнес с высокими рисками.

## 2. Почему стартуем с подписки

Данные и инфраструктура требуют постоянных расходов, а ценность meta/уведомлений обновляется. Поэтому subscription — разумная гипотеза, не истина.

Начальная сложность:

```text
1 entitlement: pro
1 monthly product per store
annual product только после понимания retention/refunds
без credits, tiers, family/team seats и lifetime одновременно
```

## 3. Free обещает самостоятельную ценность

Free не должен быть сломанным demo:

- найти и открыть матч;
- увидеть базовый draft/result;
- посмотреть ограниченный meta snapshot;
- понять source/time window/sample/freshness;
- сохранить небольшой watchlist;
- удалить аккаунт и управлять privacy.

Если free не даёт `aha moment`, пользователь не узнает, зачем Pro.

## 4. Pro outcome

Плохое описание: «ещё больше функций».

Хорошее:

```text
Сравнивайте hero trends по patch/region/tournament,
сохраняйте расширенные filters и получайте watchlist alerts,
чтобы подготовить обзор быстрее.
```

Каждая Pro-функция проходит:

- rights gate;
- data/provider cost;
- store digital goods rule;
- privacy review;
- measurable use;
- graceful downgrade.

## 5. Paywall

Paywall показывает:

- конкретный результат;
- что доступно free и Pro;
- фактическую localized цену из StoreKit/Play Billing;
- billing period;
- trial/intro eligibility и условия, если есть;
- auto-renewal explanation;
- restore purchases;
- manage/cancel subscription route;
- terms/privacy links;
- close/back без ловушки.

Не хардкодьте `$4.99`: валюта, налог и storefront отличаются. Отображайте product details магазина.

## 6. Где показывать paywall

После intent:

```text
пользователь применил Pro filter
пытается добавить watchlist сверх free limit
хочет сохранить расширенный report
```

Не показывайте на первом запуске до понимания продукта. Измеряйте `paywall_view` вместе с trigger, а не одной суммой.

## 7. Downgrade

При окончании Pro:

- не удаляйте мгновенно данные без предупреждения;
- запретите создание сверх лимита;
- дайте выбрать, какие watchlist items оставить active;
- сохраните export/read-only на разумный срок, если это соответствует policy;
- остановите premium notifications;
- UI должен следовать server entitlement.

## 8. B2B как будущая ветка

Если интервью показывают команды/creators с большим budget, валидируйте отдельно:

- seats/roles;
- invoice/tax;
- data export/SLA;
- permission to use data commercially for customers;
- security/DPA;
- support hours.

Не смешивайте B2B invoice entitlement с mobile subscription без единой backend-модели.

## Практика

1. Оцените все модели по правам, спросу, сложности и margin.
2. Выберите одну на 8 недель.
3. Напишите Free/Pro entitlement matrix.
4. Сделайте paywall prototype и пять usability tests.
5. Проверьте downgrade experience.
6. Удалите функции, не усиливающие основной outcome.

## Готово, если

- один offer понятен одним предложением;
- free доставляет ценность;
- Pro имеет постоянный outcome;
- цена приходит из магазина;
- restore/manage/cancel видимы;
- downgrade не уничтожает доверие;
- betting исключён из scope.

## Официальные материалы

- [Apple auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- [Google Play subscriptions](https://developer.android.com/google/play/billing/subscriptions)
- [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)

