# 6. AWS, публикация и коммерческий запуск

## 6.1. Честный результат курса

Курс должен привести не к набору скопированных фрагментов, а к трём последовательным результатам:

1. **Рабочий MVP** — приложение получает разрешённые данные профессиональных матчей, сохраняет их, считает мету и показывает mobile UI.
2. **Production-сервис** — backend работает в AWS, mobile проходит beta/store release, данные защищены, расходы ограничены, backup восстановлен на учениях.
3. **Коммерчески готовый продукт** — права на используемые данные и изображения подтверждены, premium entitlement проверяется сервером, покупка проходит sandbox, продуктовые метрики и поддержка работают.

Курс не может гарантировать прибыль. Доход зависит от спроса, качества продукта, прав на коммерческое использование данных, маркетинга, конкурентов, цены, региона и исполнения. Проверяемый результат — продукт, который технически и юридически подготовлен к продаже и получил реальную проверку у целевой аудитории.

## 6.2. Коммерческий стоп-кран

До рекламы, платной подписки или sponsorship создаётся `docs/legal/data-rights-register.md`.

Для каждого источника и вида материала записываются:

| Ресурс | Источник | Что используем | Коммерческое право | Атрибуция | Retention | Подтверждение |
|---|---|---|---|---|---|---|
| match facts | provider | IDs, draft, result | verified/pending/denied | ... | ... | URL/договор/email |
| replay | provider | derived combat/positions | ... | ... | ... | ... |
| hero art | правообладатель | icons | ... | ... | ... | ... |
| team logo | команда/provider | image | ... | ... | ... | ... |
| player photo | ... | image | ... | ... | ... | ... |

Статусы `pending` и `denied` блокируют коммерческий release соответствующей функции. Лицензия программного кода не равна праву коммерчески перераспространять данные, логотипы, фотографии или игровые assets.

Steam Web API Terms разрешают использование только в указанных ими границах и могут изменяться или быть прекращены. На 17 июля 2026 условия требуют, среди прочего, конфиденциальности ключа, privacy policy, недопустимости впечатления об endorsement Valve и содержат ограничения использования Steam Data. Перед монетизацией требуется повторная проверка условий и, если коммерческое право не выражено однозначно, письменное разрешение/коммерческий договор или другой разрешённый источник.

Приложение не называется официальным продуктом Valve, не копирует Dota 2/Steam logo как собственный бренд и не обещает betting outcome.

## 6.3. Рекомендуемый обязательный путь

```text
части 1–5   -> язык, инструменты, TypeScript, Git
части 6–10  -> HTTP, PostgreSQL, backend, ingestion, analytics
части 11–15 -> React Native, API integration, auth, tests/security
части 16–17 -> container/release/operations principles
часть 21    -> собрать единый MVP от начала до конца
часть 22    -> развернуть конкретно в AWS
часть 23    -> выпустить Android/iOS beta и production
часть 24    -> реализовать разрешённую монетизацию и запустить продажи
выпускной проект -> доказать весь путь
```

Части 18–20 — replay parsing, ClickHouse и ML — не нужны для первого платного MVP. Они добавляются после подтверждения спроса или измеренной технической необходимости.

## 6.4. AWS reference architecture

Production-shaped вариант:

```text
mobile app
   |
Route 53 + ACM HTTPS
   |
Application Load Balancer
   |
ECS Fargate API service -------- CloudWatch
   |
   +------ RDS PostgreSQL
   +------ ElastiCache, только если BullMQ уже нужен
   +------ private S3 artifacts

ECS worker service
   +------ providers/replays
   +------ RDS/outbox
   +------ S3

EventBridge Scheduler
   -> ECS scheduled discovery/reconciliation task

ECR <- GitHub Actions through OIDC
Secrets Manager -> ECS task secrets
CloudFront + private S3 -> support/privacy/account-deletion web pages
```

Infrastructure описывается AWS CDK v2 на TypeScript. Console используется для обучения и диагностики, но production resources воспроизводятся из code.

## 6.5. Два ценовых профиля

### Pilot

- один production account и отдельный staging environment;
- минимальное число Fargate tasks;
- RDS Single-AZ с PITR и проверенным restore;
- PostgreSQL outbox вместо Redis, если throughput позволяет;
- ограниченные логи/retention;
- feature flags выключают дорогие replay/ML;
- принято окно возможного простоя.

### Standard

