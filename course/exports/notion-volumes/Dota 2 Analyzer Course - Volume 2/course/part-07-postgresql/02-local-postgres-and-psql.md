# Глава 2. Локальный PostgreSQL и `psql`

[← Глава 1](01-relational-model.md) · [Оглавление](README.md) · [Глава 3 →](03-types-null-and-create-table.md)

## Выбор локальной среды

Учебный вариант — PostgreSQL 18 в Docker Compose. Он повторяем и не требует смешивать файлы локальной установки с проектом. Нужны Docker Desktop и Compose plugin.

Проверьте:

```powershell
docker version
docker compose version
```

Если Docker недоступен, установите PostgreSQL 18 официальным installer и используйте те же SQL-команды. Не запускайте одновременно два сервера на одном порту.

## `compose.yaml`

Создайте в корне `practice/dota-data-pipeline`:

```yaml
services:
  postgres:
    image: postgres:18
    environment:
      POSTGRES_DB: dota_analyzer
      POSTGRES_USER: dota_app
      POSTGRES_PASSWORD: local_only_password
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dota_app -d dota_analyzer"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  postgres_data:
```

Это локальный пароль, не production secret. Привязка `127.0.0.1` не публикует порт на все сетевые интерфейсы.

## Команды lifecycle

```powershell
docker compose up -d postgres
docker compose ps
docker compose logs postgres
docker compose stop postgres
```

Не используйте удаление volume без понимания: volume содержит вашу базу. Остановить container и удалить данные — разные действия.

## Подключение `psql`

```powershell
docker compose exec postgres psql -U dota_app -d dota_analyzer
```

Prompt меняется на:

```text
dota_analyzer=#
```

Полезные meta-команды `psql` начинаются с обратного слеша и не являются SQL:

```text
\conninfo   текущее соединение
\dt         таблицы
\d heroes   структура таблицы
\x          расширенный вывод
\q          выход
```

SQL-команда заканчивается `;`. Если prompt стал `dota_analyzer-#`, вы не завершили выражение. Нажмите `Ctrl+C`, чтобы отменить незавершённый ввод.

## Connection string

```dotenv
DATABASE_URL=postgresql://dota_app:local_only_password@127.0.0.1:5432/dota_analyzer
```

Части:

```text
postgresql://user:password@host:port/database
```

Файл `.env` игнорируется Git. В production пароль должен быть уникальным и передаваться через secret manager. Если пароль содержит специальные URL-символы, его надо percent-encode или передавать отдельными параметрами driver.

## Роли

Для production обычно разделяют owner/migration role и runtime role. Runtime API не обязано иметь право `DROP TABLE`. В локальной лабораторной одна роль допустима, но границу надо помнить.

## Первая проверка

В `psql`:

```sql
SELECT current_database(), current_user, now();
SHOW timezone;
SET TIME ZONE 'UTC';
SHOW timezone;
```

`now()` возвращает timestamp транзакции. Система хранит момент времени независимо от отображаемого timezone; session timezone влияет на вывод.

## Самопроверка

- [ ] Container имеет health status.
- [ ] Порт доступен только localhost.
- [ ] Я различаю stop container и удаление volume.
- [ ] `DATABASE_URL` отсутствует в tracked `.env`.
- [ ] Я умею войти и выйти из `psql`.
