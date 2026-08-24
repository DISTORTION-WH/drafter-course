# Глава 9. Наблюдаемость, инциденты, масштабирование и стоимость

## Результат главы

Вы будете узнавать о проблеме раньше пользователя, понимать влияние на продукт и удерживать расходы в запланированных пределах.

## 1. Четыре сигнала production

Смотрите не только на CPU:

- traffic — запросы, активные пользователи, ingestion jobs;
- errors — HTTP 5xx, failed jobs, provider errors;
- latency — p50/p95/p99 API и длительность jobs;
- saturation — CPU, memory, DB connections/storage, queue age.

Для аналитического приложения добавьте бизнес-сигналы:

- `data_freshness_seconds`;
- время последнего успешного импорта;
- доля матчей с неполными полями;
- задержка meta snapshot;
- notification delivery success.

«API отдаёт 200, но данные недельной давности» — production-инцидент.

## 2. Структурированные логи

```json
{
  "level": "error",
  "service": "worker",
  "environment": "production",
  "requestId": "req_...",
  "jobId": "sync_...",
  "provider": "approved-provider",
  "errorCode": "RATE_LIMITED",
  "durationMs": 842,
  "message": "match sync delayed"
}
```

Не логируйте access/refresh tokens, provider keys, полные платежные payload, email и raw API responses без необходимости. Задайте log retention и удаление.

## 3. Dashboard и alarms

Один launch-dashboard:

| Область | Метрика | Первичный alarm |
|---|---|---|
| ALB | target 5xx, unhealthy hosts, p95 | ошибки/нет здоровых tasks |
| ECS API | CPU, memory, restart | saturation/crash loop |
| worker | failed jobs, queue age | возраст выше SLO |
| RDS | CPU, connections, free storage | мало места/соединений |
| data | freshness, last successful sync | устаревшие данные |
| billing | failed verification/webhook lag | entitlement задержан |

Числа порогов получите нагрузочным тестом и наблюдением. Alarm должен иметь owner, severity и ссылку на runbook. Не создавайте десятки уведомлений без действия.

## 4. Runbook инцидента

```text
1. Acknowledge: подтвердить сигнал.
2. Triage: затронуты ли login, data, billing, все пользователи?
3. Mitigate: rollback, pause scheduler, scale, disable feature flag.
4. Communicate: status page/support, без выдуманных сроков.
5. Recover: проверить данные и очередь.
6. Learn: timeline, root cause, corrective actions.
```

Для утечки ключа: отозвать/повернуть ключ, остановить злоупотребление, сохранить audit evidence, оценить обязанности уведомления по применимому праву.

## 5. Масштабирование с ограничениями провайдера

Нагрузочный тест не должен атаковать внешний data provider. Мокайте provider и нагружайте собственный API/очередь.

Проверяйте ступени:

```text
100 beta users -> 1,000 MAU -> 10,000 MAU
```

Для каждой оцените:

- API requests/user/day;
- импортов/матчей в день;
- DB growth/month;
- S3 growth/egress;
- notification volume;
- provider quota;
- Fargate task count;
- стоимость на MAU и paying user.

Cache не исправляет неэффективный запрос автоматически. Сначала `EXPLAIN ANALYZE`, индекс, размер ответа и pagination.

## 6. FinOps для одного разработчика

Обязательный цикл раз в неделю:

1. посмотреть Cost Explorer;
2. сравнить факт с budget;
3. проверить новые ресурсы и теги;
4. найти idle RDS/NAT/ALB/EIP, snapshots и log ingestion;
5. обновить прогноз до конца месяца;
6. связать рост стоимости с ростом пользователей/данных.

Теги:

```text
Application=dota-analyzer
Environment=staging|production
Owner=...
CostCenter=product
ManagedBy=cdk
```

Budgets и Cost Anomaly Detection предупреждают, но обычно не являются автоматическим hard stop. Уведомление должно приходить на проверяемый email/канал.

## 7. Security и maintenance

Каждый месяц:

- обновить Node, base images и зависимости после staging-тестов;
- проверить ECR scan;
- пересмотреть IAM/CloudTrail события;
- проверить сертификаты и домены;
- проверить restore evidence;
- удалить неиспользуемые secrets/roles;
- пересмотреть data retention;
- проверить AWS Health и end-of-support notices.

WAF, Shield Advanced, GuardDuty и другие сервисы рассматривайте по угрозам, требованиям и бюджету. Базовая защита начинается с закрытой сети, rate limit, корректной auth, least privilege и мониторинга.

## Практика

1. Создайте dashboard для технических и freshness-метрик.
2. Вызовите безопасную синтетическую ошибку и получите alarm.
3. Проведите table-top incident «provider недоступен 2 часа».
4. Проведите load test без обращения к реальному provider.
5. Постройте прогноз AWS для 100/1 000/10 000 MAU.
6. Объясните три крупнейшие статьи стоимости и способ контроля.

## Готово, если

- у критических alarms есть runbook и owner;
- dashboard показывает свежесть данных;
- инцидент и rollback отрепетированы;
- известны текущая стоимость и прогноз;
- provider quota входит в capacity plan;
- backups и security review имеют календарный ритм.

## Официальные материалы

- [AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html)
- [AWS Pricing Calculator](https://calculator.aws/)
- [AWS Fargate pricing](https://aws.amazon.com/fargate/pricing/)

