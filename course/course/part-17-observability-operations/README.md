# Часть 17. Наблюдаемость и эксплуатация

Production-система должна не только работать, но и объяснять своё состояние. Наблюдаемость позволяет ответить на вопросы: пользователи действительно получают данные, какой release вызвал проблему, где задержался запрос, насколько свежа мета, почему растёт очередь и можно ли восстановиться после потери базы.

## Результат части

```text
mobile/API/worker/parser
  -> structured logs
  -> metrics
  -> distributed traces
  -> error/crash events
  -> dashboards + SLO
  -> actionable alerts
  -> incident runbooks
  -> tested recovery
```

## Главы

1. [Модель наблюдаемости и сигналы](01-observability-model.md)
2. [Structured logs, request ID и job ID](02-structured-logs-correlation.md)
3. [Метрики, типы и cardinality](03-metrics-cardinality.md)
4. [Трассировка с OpenTelemetry](04-traces-opentelemetry.md)
5. [Sentry, releases и mobile crashes](05-sentry-releases-mobile.md)
6. [SLI, SLO и error budget](06-sli-slo-error-budgets.md)
7. [Freshness данных, очереди и workers](07-data-freshness-queues.md)
8. [Dashboards и предупреждения](08-alerts-dashboards.md)
9. [Инциденты, runbooks и восстановление](09-incidents-runbooks-backup.md)
10. [Итоговая лабораторная наблюдаемости](10-final-observability-lab.md)

## Основные правила

- Health endpoint не заменяет пользовательский SLI.
- Logs объясняют отдельное событие, metrics показывают тенденцию, traces связывают путь.
- Alert сообщает о влиянии или неминуемом риске и содержит действие/runbook.
- `userId`, `matchId`, request ID и stack trace не становятся metric labels.
- Telemetry проходит redaction, retention и access control.
- Release/commit/environment присутствуют во всех сигналах.
- Freshness и полнота данных — такие же production-показатели, как HTTP latency.
- Backup считается рабочим только после restore drill.

На июль 2026 OpenTelemetry JavaScript отмечает traces и metrics как stable, а logs как development. Поэтому в этой архитектуре application logs остаются structured Pino logs, а OpenTelemetry даёт traces/metrics и correlation context. Перед обновлением сверяйте текущий статус.

## Навигация

- [Назад: часть 16 — Docker, CI/CD и production](../part-16-docker-cicd-production/README.md)
- [Обязательный следующий шаг: часть 21 — сборка единого MVP](../part-21-guided-mvp-assembly/README.md)
- [Необязательное углубление: часть 18 — replay pipeline](../part-18-replay-clarity/README.md)
