# Глава 4. MergeTree, ключ сортировки и партиционирование

## Цель

Понять физическую организацию ClickHouse: почему `ORDER BY` важнее привычного мышления индексами, чем primary key отличается от уникального ключа и почему слишком мелкие partitions вредят.

## 1. Что делает семейство MergeTree

При вставке ClickHouse создаёт immutable data parts. Внутри каждого part строки физически отсортированы по ключу `ORDER BY`. Фоновые merges объединяют небольшие parts в крупные.

Упрощённо:

```text
INSERT batch A -> part A, sorted
INSERT batch B -> part B, sorted
background merge -> larger sorted part C
```

Отсюда следуют три правила:

1. частые крошечные inserts создают слишком много parts;
2. фильтр по началу ключа сортировки позволяет пропустить большие диапазоны;
3. неправильный `ORDER BY` нельзя исправить добавлением десятков обычных B-tree индексов.

## 2. `ORDER BY` — физический выбор

Сначала выпишите реальные запросы:

### Workload A: мета по патчу

```text
WHERE patch_id = ?
  AND tournament_tier = ?
  AND event_type = ?
  AND match_started_at BETWEEN ? AND ?
GROUP BY hero_id
```

### Workload B: timeline одного матча

```text
WHERE match_id = ?
ORDER BY tick, sequence
```

Один ключ не идеален для обоих. Если основной массовый workload — A, возможен ключ:

```sql
ORDER BY
(
    patch_id,
    tournament_tier,
    event_type,
    match_started_at,
    match_id,
    tick,
    sequence
)
```

Тогда запрос одного старого `match_id` без первых полей может сканировать больше данных. Решения:

- timeline остаётся небольшим artifact/PostgreSQL view;
- отдельная таблица с другим ключом для match detail;
- projection, если benchmark подтверждает пользу и команда готова её сопровождать;
- заранее собранный timeline artifact.

Не пытайтесь заставить одну raw table идеально обслуживать все возможные экраны.

## 3. Кардинальность и порядок полей

Часто полезно начинать с полей, которые:

- постоянно присутствуют в фильтре;
- хорошо группируют соседние строки;
- имеют умеренную кардинальность;
- соответствуют диапазону времени.

Но правило «от низкой кардинальности к высокой» не абсолютное. Если `tenant_id` или `match_id` всегда задаётся первым, workload может требовать его в начале. Решение подтверждает benchmark на данных, похожих на production.

Создайте три кандидатных схемы, загрузите одинаковый набор и сравните `rows_read`, `bytes_read`, latency и compression.

## 4. `PRIMARY KEY` не гарантирует уникальность

В MergeTree primary key — разреженный индекс по отсортированным данным. Он помогает находить granules, но не запрещает две одинаковые строки.

Это законно:

```text
event_id = abc
event_id = abc
```

Поэтому:

- уникальность обеспечивается producer contract и ingestion ledger;
- duplicate detection выполняется reconciliation-запросами;
- API aggregates проектируются с учётом delivery semantics;
- нельзя считать `PRIMARY KEY (event_id)` аналогом PostgreSQL `UNIQUE`.

Если `PRIMARY KEY` явно не указан, он обычно совпадает с `ORDER BY`. Разделять их стоит только с понятной причиной и измерением.

## 5. Что такое partition

Partition — крупная единица управления данными. Parts из разных partitions не сливаются. Partition удобно:

- быстро удалить по retention;
- заменить исторический диапазон;
- перенести/архивировать диапазон;
- ограничить административные операции.

Partition не является универсальным способом ускорить запрос. Для временных событий разумный starting point:

```sql
PARTITION BY toYYYYMM(match_started_at)
```

Месяц подходит, если объём достаточен и retention/correction делаются по времени. Для меньшего объёма может хватить года или вообще одной логической partition policy.

## 6. Плохие partition keys

Обычно не надо делать:

```text
PARTITION BY match_id
PARTITION BY player_id
PARTITION BY team_id
PARTITION BY toDate(event_time)  // если данных за день мало
```

Это создаёт слишком много мелких partitions и parts. Фоновые merges не объединят данные между ними, metadata и файловые операции разрастутся.

Проверяйте:

- число активных partitions;
- parts на partition;
- средний размер part;
- скорость merges;
- частоту retention/correction операций.

## 7. Granules и data skipping

ClickHouse хранит marks для блоков строк, а не указатель на каждую строку. Если данные отсортированы по `patch_id`, движок может пропустить granules других патчей.

Упрощённо:

```text
[7.38, 7.38, 7.38] mark
[7.38, 7.38, 7.39] mark
[7.39, 7.39, 7.39] mark
```

Фильтр `patch_id = '7.39'` не читает первый диапазон. Но если значения хаотично перемешаны по ключу, пропускать почти нечего.

Data-skipping indexes могут помочь отдельным вторичным условиям, но это дополнение после правильного sort key, а не замена ему.

## 8. ReplacingMergeTree — не волшебный upsert

`ReplacingMergeTree(version)` может во время фоновых merges оставить строку с большей версией среди одинаковых sorting keys. Но:

- merge происходит не мгновенно;
- дубликаты видны до merge;
- `FINAL` в каждом запросе может быть дорогим;
- неправильный sorting key объединит не те строки;
- это не межбазовая транзакция и не unique constraint.

Для immutable parser outputs безопаснее:

- хранить `parser_output_id`;
- экспортировать только validated current output;
- версии переключать через контролируемый pipeline;
- агрегаты фильтровать/перестраивать по correction policy;
- использовать ReplacingMergeTree лишь после теста конкретной модели.

## 9. Сжатие и ширина строки

Физическая сортировка влияет и на compression: соседние одинаковые `patch_id`, `event_type`, `hero_id` хорошо сжимаются.

Измеряйте:

```sql
SELECT
    table,
    sum(rows) AS rows,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed
FROM system.parts
WHERE database = 'analytics' AND active
GROUP BY table;
```

Не выбирайте типы только по названию. Сравните реальный compression ratio, query bytes и удобство контракта.

## 10. Эксперимент с кандидатами

Создайте:

```text
events_by_meta
events_by_match
events_by_time
```

Загрузите одинаковые 10–100 миллионов synthetic/разрешённых событий. Для каждого основного запроса сохраните:

- elapsed time;
- rows/bytes read;
- peak memory;
- compressed size;
- число parts;
- latency после cold и warm runs.

Не выбирайте только самый быстрый единичный запрос: учитывайте весь workload и стоимость второй копии.

## Критерии готовности

- ключ сортировки выведен из списка запросов;
- компромисс meta versus match-detail записан;
- primary key не считается unique constraint;
- partition служит управлению данными;
- нет partition per match/player/team;
- размер batch не создаёт шторм мелких parts;
- ReplacingMergeTree не используется как обещание мгновенного upsert;
- схема выбрана сравнительным benchmark'ом.

Официальные практики по sorting key, partitions и типам: [ClickHouse — 10 best practice tips](https://clickhouse.com/blog/10-best-practice-tips).

[Предыдущая глава](03-event-model-schema.md) · [Оглавление части](README.md) · [Следующая глава](05-ingestion-idempotency.md)

