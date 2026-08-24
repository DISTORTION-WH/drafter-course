# Часть 21. Пошаговая сборка единого MVP

До этой части вы изучали технологии по отдельности. Теперь вы создадите один основной repository и проведёте каждую функцию от данных до физического телефона.

## Результат

```text
permitted provider/fixture
-> raw archive + idempotent worker
-> PostgreSQL canonical data
-> analytics
-> NestJS/OpenAPI
-> generated TypeScript client
-> React Native/Expo application
-> auth/watchlist/notifications
-> tests/security/observability
-> release candidate
```

## Главы

1. [Зафиксировать MVP, пользователя и коммерческий data gate](01-scope-user-data-gate.md)
2. [Создать production monorepo и общий контракт](02-production-monorepo.md)
3. [Вертикаль №1: fixture → PostgreSQL → API → mobile](03-first-vertical-slice.md)
4. [Вертикаль №2: разрешённый provider и ingestion](04-provider-ingestion-slice.md)
5. [Матчи, серии, команды, игроки и драфты](05-core-domain-screens.md)
6. [Мета, поиск, фильтры и freshness](06-meta-search-freshness.md)
7. [Steam, watchlist и уведомления](07-auth-watchlist-notifications.md)
8. [Quality gate, безопасность и внутренние операции](08-quality-security-operations.md)
9. [Beta-тестирование и release candidate](09-beta-release-candidate.md)
10. [Итоговая лабораторная: полностью работающий MVP](10-complete-mvp-lab.md)

## Главное ограничение

На этом этапе не добавляйте replay parser, ClickHouse или ML, если они не нужны выбранному MVP. Используйте части 18–20 позже.

## Навигация

- [Рекомендуемый маршрут](../03-zero-to-launch-roadmap.md)
- [Назад: наблюдаемость и эксплуатация](../part-17-observability-operations/README.md)
- [Дальше: конкретное развёртывание в AWS](../part-22-aws-production/README.md)

