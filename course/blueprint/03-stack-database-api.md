# 3. Технологии, база данных и API

## 3.1. Выбранный стек

| Область | Технология |
|---|---|
| Основной язык | TypeScript со strict mode |
| Mobile | React Native + Expo Development Builds |
| Навигация | Expo Router |
| Серверные данные mobile | TanStack Query |
| Локальное UI-состояние | Zustand |
| Backend | Node.js LTS + NestJS + Fastify |
| Внешний контракт | REST + OpenAPI |
| Основная БД | PostgreSQL |
| Доступ к БД | Drizzle ORM + raw SQL |
| Очереди | Redis + BullMQ |
| Большие файлы | S3-совместимое object storage |
| Аналитика MVP | PostgreSQL materialized views |
| Аналитика на масштабе | ClickHouse |
| Replay parser | Java + Clarity |
| Монорепозиторий | pnpm workspaces + Turborepo |
| Логи | Pino |
| Ошибки | Sentry |
| Наблюдаемость | OpenTelemetry |
| Контейнеры | Docker |
| CI/CD | GitHub Actions |
| Mobile releases | EAS Build / EAS Update |

## 3.2. Почему REST на старте

Даже если внешний источник использует GraphQL, мобильному приложению предоставляется собственный REST API:

- проще кэшировать;
- проще логировать;
- проще документировать;
- проще ограничивать тяжёлые запросы;
- OpenAPI позволяет генерировать TypeScript-клиент;
- мобильное приложение не зависит от внешней схемы STRATZ.

## 3.3. Структура монорепозитория

```text
apps/
  mobile/
  api/
  worker/
  admin/

packages/
  contracts/
  dota-domain/
  db/
  providers/
  analytics/
  observability/
  config/
  ui/

services/
  replay-parser/

infra/
  docker/
  terraform/
  monitoring/
```

## 3.4. Основные сущности базы данных

### Справочники

- `heroes`;
- `items`;
- `abilities`;
- `patches`;
- `regions`;
- `game_modes`.

### Профессиональная сцена

- `players`;
- `player_aliases`;
- `pro_profiles`;
- `teams`;
- `rosters`;
- `roster_members`;
- `leagues`;
- `tournaments`;
- `series`;
- `series_matches`.

### Матчи

- `matches`;
- `match_players`;
- `picks_bans`;
- `item_events`;
- `ability_events`;
- `kill_events`;
- `objective_events`;
- `ward_events`;
- `teamfights`;
- `gold_snapshots`;
- `xp_snapshots`;
- `position_samples`.

### Инфраструктурные данные

- `raw_payloads`;
- `provider_entities`;
- `ingestion_runs`;
- `metric_definitions`;
- `outbox_events`.

### Пользователи

- `users`;
- `user_sessions`;
- `steam_links`;
- `watchlist_entries`;
- `push_devices`;
- `notification_preferences`.

## 3.5. Важные правила модели данных

### История составов

Недостаточно хранить только текущую команду игрока. Для каждого матча нужен состав, действовавший именно в момент матча.

### Идентификаторы

У одного игрока могут быть разные ID у Valve, OpenDota, STRATZ и турнирного провайдера. Для этого нужна отдельная таблица соответствий.

### SteamID64

Все 64-битные ID передаются через JSON строками. JavaScript `number` не гарантирует точное представление любого 64-битного целого.

### Время

Сервер и БД хранят время в UTC. Мобильное приложение отображает его в локальном часовом поясе пользователя.

### Происхождение

Важные записи содержат:

- источник;
- время загрузки;
- время обновления у источника;
- версию схемы;
- степень полноты;
- parser version для replay data.

## 3.6. Основные API endpoints

```http
GET /v1/matches
GET /v1/matches/:matchId
GET /v1/matches/:matchId/draft
GET /v1/matches/:matchId/timeline

GET /v1/teams
GET /v1/teams/:teamId
GET /v1/teams/:teamId/roster
GET /v1/teams/:teamId/form
GET /v1/teams/compare

GET /v1/players/:playerId
GET /v1/players/:playerId/matches
GET /v1/players/:playerId/heroes
GET /v1/players/:playerId/form
GET /v1/players/compare

GET /v1/meta/heroes
GET /v1/meta/heroes/:heroId
GET /v1/meta/pairs
GET /v1/meta/counters
GET /v1/meta/trends

GET /v1/tournaments
GET /v1/tournaments/:id
GET /v1/tournaments/:id/series

GET /v1/me/watchlist
POST /v1/me/watchlist
DELETE /v1/me/watchlist/:id
```

## 3.7. Правила API

- версия в URL;
- OpenAPI как источник правды;
- cursor pagination;
- единый формат ошибок;
- timestamps ISO 8601 UTC;
- большие ID строками;
- gzip/Brotli;
- `ETag`;
- request ID;
- rate limit;
- сгенерированный TypeScript client.

## 3.8. Mobile

Основные вкладки:

1. Главная.
2. Матчи.
3. Мета.
4. Избранное.
5. Поиск.

TanStack Query хранит состояние серверных запросов. Zustand используется только для локального состояния интерфейса: фильтров, темы и onboarding. Токены хранятся в SecureStore, а не в обычном AsyncStorage.

Просмотр профессиональной статистики работает без аккаунта. Авторизация требуется для избранного, push-уведомлений, синхронизации настроек и будущего личного профиля.

