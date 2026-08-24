# Глава 8. Dashboards и предупреждения

## 1. Dashboard начинается с пользователя

Landing dashboard:

```text
1. SLO availability/latency + error budget
2. data freshness/completeness
3. current releases/deploy markers
4. traffic/errors/latency
5. queue/provider health
6. DB/Redis/runtime saturation
7. links to traces/logs/runbooks
```

Не начинайте с 50 CPU charts. Вопрос «пользователь получает свежий матч?» находится наверху.

## 2. Dashboard hierarchy

### Product overview

Public reads, mobile crash-free, freshness, notification timeliness.

### API

RED by route/status, cache, DB pool, slow spans.

### Ingestion

Provider rate/errors, queue age/throughput, completeness, reconciliation.

### Notifications

Scheduled/delivered, delay, ticket/receipt outcomes, invalid devices.

### Replay parser

Появится в части 18: success by build/version, duration, corruption, output volume.

## 3. Dashboard variables

Разрешённые filters:

```text
environment, region, service, release, provider, queue, route template
```

Не создавайте dropdown всех match/user IDs на metric dashboard. Для конкретного ID используйте link в log search.

## 4. Deploy annotations

Каждый deployment/flag/migration отмечается:

- время;
- release/digest;
- environment;
- migration version;
- author/workflow;
- rollback link.

Если error rate вырос в ту же минуту, оператор сразу видит вероятную связь, но не объявляет release root cause без проверки.

## 5. Хороший alert

Alert:

- отражает user impact или неминуемый риск;
- имеет owner/severity;
- не дублирует пять симптомов одной причины без grouping;
- содержит summary, impact, current value, dashboard, logs/traces и runbook;
- автоматически resolved;
- проверен тестовым firing;
- имеет safe labels без PII.

## 6. Page, ticket, info

### Page

Нужно действовать сейчас: сильный burn rate, критическая data freshness, mass crash, queue deadline.

### Ticket

Можно в рабочее время: disk trend, медленный рост retries, dependency expiry, restore drill просрочен.

### Dashboard/info

Диагностический сигнал без отдельного уведомления.

Если на alert ночью нельзя выполнить полезное действие, он не должен page в текущем виде.

## 7. `for` и flapping

Prometheus alert rule concept:

```yaml
groups:
  - name: dota-api
    rules:
      - alert: DotaApiHighErrorBudgetBurn
        expr: <recorded burn-rate expression>
        for: 5m
        labels:
          severity: page
          service: api
        annotations:
          summary: "API быстро расходует error budget"
          runbook_url: "https://internal.example/runbooks/api-high-burn"
```

`for` фильтрует краткий шум, но не должен задерживать обнаружение полного outage неоправданно. Multi-window SLO rule лучше одиночного CPU threshold.

## 8. Alertmanager

Prometheus вычисляет rules, Alertmanager группирует, дедуплицирует, маршрутизирует, silences/inhibitions. Silence имеет owner, reason и expiry; не выключайте rule навсегда.

Maintenance window подавляет ожидаемый шум, но сохраняет critical independent alert по policy.

## 9. Alert tests

- `promtool check rules` syntax;
- unit tests expressions с synthetic series;
- staging controlled failure;
- route к тестовому receiver;
- link/runbook существует;
- resolved notification;
- no secret/ID in labels;
- false positive/negative review после incident.

## 10. Alert examples

```text
Page: API multi-window SLO burn
Page: canonical freshness нарушится/нарушена для pro results
Page: notification queue oldest age > delivery deadline
Ticket: provider retries elevated 1h, stale cache ещё в SLO
Ticket: backup age/restore drill overdue
Info: single parser corrupted replay quarantined
```

Официальные справочники: [Prometheus alerting overview](https://prometheus.io/docs/alerting/latest/overview/) и [recording/alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/).

[Предыдущая глава](07-data-freshness-queues.md) · [Оглавление](README.md) · [Следующая глава](09-incidents-runbooks-backup.md)

