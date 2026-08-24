# Глава 4. Первый запрос через Node.js `fetch`

[← Глава 3](03-json-unknown-validation.md) · [Оглавление](README.md) · [Глава 5 →](05-timeout-errors-retry.md)

## Подготовка проекта

Node.js 24 содержит стабильный глобальный `fetch`; отдельный `node-fetch` для этого курса не нужен.

```powershell
pnpm add -D typescript @types/node
pnpm exec tsc --init
New-Item -ItemType Directory -Force src,test,data/raw
```

Минимальные важные настройки `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

В `package.json` добавьте `"type": "module"` и scripts:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "pnpm run build && node --test dist/test/**/*.test.js",
    "fetch:match": "pnpm run build && node dist/src/cli.js"
  }
}
```

## Первый клиент

`src/http.ts`:

```ts
export type JsonResponse = {
  status: number;
  headers: Record<string, string>;
  body: unknown;
};

export async function getJson(url: URL): Promise<JsonResponse> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`GET ${url.origin}${url.pathname}: HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`Expected JSON, received ${contentType || 'unknown content type'}`);
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch (error: unknown) {
    throw new Error('Response body is not valid JSON', { cause: error });
  }

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body,
  };
}
```

Почему функция `async`: внутри есть `await`, а результат приходит позже. Возвращаемый тип всегда `Promise<JsonResponse>`.

Почему сначала `text()`: при ошибке JSON parser мы можем отдельно диагностировать формат. Но не включайте весь body в exception — там могут быть персональные данные или огромный HTML.

## CLI как composition root

`src/cli.ts`:

```ts
import { getJson } from './http.js';

async function main(): Promise<void> {
  const matchId = process.argv[2];

  if (matchId === undefined || !/^\d+$/.test(matchId)) {
    throw new Error('Usage: pnpm fetch:match -- <numeric-match-id>');
  }

  const url = new URL(`matches/${matchId}`, 'https://api.opendota.com/api/');
  const result = await getJson(url);
  console.log(JSON.stringify(result.body, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
```

`main` — composition root: здесь соединяются аргументы, URL, клиент и вывод. Низкоуровневая функция `getJson` ничего не знает о CLI.

## Не тестируйте всё через живой API

Live-тест зависит от сети, квоты и состояния провайдера. Для автоматических тестов передавайте зависимость:

```ts
export type FetchLike = typeof fetch;

export async function getJson(url: URL, fetchFn: FetchLike = fetch) {
  const response = await fetchFn(url, { headers: { accept: 'application/json' } });
  // ...
}
```

Тест сможет подставить маленькую fake-функцию, возвращающую `Response`.

## Практика

1. Запустите typecheck.
2. Вызовите CLI с заведомо отсутствующим аргументом.
3. Один раз вызовите существующий match ID.
4. Не коммитьте полученный ответ.
5. Напишите fake-тест для статусов `200` и `500`.

## Самопроверка

- [ ] Для `fetch` в Node 24 не добавлена лишняя библиотека.
- [ ] TypeScript работает в strict mode.
- [ ] Ошибка верхнего уровня устанавливает ненулевой exit code.
- [ ] Unit-тест не обращается в интернет.
