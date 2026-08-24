# Глава 10. Итоговая лабораторная: mobile работает на собственном API

## Цель

Полностью удалить fixtures из пользовательского потока «список матчей → детали → meta» и подключить development build к вашему NestJS backend.

## 1. Подготовьте backend

Нужно, чтобы локально работали:

```text
GET /health
GET /v1/matches?limit=20
GET /v1/matches/{matchId}
GET /v1/meta/snapshot
```

Seed должен содержать:

- минимум 45 матчей для трёх страниц;
- два матча с одинаковым `startedAt`;
- известную команду для фильтра;
- законченный и идущий матч;
- meta snapshot;
- один отсутствующий ID для 404.

Экспортируйте OpenAPI из той же сборки, которую запускаете.

## 2. Создайте api-client package

Структура:

```text
packages/api-client/
  package.json
  tsconfig.json
  src/
    api-error.ts
    client.ts
    generated/schema.ts
    index.ts
```

Добавьте генерацию, запустите её и убедитесь, что package проходит `tsc --noEmit`.

## 3. Настройте mobile

Создайте:

```text
apps/mobile/src/
  config/env.ts
  api/api-client-provider.tsx
  api/error-presentation.ts
  features/matches/api/
    match-api.ts
    match-query-keys.ts
    use-matches.ts
    use-match.ts
  features/meta/api/
    meta-api.ts
    meta-query-keys.ts
    use-meta-snapshot.ts
```

Один экземпляр клиента создаётся на base URL и предоставляется через context/provider. Не создавайте новый клиент при каждом render.

## 4. Подключите экраны

### Список матчей

Экран обязан иметь:

- skeleton первой загрузки;
- `FlatList`;
- cursor pagination;
- фильтр команды;
- pull-to-refresh;
- нижний loader;
- отдельную ошибку следующей страницы;
- empty state;
- warning при ошибке фонового обновления.

### Детали матча

- строковый `matchId` из маршрута валидируется;
- краткая карточка может быть placeholder;
- выполняется настоящий detail request;
- 404 имеет отдельный экран;
- неизвестная ошибка показывает возможность retry и `requestId` в деталях.

### Meta

- показывает `patch`, период snapshot и `updatedAt`;
- не выдаёт старый snapshot за live-данные;
- показывает методологическую подпись из части аналитики;
- поддерживает stale cache.

## 5. Проверьте сеть

Тестовая матрица:

| Сценарий | Ожидаемый результат |
|---|---|
| backend выключен до старта | понятный network error |
| backend выключен после загрузки | кэш остаётся видимым |
| сеть вернулась | активный stale query обновился |
| 500 | retry ограничен, request ID доступен |
| 400 invalid cursor | предложение обновить с начала |
| медленная сеть | нет двойной следующей страницы |
| смена фильтра | старый запрос отменён/не портит новый список |

Проверьте Android и iOS development builds хотя бы на одном реальном устройстве. Expo Go не должен быть единственной средой проверки production-функций.

## 6. Автоматические проверки

Добавьте:

- unit-тест нормализации query keys;
- unit-тест `ApiError` mapping;
- тест infinite page flattening;
- component test success/empty/error;
- backend e2e cursor pagination;
- CI-проверку OpenAPI generation diff;
- mobile и api-client typecheck.

## 7. Необходимый ручной review

Откройте network/server logs и проверьте:

- один экран не создаёт бесконечный refetch;
- query не содержит секретов;
- Steam API key никогда не попал в mobile;
- `matchId` не округлился как JavaScript number;
- время показано в локальной зоне, но передано в UTC;
- ошибка следующей страницы не скрыла старые данные;
- production build не указывает на local/staging.

## 8. Definition of Done части 13

Часть завершена, если:

- все три экрана получают данные только с вашего backend;
- OpenAPI генерирует типизированный клиент;
- dev/staging/prod выбирают разные API без правки кода;
- physical device достигает local backend;
- пагинация, фильтры и cache keys протестированы;
- offline/reconnect UX предсказуем;
- ошибка содержит безопасный код и request ID;
- CI ловит рассинхронизацию спецификации;
- fixtures остались только в тестах и Storybook-подобных сценариях.

## Что дальше

Публичная аналитика уже работает без регистрации. В следующей части добавим только те персональные функции, которым действительно нужна учётная запись: Steam identity, watchlist, настройки и push-уведомления.

[Предыдущая глава](09-contract-testing-observability.md) · [Оглавление части](README.md) · [Перейти к части 14](../part-14-auth-steam-notifications/README.md)
