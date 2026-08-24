# Глава 7. Freshness данных, очереди и workers

## 1. Почему «worker жив» недостаточно

Worker может успешно heartbeat-ить, но:

- queue producer не создаёт jobs;
- jobs обрабатывают старые объекты;
- provider возвращает пустые страницы;
- canonical transaction откатывается;
- reconciliation выключен;
- один partition/provider застрял;
- scheduler clock/config неверен.

Наблюдаем фактическое движение данных.

## 2. Временные точки записи

Для ingestion:

```text
sourceObservedAt   — время события/обновления у источника, если достоверно
fetchedAt          — когда получили raw
normalizedAt       — когда canonical сохранён
availableToApiAt   — когда API начал отдавать
```

Lag:

```text
fetch lag       = fetchedAt - sourceObservedAt
normalize lag   = normalizedAt - fetchedAt
publish lag     = availableToApiAt - normalizedAt
end-to-end lag  = availableToApiAt - sourceObservedAt
```

Если provider не даёт source time, честно используйте «время первого обнаружения» и маркируйте ограничение.

## 3. Freshness metric

```text
ingestion_last_canonical_timestamp_seconds{provider,data_type}
```

Dashboard вычисляет `time() - last timestamp`. Labels ограничены известными provider/data types.

Но при отсутствии ожидаемых событий ночью age может расти нормально. Schedule freshness измеряет регулярность polling, а event freshness учитывает expected calendar/window.

## 4. Queue signals

Для каждой queue:

- waiting count;
- active count;
- delayed count;
- failed count/rate;
- oldest waiting job age;
- enqueue rate;
- completion rate;
- processing histogram;
- attempts/retry rate;
- dead-letter/quarantined;
- worker concurrency/heartbeat.

Oldest age чаще полезнее count: 1000 быстрых jobs могут быть нормальны, один job старше часа — нет.

## 5. Little's Law как sanity check

В стабильной системе примерно:

```text
jobs in system ≈ arrival rate * average time in system
```

Это не заменяет измерение percentiles и условия очереди, но помогает проверить capacity. Если arrival выше sustained throughput, backlog неизбежно растёт.

## 6. Job outcome

```text
success
retryable_provider_error
rate_limited
invalid_payload
corrupted_raw
db_conflict
terminal_parser_error
cancelled_obsolete
```

Machine categories ограничены и подходят labels. Full error идёт в log/trace.

## 7. Data quality dashboard

- ожидаемые/обнаруженные pro matches;
- completeness distribution;
- unknown teams/players;
- provider mapping conflicts;
- reconciliation mismatch rate;
- raw object without canonical row;
- canonical row without provenance;
- meta sample size;
- parser/schema version coverage;
- replay corrupted/unsupported build.

## 8. Provider outage

Отличайте:

```text
provider HTTP errors/rate limit
provider отвечает, но данные stale
наш adapter parse errors после schema change
наша сеть/DNS/TLS
наш quota exhausted
```

Read API продолжает отдавать сохранённые данные с freshness. Alert/runbook не предлагает перезапускать всё без причины.

## 9. Reconciliation

Scheduled job сравнивает:

- schedule/results;
- raw/canonical counts;
- provider A/B по разрешённой методологии;
- replay overview/canonical match;
- notification scheduled/start-time version.

Mismatch имеет lifecycle: open, investigated, resolved/accepted, и не создаёт бесконечный alert на одну старую запись.

## 10. Capacity alert

Alert при прогнозе нарушения deadline:

```text
oldest age растёт
AND completion rate < arrival rate
AND remaining time до freshness SLO мал
```

Простой queue depth threshold полезен как diagnostic/ticket, но paging лучше связывать с пользовательским impact/deadline.

## 11. Практика

Остановите staging worker, продолжайте enqueue и убедитесь: oldest age/backlog растут, alert срабатывает до SLO breach, runbook запускает/масштабирует worker, backlog очищается без дублей.

[Предыдущая глава](06-sli-slo-error-budgets.md) · [Оглавление](README.md) · [Следующая глава](08-alerts-dashboards.md)

