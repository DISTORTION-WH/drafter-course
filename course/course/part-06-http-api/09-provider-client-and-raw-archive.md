# Глава 9. Provider client и raw archive

[← Глава 8](08-opendota-contract.md) · [Оглавление](README.md) · [Глава 10 →](10-final-http-lab.md)

## Разделяем ответственности

```text
CLI
 └─ OpenDotaClient: endpoint и provider parameters
     └─ HttpClient: timeout/status/retry/JSON
         └─ fetch
```

Если всё написать в `main`, тестирование и замена provider станут трудными.

## Контракт HTTP-клиента

```ts
export type HttpJsonResult = {
  status: number;
  headers: Readonly<Record<string, string>>;
  body: unknown;
  receivedAt: string;
};

export interface HttpJsonClient {
  get(url: URL): Promise<HttpJsonResult>;
}
```

Interface описывает нужное поведение. OpenDota client не обязан знать, используется `fetch`, mock или запись ответа.

## Provider client

```ts
export class OpenDotaClient {
  constructor(
    private readonly http: HttpJsonClient,
    private readonly baseUrl: URL,
    private readonly apiKey?: string,
  ) {}

  async getMatch(matchId: string): Promise<HttpJsonResult> {
    if (!/^\d+$/.test(matchId)) {
      throw new Error('matchId must contain digits only');
    }

    const url = new URL(`matches/${matchId}`, this.baseUrl);
    if (this.apiKey !== undefined) url.searchParams.set('api_key', this.apiKey);

    return this.http.get(url);
  }
}
```

Почему возвращается raw result, а не `Match`: нормализация — следующая ответственность. В части 9 adapter будет использовать parser и canonical model.

## Raw envelope

Один JSON-файл должен содержать не только body:

```ts
export type RawEnvelope = {
  schemaVersion: 1;
  provider: 'opendota';
  resourceType: 'match';
  providerResourceId: string;
  requestedAt: string;
  receivedAt: string;
  httpStatus: number;
  bodySha256: string;
  payload: unknown;
};
```

`schemaVersion` описывает наш envelope, а не OpenDota. Hash помогает обнаружить дубликат/изменение. Не включайте API key или полный URL с ним.

## Безопасное имя файла

```ts
function buildRawFileName(matchId: string, receivedAt: string): string {
  const safeTimestamp = receivedAt.replaceAll(':', '-');
  return `opendota-match-${matchId}-${safeTimestamp}.json`;
}
```

Так как `matchId` заранее проверен как digits, он не может добавить `..` или `/`.

## Atomic write

Падение во время записи не должно оставить «готовый» обрезанный файл:

```ts
import { rename, writeFile } from 'node:fs/promises';

async function writeJsonAtomically(path: string, value: unknown): Promise<void> {
  const temporaryPath = `${path}.tmp`;
  const json = `${JSON.stringify(value, null, 2)}\n`;

  await writeFile(temporaryPath, json, { encoding: 'utf8', flag: 'wx' });
  await rename(temporaryPath, path);
}
```

Для production raw archive уйдёт в object storage с уникальным key. Локальная версия учит тому же принципу. На Windows rename не всегда заменяет существующий файл; уникальный timestamp делает collision маловероятным.

## Hash

```ts
import { createHash } from 'node:crypto';

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
```

Hash не шифрует payload и не скрывает данные. Это checksum/identifier содержимого.

## Redaction

Raw payload сохраняется максимально близко к источнику, но требования privacy важнее. Если источник содержит секреты, tokens или запрещённые к хранению поля, archive policy обязан их удалить/не принимать. Каждое преобразование документируется.

## Практика

Напишите unit-тесты:

- invalid match ID не вызывает HTTP client;
- URL строится относительно base URL;
- key добавляется, но не попадает в envelope;
- filename не содержит `:`;
- одинаковый body даёт одинаковый SHA-256.

## Самопроверка

- [ ] HTTP transport и provider endpoint разделены.
- [ ] Raw envelope хранит provenance и время.
- [ ] Запись атомарна.
- [ ] Secret не попадает в filename, payload metadata и log.
