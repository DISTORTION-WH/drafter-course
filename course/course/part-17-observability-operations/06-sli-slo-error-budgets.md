# Глава 6. SLI, SLO и error budget

## 1. Термины

- SLI — измеряемый показатель уровня сервиса.
- SLO — целевое значение SLI за окно.
- SLA — внешнее/договорное обещание с последствиями; для MVP обычно отдельный вопрос.
- Error budget — допустимая доля плохих событий: `1 - SLO`.

Пример:

```text
SLI: доля eligible API запросов с корректным non-5xx ответом
SLO: 99.5% за rolling 28 дней
error budget: 0.5% плохих eligible запросов
```

Это учебная стартовая цель, а не универсальное обещание.

## 2. Availability SLI

```text
good events / valid events
```

Определите valid:

- пользовательские `/v1` requests;
- исключить health/metrics/internal test routes;
- ожидаемые client 4xx обычно не считаются server failure;
- 429 может считаться плохим user event или отдельным capacity SLI — решение фиксируется;
- cancelled client request рассматривается отдельно.

Нельзя менять denominator после инцидента ради красивого отчёта.

## 3. Latency SLI

```text
доля eligible requests быстрее порога
```

Разные пути имеют разные ожидания:

```text
match list:   99% < 700 ms
match detail: 99% < 800 ms
watchlist mutation: 99% < 1 s
```

Порог и процент измеряются на server boundary или end-to-end отдельно. Средняя latency не является SLO.

## 4. Data freshness SLI

Для анализатора критично:

```text
freshness lag = now - latest_expected_data_at
```

Но «последний успешный job» недостаточен: job мог успешно обработать пустой/старый ответ.

Примеры:

- meta snapshot создан из данных не старше X;
- закончившийся pro match появился в canonical storage в течение Y после provider availability;
- schedule проверялся не позднее Z;
- notification отправлена до допустимого deadline.

## 5. Correctness/coverage SLI

Data pipeline может быть свежим, но неполным:

```text
complete_matches / expected_professional_matches
reconciliation_matches_without_mismatch / checked_matches
replay_parse_success / eligible_replays
```

Expected set должен иметь источник и методологию; иначе процент неинтерпретируем.

## 6. Mobile SLI

- crash-free sessions;
- доля успешных загрузок ключевого экрана;
- time to usable content;
- auth completion success без user cancellation;
- notification open route success.

Client telemetry sampled/offline и не видит всех пользователей, поэтому ограничения метода документируются.

## 7. Error budget math

При 99.5% SLO за 100 000 valid events:

```text
budget = 100000 * (1 - 0.995) = 500 bad events
```

Для time-based availability 28 дней число минут — лишь приближение, если SLI event-based. Не смешивайте event и time denominator.

## 8. Burn rate

Burn rate показывает, насколько быстро расходуется budget:

```text
burn rate = observed bad-event ratio / allowed bad-event ratio
```

Если allowed 0.5%, observed 5%, burn rate = 10. Multi-window alerts сочетают быстрое окно для серьёзного outage и длинное для устойчивой деградации. Конкретные пороги рассчитываются под SLO/window и тестируются на исторических/синтетических данных.

## 9. Error budget policy

Если budget расходуется слишком быстро:

- остановить рискованные releases;
- приоритизировать reliability fixes;
- уменьшить rollout/concurrency;
- провести incident review;
- восстановить SLO, затем возобновить features.

Budget не является разрешением намеренно создавать ошибки; это инструмент решений.

## 10. SLO document

```text
service/user journey
owner
SLI query и data source
good/valid event definition
target/window
exclusions
known limitations
alert policy
dashboard/runbook
review cadence
```

## 11. Практика

Создайте SLO для public match read, meta freshness и notification timeliness. Возьмите 7–28 дней baseline, проверьте denominator и только затем включайте paging.

Официальный материал: [Google SRE — Implementing SLOs](https://sre.google/workbook/implementing-slos/).

[Предыдущая глава](05-sentry-releases-mobile.md) · [Оглавление](README.md) · [Следующая глава](07-data-freshness-queues.md)

