# Полная карта курса

Курс построен как последовательность вертикальных результатов. После каждого раздела появляется новая работающая возможность приложения.

## Часть 0. Ориентация

Темы:

- из каких частей состоит приложение;
- файл, папка, программа, процесс и сервер;
- frontend, backend, база данных и API;
- как читать код;
- как пользоваться курсом и журналом ошибок.

Результат: вы можете обычными словами описать путь данных от OpenDota до экрана телефона.

## Часть 1. Основы программирования на JavaScript

Темы:

- значения;
- переменные `const` и `let`;
- типы данных;
- арифметика и сравнение;
- `if`, `else`, `switch`;
- циклы;
- функции;
- параметры и `return`;
- область видимости;
- массивы и объекты;
- методы массивов;
- ошибки и простая отладка.

Практика: консольный анализатор статистики одного матча.

Результат:

```text
массив игроков → проверка данных → KDA/GPM/XPM → командная сводка
```

## Часть 2. Инструменты разработчика

Темы:

- VS Code;
- терминал PowerShell;
- пути и рабочая директория;
- Node.js и npm/pnpm;
- `package.json`;
- зависимости;
- scripts;
- форматирование;
- ESLint;
- чтение stack trace.

Практика: запуск консольного анализатора через package script.

## Часть 3. JavaScript глубже

Темы:

- модули `import/export`;
- destructuring;
- spread/rest;
- callback;
- higher-order functions;
- `Map` и `Set`;
- immutable transformations;
- классы только там, где нужны;
- `Promise`;
- `async/await`;
- `try/catch`;
- event loop на практическом уровне.

Практика: чтение списка матчей из локального JSON-файла.

## Часть 4. TypeScript

Темы:

- зачем нужны типы;
- primitive types;
- массивы и tuples;
- `type` и `interface`;
- unions;
- optional fields;
- narrowing;
- generics;
- utility types;
- `unknown` против `any`;
- strict mode;
- проверка внешних данных во время выполнения.

Практика: модели `Match`, `Player`, `Team`, `Hero` и безопасный parser JSON.

## Часть 5. Git и дисциплина разработки

Темы:

- repository;
- working tree;
- commit;
- branch;
- merge;
- `.gitignore`;
- небольшие commits;
- чтение diff;
- безопасное исправление ошибок;
- базовый code review.

Практика: история разработки учебного проекта с осмысленными commits.

## Часть 6. HTTP, JSON и внешние API

Темы:

- клиент и сервер;
- URL;
- HTTP method;
- headers;
- body;
- status codes;
- JSON;
- REST;
- pagination;
- rate limits;
- timeout;
- retry;
- API key;
- почему ключ нельзя хранить в mobile.

Практика: получить реальные данные OpenDota, проверить и сохранить raw JSON.

## Часть 7. SQL и PostgreSQL

Темы:

- таблица, строка и столбец;
- primary key;
- foreign key;
- `SELECT`, `INSERT`, `UPDATE`, `DELETE`;
- `WHERE`, `ORDER BY`, `GROUP BY`;
- `JOIN`;
- агрегаты;
- индексы;
- транзакции;
- нормализация;
- миграции;
- `JSONB`;
- даты и UTC.

Практика: база героев, матчей и игроков.

## Часть 8. Backend на Node.js и NestJS

Темы:

- долгоживущий серверный процесс;
- модуль;
- controller;
- service;
- repository;
- dependency injection;
- DTO;
- validation;
- конфигурация;
- обработка ошибок;
- OpenAPI;
- REST versioning;
- logging.

Практика:

```http
GET /v1/matches
GET /v1/matches/:id
GET /v1/teams/:id
```

## Часть 9. Сбор и нормализация Dota 2 данных

Темы:

- provider adapter;
- canonical model;
- raw payload archive;
- mapping внешних ID;
- idempotency;
- upsert;
- retries;
- quotas;
- data completeness;
- reconciliation;
- background jobs;
- Redis и BullMQ.

Практика: worker автоматически загружает новые матчи и обновляет их в PostgreSQL.

## Часть 10. Аналитика

Темы:

- pick/ban/contest/win rate;
- sample size;
- фильтры по патчу;
- materialized views;
- форма игроков и команд;
- пары и контрпики;
- интервалы;
- версия метрики;
- data freshness.

Практика: backend выдаёт мету героев текущего патча.

## Часть 11. Основы React

Темы:

- component;
- props;
- state;
- render;
- event handler;
- controlled input;
- list rendering;
- keys;
- hooks;
- effects;
- композиция компонентов;
- loading/error/empty states.

Практика: web-песочница со списком матчей перед переходом к mobile.

## Часть 12. React Native и Expo

Темы:

- native component;
- layout через Flexbox;
- styling;
- Expo Router;
- tabs и stack navigation;
- deep links;
- изображения;
- виртуализированные списки;
- TanStack Query;
- Zustand;
- SecureStore;
- offline cache;
- charts;
- accessibility.

Практика: мобильные экраны матчей, команд, игроков и меты.

## Часть 13. Соединение mobile и backend

Темы:

- environment-specific API URL;
- generated OpenAPI client;
- query keys;
- cache invalidation;
- pagination;
- filters;
- optimistic updates;
- error UX;
- network reconnect.

