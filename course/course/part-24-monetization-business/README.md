# Часть 24. Монетизация, подписка и проверка бизнеса

## Честный результат

К концу части приложение будет технически и операционно готово принимать покупки цифровой подписки через разрешённый механизм магазина, восстанавливать entitlement на backend и измерять продуктовую экономику.

Курс не может гарантировать доход. Доход зависит от прав на данные, ценности продукта, конкуренции, страны, налогов, маркетинга и исполнения. «Начать зарабатывать» здесь означает создать законный канал оплаты, провести ограниченный запуск и получить фактический рыночный сигнал — включая возможный результат «пока никто не платит».

## Stop-gates до продаж

Нельзя включать production payment, пока:

- подтверждено коммерческое использование всех источников данных/активов;
- издатель может законно заключить договоры Apple/Google и получать выплаты;
- проверены налоги, consumer rules, refunds и privacy в рынках запуска;
- free core честно показывает источник и свежесть;
- серверная верификация покупок и idempotency протестированы;
- support готов к billing tickets;
- price и trial не вводят пользователя в заблуждение.

## Базовая бизнес-модель курса

Для первого эксперимента: freemium + одна автоматически продлеваемая подписка Pro на месяц и, после проверки, на год.

Free:

- поиск профессиональных матчей/игроков/команд;
- базовая карточка матча и текущая meta;
- ограниченный watchlist;
- явная freshness.

Pro-кандидаты:

- расширенные фильтры и сравнения;
- больше watchlist/уведомлений;
- сохранённые views/collections;
- расширенная история и экспорт, только если разрешены права/стоимость;
- аналитические отчёты, не выдаваемые за гарантированный прогноз.

Не закрывайте безопасность, privacy, deletion или исправление неверных данных paywall.

## Главы

1. [Права, спрос и отсутствие гарантий](01-rights-demand-reality.md)
2. [Интервью, landing page и проблема](02-interviews-landing-validation.md)
3. [Модель дохода и freemium offer](03-revenue-model-freemium-offer.md)
4. [Billing domain и серверный entitlement](04-billing-domain-entitlements.md)
5. [Покупка и восстановление в React Native](05-react-native-in-app-purchases.md)
6. [Apple/Google server verification и lifecycle](06-store-server-verification.md)
7. [Цена, налоги и unit economics](07-pricing-tax-unit-economics.md)
8. [Product analytics и эксперименты](08-product-analytics-experiments.md)
9. [90-дневный go-to-market и support](09-go-to-market-90-days.md)
10. [Итоговая лабораторная: первый коммерческий эксперимент](10-final-commercial-lab.md)

## Официальные точки проверки

- [Apple subscriptions](https://developer.apple.com/app-store/subscriptions/)
- [Apple App Store Server API](https://developer.apple.com/documentation/appstoreserverapi/)
- [Google Play subscriptions](https://developer.android.com/google/play/billing/subscriptions)
- [Google Play billing security](https://developer.android.com/google/play/billing/security)
- [Expo in-app purchases](https://docs.expo.dev/guides/in-app-purchases/)

## После части

Выполните [выпускной проект](../04-commercial-graduation-project.md) и только затем увеличивайте трафик/расходы.

