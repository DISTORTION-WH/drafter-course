# Курс: разработка и запуск анализатора Dota 2 с нуля

Этот комплект предназначен для человека, который понимает идею продукта, но пока не умеет программировать. Предварительное знание JavaScript, TypeScript, Node.js, React, баз данных, Git, AWS или командной строки не требуется.

Итоговый учебный продукт — мобильное приложение для анализа профессиональных матчей Dota 2:

- расписание и история профессиональных матчей;
- страницы турниров, команд и игроков;
- драфты и результаты игр;
- мета героев по патчам и периодам;
- сравнение игроков и команд;
- поиск, watchlist и уведомления;
- собственные backend, база и фоновые импорты;
- production в AWS;
- TestFlight/Google Play beta;
- freemium/Pro-подписка с серверной проверкой;
- продуктовая аналитика, unit economics и план первого коммерческого эксперимента.

Доход не гарантируется. Курс доводит до технически и операционно готового коммерческого эксперимента; результат рынка может быть `scale`, `iterate`, `pivot` или `pause`.

## Как устроены материалы

Папка `blueprint` объясняет, какой продукт строится, почему выбрана архитектура, откуда берутся данные и какие правовые/коммерческие ограничения надо закрыть.

Папка `course` содержит последовательные объяснения, кодовые примеры, практику, критерии готовности и сквозные лабораторные. Начните с инструкции и не перескакивайте через обязательные gates.

Результаты структурной и содержательной проверки записаны в [отчёте о качестве](QUALITY-REPORT.md).

## Документы технического плана

1. [Продукт и границы MVP](blueprint/01-product-and-mvp.md)
2. [Источники данных и архитектура](blueprint/02-data-and-architecture.md)
3. [Технологии, база данных и API](blueprint/03-stack-database-api.md)
4. [Аналитика, качество и план разработки](blueprint/04-analytics-roadmap-risks.md)
5. [Источники документации и лицензионные проверки](blueprint/05-sources-and-licenses.md)
6. [AWS, публикация и коммерческий запуск](blueprint/06-aws-commercial-launch.md)

## Обязательный маршрут

1. [Как проходить курс](course/00-how-to-study.md)
2. [Полная карта курса](course/01-course-map.md)
3. [Маршрут от полного нуля до запуска](course/03-zero-to-launch-roadmap.md)
4. [Часть 1. Основы программирования](course/part-01-foundations/README.md)
5. [Часть 2. Инструменты и Node.js-проект](course/part-02-tooling/README.md)
6. [Часть 3. Углублённый JavaScript и асинхронность](course/part-03-advanced-javascript/README.md)
7. [Часть 4. TypeScript и безопасные модели данных](course/part-04-typescript/README.md)
8. [Часть 5. Git и дисциплина разработки](course/part-05-git/README.md)
9. [Часть 6. HTTP, JSON и внешние API](course/part-06-http-api/README.md)
10. [Часть 7. SQL и PostgreSQL](course/part-07-postgresql/README.md)
11. [Часть 8. Backend на Node.js, NestJS и Fastify](course/part-08-nestjs-backend/README.md)
12. [Часть 9. Сбор и нормализация данных Dota 2](course/part-09-data-ingestion/README.md)
13. [Часть 10. Аналитика меты Dota 2](course/part-10-analytics/README.md)
14. [Часть 11. Основы React и web-песочница](course/part-11-react/README.md)
15. [Часть 12. React Native и Expo](course/part-12-react-native-expo/README.md)
16. [Часть 13. Соединяем mobile с backend](course/part-13-mobile-backend/README.md)
17. [Часть 14. Пользователи, Steam, watchlist и уведомления](course/part-14-auth-steam-notifications/README.md)
18. [Часть 15. Тестирование и безопасность](course/part-15-testing-security/README.md)
19. [Часть 16. Docker, CI/CD и общая production-модель](course/part-16-docker-cicd-production/README.md)
20. [Часть 17. Наблюдаемость и эксплуатация](course/part-17-observability-operations/README.md)
21. [Часть 21. Собираем единый MVP](course/part-21-guided-mvp-assembly/README.md)
22. [Часть 22. Production в AWS](course/part-22-aws-production/README.md)
23. [Часть 23. Google Play и App Store](course/part-23-store-release/README.md)
24. [Часть 24. Монетизация и проверка бизнеса](course/part-24-monetization-business/README.md)
25. [Техническая аттестация](course/02-final-assessment.md)
26. [Коммерческий выпускной проект](course/04-commercial-graduation-project.md)

## Необязательные углубления после запуска

Эти части не нужны для первого релиза и могут создать лишние расходы/правовые риски до подтверждения спроса:

- [Часть 18. Replay pipeline на Java и Clarity](course/part-18-replay-clarity/README.md)
- [Часть 19. Масштабирование аналитики с ClickHouse](course/part-19-clickhouse-scaling/README.md)
- [Часть 20. Прогнозирование профессиональных матчей и ML](course/part-20-ml-predictions/README.md)

## Правило курса

Каждая технология появляется после того, как понятна решаемая задача. Вы перепечатываете и объясняете код, запускаете проверки, фиксируете ошибки и собираете вертикальные срезы. Большой готовый проект не копируется вслепую.

## Текущий статус комплекта

- 24 части курса и два финальных проекта подготовлены;
- части 1–17 дают знания от переменной и функции до production operations;
- часть 21 собирает один реальный MVP;
- часть 22 даёт конкретный AWS-путь с CDK, ECS Fargate, RDS, HTTPS, CI/CD, restore и cost control;
- часть 23 доводит приложение до официальной store beta/review;
- часть 24 реализует безопасную подписку, серверные entitlements, проверку спроса и unit economics;
- части 18–20 оставлены как необязательные advanced-модули;
- коммерческий запуск запрещён до подтверждения прав на данные/активы и готовности privacy, налогов и store agreements.