Практика: mobile полностью работает на собственном backend.

## Часть 14. Пользователи, Steam и уведомления

Темы:

- guest mode;
- access и refresh tokens;
- server-side Steam OpenID;
- universal/app links;
- session rotation;
- watchlist;
- push tokens;
- notification preferences;
- FCM/APNs через Expo;
- logout и удаление аккаунта.

Практика: пользователь связывает Steam, сохраняет команду и получает уведомление.

## Часть 15. Тестирование и безопасность

Темы:

- unit/integration/E2E;
- Vitest;
- Testcontainers;
- contract fixtures;
- React Native Testing Library;
- Maestro;
- SQL constraints;
- rate limiting;
- secret management;
- input validation;
- backup и restore;
- dependency scanning.

Практика: тестовый набор для критического пути приложения.

## Часть 16. Docker, CI/CD и production

Темы:

- image и container;
- Dockerfile;
- Docker Compose;
- dev/staging/prod;
- managed PostgreSQL и Redis;
- object storage;
- migrations при deployment;
- GitHub Actions;
- EAS builds;
- rollback;
- feature flags.

Практика: staging и production deployment.

## Часть 17. Наблюдаемость и эксплуатация

Темы:

- structured logs;
- request ID и job ID;
- metrics;
- traces;
- Sentry;
- OpenTelemetry;
- data freshness;
- queue depth;
- alerts;
- incident runbooks;
- восстановление backup.

Практика: dashboard здоровья системы и тестовый incident.

## Часть 18. Продвинутый replay pipeline

Темы:

- replay-файл;
- Clarity;
- Java parser service;
- object storage;
- parse queue;
- parser/schema version;
- golden replays;
- combat log;
- позиции;
- heatmap;
- corrupted replay.

Практика: отдельный replay parser для ограниченного набора матчей.

## Часть 19. Масштабирование аналитики

Темы:

- OLTP и OLAP;
- ClickHouse;
- событийная модель;
- партиционирование;
- columnar queries;
- pre-aggregation;
- перенос тяжёлых событий из PostgreSQL;
- нагрузочные тесты.

Практика: интерактивная аналитика большого event dataset.

## Часть 20. Предсказания и ML, необязательная

Темы:

- корректная постановка задачи;
- признаки до начала матча;
- time-based split;
- leakage;
- baseline;
- Elo/Glicko;
- logistic regression;
- gradient boosting;
- calibration;
- patch drift.

Практика: прозрачная baseline-модель с честной оценкой.

## Часть 21. Обязательная сборка единого MVP

Темы:

- один production monorepo вместо разрозненных упражнений;
- data rights gate;
- vertical slices provider → database → API → mobile;
- матчи, игроки, команды, meta, поиск;
- auth, watchlist и уведомления;
- security/quality/release candidate;
- реальная beta на физическом устройстве.

Практика: собрать изученные компоненты в один ограниченный MVP и передать его первым 10–30 тестировщикам.

## Часть 22. Обязательный production в AWS

Темы:

- AWS account/IAM/MFA/budget;
- CDK на TypeScript;
- VPC, ALB, HTTPS, Route 53 и ACM;
- ECR, ECS Fargate API/worker/scheduler/migration tasks;
- private RDS PostgreSQL, backup/PITR/restore;
- S3, CloudFront, Secrets Manager и optional ElastiCache;
- GitHub OIDC, exact digest, staged deployment и rollback;
- CloudWatch, incidents, capacity и FinOps.

Практика: воспроизводимые staging и production с проверенным restore/rollback и месячным расчётом стоимости.

## Часть 23. Обязательная публикация

Темы:

- developer accounts, signing и неизменяемые identifiers;
- Expo development/preview/production builds;
- privacy/support/terms/account deletion;
- asset/data/trademark checks;
- Google Play internal/closed testing;
- App Store Connect/TestFlight;
- EAS Build/Submit;
- review, staged rollout и emergency release.

Практика: минимум один официальный beta channel с реальными тестировщиками; второй канал завершён либо имеет честно описанный внешний blocker.

## Часть 24. Обязательная коммерческая проверка

Темы:

- коммерческие права и stop-gates;
- interviews, landing/waitlist и сегмент;
- freemium + один Pro entitlement;
- React Native in-app purchase в native build;
- Apple/Google server verification, notifications и reconciliation;
- pricing, taxes, store fees и unit economics;
- product analytics без тёмных паттернов;
- 90-дневный go-to-market и support.

Практика: sandbox lifecycle и ограниченный честный production offer только после закрытия правовых, налоговых и store gates.

## [Техническая аттестация](02-final-assessment.md)

Вы самостоятельно выполняете изменение, которого не было в курсе:

> Добавить фильтр меты по tournament tier от базы данных до мобильного интерфейса, включая миграцию, API contract, тесты, UI и deployment.

Если вы можете выполнить эту задачу и объяснить каждый слой, вы не просто скопировали приложение — вы научились его развивать.

## [Коммерческий выпускной проект](04-commercial-graduation-project.md)

Вы объединяете technical assessment, AWS deployment, store beta, privacy/rights, серверную подписку, cohort evidence и unit economics. Финальное решение может быть `scale`, `iterate`, `pivot` или `pause`; курс не обещает гарантированный доход.
