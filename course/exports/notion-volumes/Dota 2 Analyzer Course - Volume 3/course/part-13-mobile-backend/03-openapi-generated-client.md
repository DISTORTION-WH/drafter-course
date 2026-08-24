# Глава 3. Генерация OpenAPI-клиента

## 1. Выбранный подход

Используем два небольших инструмента:

- `openapi-typescript` превращает `openapi.json` в TypeScript-типы;
- `openapi-fetch` выполняет запросы с этими типами.

Команды сверяйте с актуальной документацией пакетов. В workspace клиента:

```bash
pnpm add openapi-fetch
pnpm add -D openapi-typescript
```

Современные версии генератора требуют современный Node.js; в курсе мы уже закрепили единую версию Node для monorepo. Не обновляйте генератор случайно в одном package — версию фиксирует lockfile.

## 2. Где хранить спецификацию

Рекомендуемая цепочка:

```text
apps/api/openapi/openapi.json
        -> packages/api-client/src/generated/schema.ts
        -> apps/mobile импортирует packages/api-client
```

Если API и mobile живут в разных репозиториях, backend публикует версионированный artifact спецификации. Mobile не скачивает «текущий production OpenAPI» в середине обычной сборки: иначе одна и та же commit-сборка становится невоспроизводимой.

## 3. Скрипт генерации

В `packages/api-client/package.json`:

```json
{
  "scripts": {
    "api:generate": "openapi-typescript ../../apps/api/openapi/openapi.json -o src/generated/schema.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

После экспорта спецификации:

```bash
pnpm --filter @dota/api-client api:generate
```

Названия package зависят от вашего monorepo. Важно понимать параметры:

- вход — зафиксированный `openapi.json`;
- `-o` — путь к генерируемому TypeScript-файлу;
- результат коммитится вместе с изменением контракта;
- заголовок файла предупреждает, что его нельзя редактировать.

## 4. Что появляется в schema.ts

Обычно генератор создаёт большие типы:

```ts
export interface paths {
  '/v1/matches': {
    get: operations['listMatches'];
  };
}

export interface components {
  schemas: {
    MatchSummaryDto: {
      id: string;
      startedAt: string;
    };
  };
}
```

Не копируйте эти типы в `mobile/types.ts`. Если интерфейсу нужен удобный view model, создайте явное преобразование:

```ts
type MatchSummaryDto =
  components['schemas']['MatchSummaryDto'];

type MatchCardModel = {
  id: string;
  startLabel: string;
};

export function toMatchCardModel(dto: MatchSummaryDto): MatchCardModel {
  return {
    id: dto.id,
    startLabel: new Date(dto.startedAt).toLocaleString(),
  };
}
```

DTO отвечает за транспорт, `MatchCardModel` — за отображение. Форматированная локальная дата не должна возвращаться backend, потому что язык и часовой пояс принадлежат устройству.

## 5. Базовый клиент

Создайте `packages/api-client/src/client.ts`:

```ts
import createClient from 'openapi-fetch';
import type { paths } from './generated/schema';

export function createApiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl });
}

export type ApiClient = ReturnType<typeof createApiClient>;
```

Здесь generic `<paths>` связывает строку URL, параметры и форму ответа. При опечатке в пути или query-поле TypeScript сможет остановить сборку.

Использование:

```ts
const { data, error, response } = await client.GET('/v1/matches', {
  params: {
    query: {
      limit: 20,
    },
  },
});
```

Проверяйте `error` и `response.status`; не используйте небезопасное утверждение `data as MatchesPage`.

## 6. Индекс публичных экспортов

Файл `packages/api-client/src/index.ts`:

```ts
export { createApiClient } from './client';
export type { ApiClient } from './client';
export type { components, operations, paths } from './generated/schema';
```

Mobile импортирует только публичный индекс package. Это позволяет позже изменить внутреннюю структуру без массовой правки экранов.

## 7. Проверка в CI

Pipeline контракта:

```text
1. собрать backend
2. экспортировать openapi.json
3. запустить api:generate
4. проверить, что git diff пуст
5. запустить typecheck api-client и mobile
```

Если diff не пуст, разработчик изменил DTO, но забыл обновить artifact или клиент. Для определения ломающих изменений можно добавить специализированный OpenAPI-diff инструмент, однако сначала полезнее дисциплина стабильных DTO и обязательный review спецификации.

Рекомендуемая настройка TypeScript — `noUncheckedIndexedAccess: true`: доступ по произвольному индексу тогда честно возвращает возможность `undefined`.

## 8. Упражнение

Сгенерируйте типы и намеренно попробуйте:

1. передать `limit: '20'`, если контракт ожидает число;
2. вызвать `/v1/matche` с опечаткой;
3. обратиться к несуществующему полю DTO;
4. вручную изменить generated-файл, а затем снова запустить генерацию.

Зафиксируйте, какие ошибки ловит TypeScript, а какие всё ещё требуют runtime-проверки и тестов.

[Предыдущая глава](02-environments-and-networking.md) · [Оглавление](README.md) · [Следующая глава](04-http-transport-and-errors.md)