- отдельные AWS accounts для production и non-production;
- ECS tasks в private subnets минимум двух AZ;
- RDS Multi-AZ;
- ElastiCache с TLS/RBAC, если очередь критична;
- NAT/VPC endpoints по рассчитанной модели;
- WAF только после threat/cost decision;
- регулярные restore и incident drills.

Переход определяется SLO, риском и revenue, а не желанием выглядеть «enterprise». Текущая стоимость каждый раз рассчитывается в AWS Pricing Calculator; числа из курса не являются прайс-листом.

## 6.6. Выбранная стартовая монетизация

Основной учебный вариант — freemium subscription:

### Бесплатно

- расписание и результаты;
- базовые детали матча;
- ограниченный текущий meta view;
- небольшое число watchlist subscriptions;
- базовые уведомления.

### Premium

- расширенные фильтры и длинные периоды;
- сравнение команд/игроков;
- больше watchlists и настраиваемых уведомлений;
- сохранённые аналитические views;
- advanced draft/meta reports;
- экспорт только при наличии права перераспространять соответствующие данные.

Фактический результат матча, account deletion, privacy controls и уже приобретённые права пользователя не прячутся за paywall.

На iOS и Android доступ к цифровым функциям продаётся согласно актуальным правилам соответствующего store. Исключения, alternative billing и внешние ссылки зависят от storefront/программы и меняются; их нельзя переносить из статьи или другого приложения без повторной проверки.

## 6.7. Entitlement, а не флаг в телефоне

```text
store purchase
-> signed/store purchase token
-> secure backend verification
-> immutable billing event
-> entitlement state
-> API authorization for premium capability
-> mobile renders allowed state
```

Mobile не сам решает, что пользователь premium. Backend проверяет Apple/Google status, обрабатывает renewal, grace period, cancellation, refund, billing retry и duplicate notifications. Webhooks/notifications являются сигналом; authoritative status при необходимости запрашивается у store API.

## 6.8. Бизнес-метрики

До запуска определяются:

- activation: пользователь получил первый полезный meta insight;
- D1/D7/D30 retention;
- weekly active users;
- free-to-trial и trial-to-paid conversion;
- monthly recurring revenue;
- voluntary/involuntary churn;
- refund rate;
- support requests;
- gross revenue minus store fee/tax/provider/AWS/support cost;
- contribution margin;
- cost per active/free/paid user.

Event tracking проходит privacy review. Нельзя собирать «всё на будущее».

## 6.9. Go-to-market

До разработки premium проводится 10–20 интервью с представителями выбранного сегмента: аналитики, тренеры, комментаторы, контент-мейкеры или продвинутые зрители. Проверяется одна проблема, а не вопрос «нравится ли идея».

Первый запуск:

```text
landing page + waitlist
-> 10–30 закрытых testers
-> weekly interviews/support
-> исправление activation/retention
-> store beta
-> one paid offer
-> measured acquisition experiments
```

Спам, покупка отзывов, скрытая реклама, использование чужих сообществ без правил и ложные claims запрещены.

## 6.10. Полное определение готовности

- critical path MVP работает на physical devices;
- provider/data/image commercial rights зарегистрированы;
- AWS infrastructure воспроизводится CDK;
- root MFA, temporary credentials, least privilege и budgets настроены;
- API/worker/scheduler работают независимо;
- RDS PITR и restore проверены;
- S3 private, CloudFront использует OAC для публичных web assets;
- GitHub deploy использует OIDC, а не вечные AWS keys;
- Android/iOS store metadata, privacy forms и account deletion соответствуют текущим требованиям;
- sandbox purchases и lifecycle cases проходят;
- entitlement проверяется backend;
- store notifications идемпотентны и reconciled;
- pricing/unit economics посчитаны по реальным текущим комиссиям и cloud estimate;
- product analytics минимальна и согласована с privacy forms;
- support и incident process работают;
- публичный launch имеет feature flags и rollback;
- доход не обещается: решение продолжать определяется реальными retention/conversion и правами на данные.

## Первичные источники

- [AWS CDK v2](https://docs.aws.amazon.com/cdk/v2/guide/getting-started.html)
- [Amazon ECS/Fargate и load balancing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-load-balancing.html)
- [Amazon RDS backups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html)
- [AWS IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Pricing Calculator](https://calculator.aws/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple subscriptions](https://developer.apple.com/app-store/subscriptions/)
- [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)
- [Google Play Billing security](https://developer.android.com/google/play/billing/security)
- [Expo in-app purchases](https://docs.expo.dev/guides/in-app-purchases/)
- [Steam Web API Terms of Use](https://steamcommunity.com/dev/apiterms)

