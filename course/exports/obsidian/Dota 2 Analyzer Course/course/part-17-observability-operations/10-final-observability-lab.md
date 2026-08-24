# Глава 10. Итоговая лабораторная наблюдаемости

## Цель

Собрать production-like dashboard и провести контролируемый инцидент, который обнаруживается по пользовательскому/data impact, расследуется через metrics/traces/logs и устраняется по runbook.

## 1. Instrumentation checklist

### Все services

- service/environment/release/region;
- structured stdout logs;
- trace/metrics exporter health;
- startup/shutdown events;
- safe error redaction;
- release deployment annotation.

### API

- request rate/error/duration;
- route template/status class;
- DB/Redis spans;
- request/trace correlation;
- Sentry unexpected errors.

### Workers

- enqueue/completion/outcome;
- wait/processing duration;
- oldest age/depth;
- attempt/dead-letter;
- job/event/trace correlation.

### Data

- provider last fetch;
- canonical last timestamp;
- completeness/mismatch;
- meta age/sample size;
- notification delay.

## 2. SLOs

Создайте три reviewable документа:

```text
API match read availability/latency
professional match ingestion freshness
match reminder timeliness
```

У каждого: good/valid, target/window, exclusions, query, alert, owner, runbook.

## 3. Dashboard

Одна landing page:

1. SLO/error budget;
2. freshness/completeness;
3. deploy markers;
4. API RED;
5. queue/provider;
6. DB/Redis/runtime;
7. mobile errors/crash-free;
8. backup/restore drill status;
9. ссылки на drill-down.

## 4. Alerts

Минимум:

- API high burn;
- ingestion freshness/deadline;
- notification oldest job age;
- mobile crash regression после release;
- backup/restore drill overdue как ticket.

Каждый rule проходит syntax/unit/staging test и имеет runbook URL.

## 5. Инцидент A: остановка worker

1. staging scheduler продолжает enqueue;
2. остановить ingestion worker;
3. наблюдать completion=0, oldest age/freshness;
4. дождаться корректного alert до/при SLO impact;
5. объявить тестовый incident;
6. по runbook определить отсутствие heartbeat;
7. вернуть worker;
8. подтвердить drain без дублей;
9. закрыть alert/incident;
10. записать timeline.

## 6. Инцидент B: плохой release

Включите feature flag, который возвращает controlled 500 на маленьком staging canary traffic. Проверяйте release annotation, SLO burn, Sentry issue, trace и request log. Mitigation — выключить flag/rollback exact digest.

## 7. Recovery drill

Восстановите staging backup в отдельную БД. Запишите backup age/checksum, restore duration, schema version, integrity queries и API smoke. Восстановленная среда не отправляет production push и не имеет production provider credentials.

## 8. Telemetry security review

Ищите во всех backends/artifacts:

- Authorization/refresh/exchange;
- Steam API key/SteamID;
- push token;
- signed object URL;
- full provider/replay payload;
- personal chat/voice data;
- database credentials.

Находка считается secret/privacy incident и исправляется с rotation/removal/regression test.

## 9. Definition of Done части 17

- logs JSON, redacted и коррелированы;
- metrics имеют ограниченные labels/units;
- traces связывают HTTP, DB и queue;
- OTel exporter outage не ломает product path;
- Sentry release/source maps проверены;
- SLO denominator документирован;
- freshness/coverage видимы независимо от process health;
- queue oldest age и throughput наблюдаются;
- alerts actionable и протестированы;
- incident roles/runbooks существуют;
- два staging incidents проведены;
- restore drill прошёл и измерил RTO/RPO;
- telemetry cost/retention/access определены.

## Что дальше

Обязательный путь теперь ведёт в часть 21: там все изученные компоненты собираются в один MVP. Replay parser на Clarity из части 18, ClickHouse и ML остаются необязательными углублениями и не должны задерживать первый запуск.

[Предыдущая глава](09-incidents-runbooks-backup.md) · [Оглавление части](README.md) · [Собрать единый MVP](../part-21-guided-mvp-assembly/README.md) · [Необязательная часть 18](../part-18-replay-clarity/README.md)
