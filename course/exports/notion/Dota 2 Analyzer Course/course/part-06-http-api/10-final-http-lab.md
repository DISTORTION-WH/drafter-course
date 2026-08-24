# Глава 10. Итоговая лабораторная: загрузить и сохранить матч

[← Глава 9](09-provider-client-and-raw-archive.md) · [Оглавление](README.md) · [Часть 7 →](../part-07-postgresql/README.md)

## Цель

Собрать весь путь части 6 без копирования готового «магического» файла:

```text
CLI argument
→ validated match ID
→ OpenDota URL
→ timeout + limited retry
→ status/content-type/JSON checks
→ raw envelope + SHA-256
→ atomic file
→ короткая безопасная сводка в console
```

## Итоговая структура

```text
practice/dota-data-pipeline/
├─ docs/providers/opendota.md
├─ src/
│  ├─ cli.ts
│  ├─ config.ts
│  ├─ errors.ts
│  ├─ http-client.ts
│  ├─ opendota-client.ts
│  ├─ raw-archive.ts
│  └─ validation.ts
├─ test/
│  ├─ http-client.test.ts
│  ├─ opendota-client.test.ts
│  └─ validation.test.ts
├─ data/raw/                 # ignored
├─ .env.example
├─ .gitignore
├─ package.json
└─ tsconfig.json
```

## Порядок реализации

### Шаг 1. Configuration

Создайте тип:

```ts
type AppConfig = {
  openDotaBaseUrl: URL;
  openDotaApiKey?: string;
  httpTimeoutMs: number;
  httpMaxAttempts: number;
  rawDirectory: string;
};
```

Parser config должен отклонять отрицательные, дробные и нечисловые значения. Значения по умолчанию задаются в одном месте.

### Шаг 2. Ошибки

Создайте `HttpStatusError`, `InvalidContentTypeError`, `InvalidJsonError`. Не нужен класс для каждой строки, но ошибки, по которым принимается решение retry, должны иметь поля.

### Шаг 3. Transport

`FetchHttpJsonClient.get`:

1. создаёт timeout signal;
2. вызывает fetch;
3. читает status и безопасные headers;
4. на неуспехе выбрасывает `HttpStatusError`;
5. проверяет content type;
6. разбирает body в `unknown`;
7. возвращает `receivedAt` в ISO 8601 UTC.

Для тестируемости внедрите `fetchFn`, `nowFn`, `sleepFn`.

### Шаг 4. Retry policy

Максимум три попытки. Повторяйте только временные статусы и transport errors. В log одной строки укажите attempt, status/category, delay — без key и полного body.

### Шаг 5. Provider client

Provider client знает base URL, endpoint и способ передать key. Он не пишет файлы.

### Шаг 6. Raw archive

Envelope содержит provider, resource type/ID, время, status, hash и payload. Сначала сериализуйте payload для hash, затем запишите envelope атомарно.

### Шаг 7. CLI

CLI принимает ровно один ID:

```powershell
pnpm fetch:match -- 8000000000
```

Успешный вывод короткий:

```text
provider=opendota resource=match id=8000000000 status=200
saved=data/raw/opendota-match-8000000000-2026-07-16T12-00-00.000Z.json
```

Не печатайте весь ответ по умолчанию.

## Обязательные тесты

| Сценарий | Ожидание |
|---|---|
| `200 application/json` | payload возвращён |
| `200 text/html` | ошибка content type |
| `200` с битым JSON | ошибка parser |
| `404` | одна попытка |
| `503`, затем `200` | две попытки |
| timeout трижды | три попытки и ошибка |
| invalid ID | сеть не вызывается |
| запись envelope | hash и metadata присутствуют |
| key настроен | отсутствует в log/envelope |

## Ручная проверка

```powershell
pnpm typecheck
pnpm test
pnpm fetch:match -- 8000000000
Get-ChildItem data/raw
git status --short
git check-ignore -v .env data/raw/example.json
```

Если sample match больше не существует, используйте актуальный ID из официального списка pro matches. Это ручная проверка; тесты не должны зависеть от live API.

## Commit plan

```text
feat(http): add typed JSON transport
feat(opendota): add match provider client
feat(raw): archive provider payload with provenance
test(http): cover retry and invalid responses
docs(provider): record OpenDota contract check
```

## Definition of done

- [ ] `pnpm typecheck` проходит.
- [ ] Все unit-тесты проходят без сети.
- [ ] Один ручной запрос сохраняет raw envelope.
- [ ] ID проверяется до сети и filesystem.
- [ ] Есть timeout, ограниченный retry и jitter.
- [ ] `404` не повторяется.
- [ ] Секреты и raw data игнорируются Git.
- [ ] Provider passport содержит дату и официальную документацию.
- [ ] Вы можете объяснить каждую функцию и зависимость.

## После лабораторной

Закоммитьте изменения в feature branch и проведите self-review. В части 7 сохранённый payload перестанет быть просто файлом: мы создадим реляционную схему PostgreSQL и загрузим в неё нормализованный матч.
