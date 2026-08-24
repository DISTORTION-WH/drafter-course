# Глава 2. Граница OLTP и OLAP

## Цель

Разделить ответственность PostgreSQL и ClickHouse так, чтобы аналитический сбой не ломал авторизацию, матч-центр и избранное.

## 1. Два вида работы

**OLTP** — Online Transaction Processing. Это много коротких операций над небольшим числом строк:

- создать session;
- добавить команду в watchlist;
- обновить статус ingestion job;
- получить один матч;
- гарантировать foreign key и уникальность.

**OLAP** — Online Analytical Processing. Это чтение больших исторических наборов:

- сгруппировать урон по патчу и герою;
- построить heatmap по миллионам координат;
- сравнить команды за 12 месяцев;
- вычислить percentile длительности teamfight;
- пересчитать витрину меты.

Разница не в названии базы, а в форме нагрузки и гарантиях.

## 2. Таблица владения данными

| Данные | Владелец | Почему |
|---|---|---|
| пользователи и sessions | PostgreSQL | транзакции, уникальность, немедленная запись |
| watchlist и push devices | PostgreSQL | пользовательское изменяемое состояние |
| канонические матчи/серии/турниры | PostgreSQL | предметная целостность и corrections |
| ingestion state/outbox | PostgreSQL | durable workflow и блокировки |
| raw provider/replay artifacts | Object storage | неизменяемый большой оригинал |
| combat/position event analytics | ClickHouse | массовое колоночное сканирование |
| heatmap/teamfight aggregates | ClickHouse | быстрые группировки |
| указатель current parser output | PostgreSQL | атомарный quality gate |
| модель/manifest аналитики | PostgreSQL + artifact | аудит и воспроизводимость |

Слово «владелец» означает: именно это хранилище отвечает на вопрос, какое состояние каноническое.

## 3. Не делайте синхронную двойную запись

Плохой request path:

```text
HTTP request
-> INSERT PostgreSQL
-> INSERT ClickHouse
-> ответ 200
```

Что произойдёт, если PostgreSQL уже подтвердил commit, а ClickHouse недоступен? Общей транзакции между двумя базами нет. Откатывать пользовательскую операцию из-за аналитического слоя неправильно.

Надёжнее:

```text
PostgreSQL transaction
  -> canonical change
  -> outbox row
commit

separate exporter
  -> claims outbox
  -> builds deterministic analytical batch
  -> inserts ClickHouse
  -> records checkpoint
```

Outbox — обычная таблица событий, записываемая в той же транзакции, что и каноническое изменение. Она не гарантирует «ровно один раз», зато не теряет факт, который нужно экспортировать.

Для replay-событий источником может быть immutable parser artifact. Тогда PostgreSQL outbox содержит ссылку, checksum, parser/schema version и разрешение на экспорт, но не миллионы событий внутри строки.

## 4. Консистентность становится явной

ClickHouse replica будет **eventually consistent**: после появления canonical output аналитика обновится чуть позже.

Нужны три времени:

- `sourceCompletedAt` — когда канонический output стал valid;
- `exportedAt` — когда loader обработал artifact;
- `analyticsAvailableAt` — когда данные доступны для чтения.

Freshness lag:

```text
analyticsAvailableAt - sourceCompletedAt
```

API может возвращать:

```json
{
  "data": [],
  "freshness": {
    "asOf": "2026-07-16T10:00:00Z",
    "lagSeconds": 86,
    "status": "fresh"
  }
}
```

Не обещайте пользователю мгновенную аналитику, если архитектура асинхронная.

## 5. Domain service скрывает базу

Controller не должен импортировать ClickHouse client напрямую:

```ts
export type HeatmapQuery = {
  patchId: string;
  heroId?: number;
  from: Date;
  to: Date;
  gridSize: 32;
};

export interface HeatmapAnalytics {
  getHeatmap(query: HeatmapQuery): Promise<HeatmapResult>;
}
```

Адаптеры:

```text
PostgresHeatmapAnalytics
ClickHouseHeatmapAnalytics
ShadowComparingHeatmapAnalytics
```

Контроллер знает интерфейс, но не реализацию. Feature flag переключает адаптер без изменения HTTP-контракта.

## 6. Read path с деградацией

Не каждый сбой должен приводить к fallback. Иначе медленный ClickHouse плюс медленный PostgreSQL удвоят нагрузку.

Заранее задайте политику:

- match details всегда читаются из PostgreSQL;
- расширенный heatmap может вернуть `503 ANALYTICS_TEMPORARILY_UNAVAILABLE`;
- заранее рассчитанный старый aggregate можно вернуть с `stale: true`;
- fallback разрешён только для небольшого диапазона и с отдельным timeout;
- mobile показывает понятное состояние, а не бесконечный spinner.

## 7. Что нельзя соединять в request path

Избегайте запроса, который на каждый экран делает большой join между PostgreSQL и ClickHouse. Базы не знают об общей транзакции, network join дорог, а диагностика сложна.

Варианты:

- передавать небольшие dimension attributes в ClickHouse вместе с событием;
- держать версионируемый dictionary/snapshot;
- получить небольшой canonical объект из PostgreSQL и независимый aggregate из ClickHouse;
- объединить два результата в domain service;
- заранее материализовать витрину.

Дублирование допустимо, если понятно, кто владелец и как исправление распространяется.

## 8. Corrections и удаления

Аналитические события удобно считать append-oriented, но профессиональные данные исправляются: команда переименована, матч признан недействительным, parser output заменён.

Определите политику:

1. canonical correction получает новую версию;
2. exporter создаёт replacement/tombstone command;
3. аналитическая таблица либо учитывает последнюю версию, либо перестраивает затронутую партицию;
4. агрегаты пересчитываются;
5. reconciliation подтверждает отсутствие старого current результата.

Не используйте ручной `DELETE` в production как основной workflow.

## 9. Диаграмма потока

```text
provider/replay
      |
      v
canonical PostgreSQL -----> object storage
      |                          |
      +------ outbox/artifact ---+
                   |
                   v
              export worker
                   |
                   v
              ClickHouse raw
                   |
                   v
          aggregate tables / API
```

Стрелка к ClickHouse однонаправленная. ClickHouse не обновляет каноническое состояние.

## 10. Практика

1. Составьте таблицу владения для всех сущностей вашего проекта.
2. Нарисуйте happy path и недоступность ClickHouse.
3. Создайте интерфейс `HeatmapAnalytics`.
4. Опишите допустимую freshness и stale policy.
5. Запишите correction workflow.
6. Добавьте правило: ни один login/watchlist endpoint не зависит от ClickHouse.

## Критерии готовности

- у каждого типа данных один канонический владелец;
- нет синхронной двойной записи;
- экспорт начинается из durable outbox/artifact;
- freshness измеряется и видна API;
- ClickHouse скрыт за domain interface;
- определены timeout, stale и unavailable behavior;
- correction и rollback описаны;
- OLTP работает при полной недоступности аналитики.

[Предыдущая глава](01-when-clickhouse.md) · [Оглавление части](README.md) · [Следующая глава](03-event-model-schema.md)

