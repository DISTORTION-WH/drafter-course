# Часть 18. Продвинутый replay pipeline на Java и Clarity

Replay-файл содержит гораздо больше деталей, чем обычный match API: сущности, combat log, игровые события, позиции и итоговый overview. Но replay — большой недоверенный бинарный файл, а его структура меняется вместе с Dota 2. Поэтому parser добавляется отдельным ограниченным сервисом после работающего MVP.

## Цель части

Для небольшого разрешённого набора профессиональных матчей построить:

```text
replay metadata/source
-> controlled download
-> private object storage + SHA-256
-> replay parse request
-> isolated Java/Clarity worker
-> versioned output manifest
-> combat/position aggregates
-> validation against canonical match
-> API/mobile derived views
```

Ошибка parser не делает недоступными базовые match details.

## Главы

1. [Граница replay-функции, источники и риски](01-replay-scope-sources.md)
2. [Java, Gradle и отдельный parser service](02-java-gradle-service.md)
3. [Clarity: event model и минимальный parser](03-clarity-event-model.md)
4. [Object storage, очередь и state machine](04-storage-queue-state-machine.md)
5. [Версии parser/schema и выходной manifest](05-parser-schema-output.md)
6. [Combat log и нормализация событий](06-combat-log.md)
7. [Позиции и heatmap](07-positions-heatmaps.md)
8. [Повреждённые replays, лимиты и изоляция](08-corrupted-replays-security.md)
9. [Golden replays, тесты и обновление Clarity](09-golden-replays-testing.md)
10. [Итоговая лабораторная replay pipeline](10-final-replay-lab.md)

## Что подтверждает актуальный Clarity repository

На 16 июля 2026 README проекта указывает Java 17+, сборку Gradle и dependency `com.skadistats:clarity:4.0.1`. Clarity описывает поддержку combat log, entities, modifiers, user messages, game events, overview и raw protobuf objects. Версия фиксируется в lock/build, а перед обновлением проверяется на golden replays.

Исходный код Clarity распространяется по BSD-3-Clause, но это не даёт автоматического права скачивать, хранить или коммерчески распространять любые replay/derived данные. Источник replay и условия данных проверяются отдельно.

## Ограничения первой версии

- только заранее выбранные профессиональные матчи;
- overview, ключевой combat subset и sampled hero positions;
- нет пользовательских replay uploads;
- нет публичной выдачи raw replay, chat или voice;
- нет обещания поддержки каждого старого/нового game build;
- parser output всегда содержит версии и quality status;
- corrupted/unsupported replay помещается в quarantine, а не бесконечный retry.

## Навигация

- [Назад: часть 17 — наблюдаемость и эксплуатация](../part-17-observability-operations/README.md)
- [Дальше: часть 19 — масштабирование аналитики и ClickHouse](../part-19-clickhouse-scaling/README.md)
