# Часть 7. SQL и PostgreSQL

[← Часть 6. HTTP и API](../part-06-http-api/README.md) · [Карта курса](../01-course-map.md) · [Часть 8. NestJS →](../part-08-nestjs-backend/README.md)

## Что мы строим

В части 6 один матч жил в JSON-файле. Теперь создаём PostgreSQL 18 и реляционную схему, способную хранить героев, игроков, команды, матчи, участников и действия draft.

Числа в SQL вы будете писать сами. Drizzle появится после чистого SQL, чтобы ORM не скрывала смысл запросов.

## Главы

1. [Реляционная модель: таблица, строка и отношение](01-relational-model.md)
2. [Локальный PostgreSQL и `psql`](02-local-postgres-and-psql.md)
3. [Типы, UTC, `NULL` и создание таблиц](03-types-null-and-create-table.md)
4. [Primary key, foreign key и ограничения](04-keys-constraints-relations.md)
5. [`INSERT`, `SELECT`, `UPDATE`, `DELETE`](05-crud-and-filtering.md)
6. [`JOIN`, `GROUP BY` и агрегаты](06-joins-and-aggregates.md)
7. [Индексы и `EXPLAIN`](07-indexes-and-explain.md)
8. [Транзакции, concurrency и upsert](08-transactions-and-upsert.md)
9. [Миграции и Drizzle](09-migrations-and-drizzle.md)
10. [Итоговая лабораторная: база матча](10-final-database-lab.md)

## Ключевые правила схемы

- Время события — `timestamptz`, все входные/выходные значения нормализуются в UTC.
- Duration — integer seconds, не timestamp.
- Внешние ID не являются автоматически нашими primary keys.
- Dota/Steam ID могут быть 64-bit; в собственном JSON API они будут строками.
- «Неизвестно» хранится как `NULL`, а не как ноль или пустая строка.
- Обязательные бизнес-инварианты закрепляются `NOT NULL`, `CHECK`, `UNIQUE`, foreign keys.
- Схема меняется только миграциями.

## Итог части

```text
raw JSON
→ проверенная нормализованная модель
→ одна транзакция
→ matches + match_players + draft_actions
→ SQL-запросы для backend
```

## Официальные справочники

- [PostgreSQL 18 documentation](https://www.postgresql.org/docs/18/)
- [SQL commands](https://www.postgresql.org/docs/18/sql-commands.html)
- [Data types](https://www.postgresql.org/docs/18/datatype.html)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)

На 16 июля 2026 года PostgreSQL 18 — текущая стабильная ветка документации; beta следующей major-версии не используем для учебной базы.
