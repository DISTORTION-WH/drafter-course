# Глава 7. API key, переменные окружения и секреты

[← Глава 6](06-rate-limit-pagination-cache.md) · [Оглавление](README.md) · [Глава 8 →](08-opendota-contract.md)

## API key не является пользовательским паролем

Ключ обычно идентифицирует ваше приложение или тариф. Тот, кто его получил, может расходовать квоту и действовать от имени проекта. Поэтому ключ хранится только на server-side.

## Почему mobile не может сохранить общий provider key

Любой секрет, встроенный в React Native bundle, можно извлечь. SecureStore защищает пользовательские tokens на устройстве, но не превращает общий ключ приложения в недоступный пользователю секрет.

Правильный путь:

```text
React Native → наш backend → OpenDota
```

## Переменные окружения

PowerShell для текущего процесса:

```powershell
$env:OPENDOTA_API_KEY = 'значение-только-для-локального-сеанса'
pnpm fetch:match -- 8000000000
```

Node.js:

```ts
function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value === '' ? undefined : value;
}

const apiKey = readOptionalEnv('OPENDOTA_API_KEY');
```

Отсутствие ключа может быть допустимо для endpoint/free tier. Для обязательной настройки используйте функцию, которая fail fast:

```ts
function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
```

## `.env` — удобство, не магия

Node может читать env-файл через параметр запуска, либо проект может использовать configuration library. Независимо от механизма:

`.env.example`:

```dotenv
OPENDOTA_API_KEY=
OPENDOTA_BASE_URL=https://api.opendota.com/api/
HTTP_TIMEOUT_MS=10000
```

`.gitignore`:

```gitignore
.env
.env.*
!.env.example
data/raw/
```

В example хранят имена и безопасные значения, но не реальный секрет.

## Не передавайте key в path и logs

Query string часто попадает в access logs. Если API требует `?api_key=...`, logger должен редактировать URL:

```ts
function redactUrl(url: URL): string {
  const copy = new URL(url);
  for (const key of ['api_key', 'key', 'token']) {
    if (copy.searchParams.has(key)) copy.searchParams.set(key, '[REDACTED]');
  }
  return copy.toString();
}
```

Лучше header, если provider его поддерживает, но контракт выбирает provider.

## Если secret уже попал в Git

Недостаточно удалить строку новым commit: значение остаётся в истории. Порядок:

1. немедленно revoke/rotate ключ у provider;
2. удалить использование из текущего кода;
3. оценить необходимость очистки истории;
4. уведомить тех, кто мог получить ключ;
5. проверить logs и CI artifacts.

Главное действие — rotation. «Спрятать» старый ключ после утечки невозможно.

## Production

В production secret передаёт платформа deployment или secret manager. Он не находится в image, Dockerfile, repository, mobile build и документации.

## Практика

1. Добавьте `.env.example` и правила ignore.
2. Выполните `git check-ignore -v .env`.
3. Напишите config parser для URL и положительных integer.
4. Проверьте, что exception не печатает key.
5. Добавьте тест `redactUrl`.

## Самопроверка

- [ ] Ключ отсутствует в Git и mobile.
- [ ] Приложение валидирует configuration при старте.
- [ ] Logger редактирует секретные query-параметры и headers.
- [ ] Я знаю процедуру rotation.
