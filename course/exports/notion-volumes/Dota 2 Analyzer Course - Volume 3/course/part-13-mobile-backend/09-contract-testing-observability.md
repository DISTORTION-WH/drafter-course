# Глава 9. Контрактные тесты и наблюдаемость

## 1. Что мы хотим доказать

Типизация полезна, но полноценная проверка отвечает на несколько вопросов:

1. Backend действительно экспортирует ожидаемую OpenAPI-схему?
2. Generated client соответствует committed-схеме?
3. Backend в runtime возвращает DTO, описанный схемой?
4. Mobile корректно обрабатывает успех, пустоту и ошибки?
5. По production-сбою можно найти серверный trace без записи секретов?

## 2. Проверка спецификации в CI

Минимальный job:

```text
pnpm install --frozen-lockfile
pnpm api:build
pnpm api:openapi:export
pnpm api-client:generate
git diff --exit-code -- openapi generated-client
pnpm api-client:typecheck
pnpm mobile:typecheck
```

Команды — логическая схема; свяжите их с реальными script names monorepo. `git diff --exit-code` ничего не исправляет, а сообщает, что developer забыл закоммитить результат.

## 3. Backend e2e как проверка runtime

Для `GET /v1/matches` e2e-тест:

- поднимает контролируемую тестовую БД;
- добавляет несколько матчей, включая одинаковое время;
- вызывает endpoint как HTTP-клиент;
- проверяет статус и ключевые поля;
- проверяет cursor на следующей странице;
- проверяет invalid cursor;
- очищает данные независимо от порядка тестов.

Не вызывайте внешний Steam/OpenDota в таком тесте. Подменяйте provider fixture на границе адаптера.

## 4. Mobile integration test

Экрану не нужен настоящий интернет, чтобы проверить UI. Подайте контролируемую реализацию transport/API:

```ts
type MatchesApi = {
  listMatches(input: ListMatchesInput, signal?: AbortSignal): Promise<MatchesPage>;
};
```

Тестовая реализация возвращает fixtures или бросает `ApiError`. Так проверяются:

- skeleton;
- список;
- empty state;
- 404;
- 500 с request ID;
- ошибка следующей страницы;
- retry.

Не мокайте внутренности TanStack Query, если проверяете экран: создайте отдельный `QueryClient` с отключёнными retries и очистите его после теста.

## 5. Сквозная проверка staging

Небольшой E2E smoke test запускается против staging:

```text
открыть development/preview build
проверить название окружения
загрузить список
открыть известный матч
применить фильтр
дозагрузить следующую страницу
```

Не привязывайте тест к случайному live-матчу. В staging нужен стабильный seed dataset или специальный тестовый турнир.

## 6. Correlation/request ID

Mobile отправляет безопасный client request ID или backend создаёт собственный. Backend возвращает ID в заголовке/ошибке и добавляет его в логи/trace.

Полезный набор контекста:

```text
requestId
route template
HTTP status
duration
app version/build
platform
environment
server release
```

Не делайте идентификатор пользователя обязательным полем каждого мобильного лога. Для authenticated событий используйте псевдонимизированный внутренний ID только при законной необходимости и с ограниченным retention.

## 7. Метрики mobile-backend границы

На backend измеряйте:

- количество запросов по endpoint/status;
- p50/p95/p99 latency;
- долю 5xx и 429;
- размер страницы и ответа;
- cache hit ratio;
- ошибки cursor;
- версию клиента для несовместимых запросов.

На mobile:

- долю экранов с load error;
- длительность до первого содержательного контента;
- повторные попытки;
- падения при декодировании/рендере;
- версию приложения и ОС.

Не отправляйте весь DTO матча в error tracker.

## 8. Definition of Done контракта

Изменение endpoint готово, когда:

- DTO валидируется на backend;
- OpenAPI обновлена и review пройден;
- generated client обновлён;
- backend e2e проверяет runtime;
- mobile обрабатывает success/empty/error;
- old mobile contract не сломан без миграции;
- dashboards различают статус и latency;
- секреты и персональные данные отсутствуют в логах.

[Предыдущая глава](08-reconnect-offline-error-ux.md) · [Оглавление](README.md) · [Следующая глава](10-final-mobile-backend-lab.md)

