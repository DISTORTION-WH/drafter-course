# Глава 2. Архитектура, окружения и расчёт стоимости

## Цель

Выбрать архитектуру, которую можно оплатить и обслуживать. Сравнить дешёвый pilot и более надёжный standard profile до создания resources.

## 1. Process inventory

Из одного backend image запускаются разные commands:

```text
api        long-running HTTP
worker     long-running queue/outbox consumer
scheduler  scheduled discovery/reconciliation task
migrate    one-off schema job
admin      one-off controlled command
```

Не запускайте cron внутри API container: rolling restart может запустить несколько copies или ни одной.

## 2. State inventory

```text
PostgreSQL: canonical/user/job/outbox
ElastiCache: optional BullMQ/cache/limits
S3: raw artifacts, exports, public site origin
ECR: images
Secrets Manager: runtime secrets
CloudWatch: logs/metrics/alarms
```

Fargate filesystem ephemeral. Не храните там единственную копию raw data/uploads.

## 3. Pilot profile

Подходит для закрытой beta/малого revenue с принятым downtime:

- one region;
- ALB + one API Fargate task;
- one worker task or scheduled polling;
- RDS PostgreSQL Single-AZ + backups/PITR;
- no ElastiCache: PostgreSQL outbox/leases, если throughput позволяет;
- small S3/CloudWatch retention;
- replay/ClickHouse/ML off;
- manual approval deploy;
- frequent restore drill;
- documented RTO/SPOF.

Это production pilot, а не high availability.

## 4. Standard profile

- separate production account;
- public ALB across AZ;
- private ECS tasks, desired count ≥ 2 for critical API;
- RDS Multi-AZ;
- ElastiCache replication/serverless according to workload;
- NAT per AZ or reviewed endpoints/connectivity architecture;
- S3 version/lifecycle/backup according to class;
- WAF after measured threat/cost;
- automated scaling/alarms;
- tested incident/restore.

## 5. Network cost trap

NAT Gateway, public IPv4, ALB, cross-AZ transfer, logs и egress могут стоить заметно даже при малом traffic. Private subnets не «бесплатная галочка».

Варианты требуют threat/cost review:

```text
A. private tasks + NAT per AZ
B. private tasks + VPC endpoints + required Internet egress path
C. pilot public-IP tasks with strict SG/no direct inbound except ALB
```

Provider worker почти наверняка требует outbound Internet. Не создавайте private worker без пути к provider/ECR/logs/secrets.

## 6. Dependency decision

| Component | Start | Add when |
|---|---|---|
| RDS | required | from first AWS deploy |
| ElastiCache | optional | BullMQ/latency/throughput require it |
| S3 | required | raw/legal site/assets |
| CloudFront | required for secure public web origin | privacy/support/deletion site |
| WAF | optional | threat/rate/abuse or policy |
| ClickHouse | no | part 19 measured threshold |
| replay parser | no | data rights + user value |
| ML | no | enough point-in-time data/value |

## 7. Estimate inputs

До Pricing Calculator соберите:

```text
region
Fargate tasks * vCPU * memory * hours
ALB hours/capacity
RDS class/storage/IO/backup/Multi-AZ
ElastiCache nodes/serverless usage
NAT hours/data or endpoints
public IPv4
S3 storage/requests/lifecycle
CloudFront/Internet egress
CloudWatch logs/metrics/retention
Route 53 hosted zone/queries/domain
Secrets Manager secrets/API calls
backup/restore tests
ECR storage/scans
support/tax outside estimate
```

## 8. Three estimates

Создайте:

1. **staging minimal**;
2. **pilot production**;
3. **standard production**.

Для каждого:

```text
fixed baseline/month
variable per 1k active users
variable per 1M API calls
data ingestion/provider cost
log growth
worst expected burst
shutdown/scale-down policy
```

Официальный [AWS Pricing Calculator](https://calculator.aws/) даёт estimate, не счёт и не включает все возможные налоги. Сохраните link/export/date/assumptions.

## 9. Unit cost hooks

С первого дня соберите:

- requests/active user;
- DB queries/latency;
- provider calls/match;
- raw bytes/match;
- notification sends/user;
- log bytes/request/job;
- AWS cost by environment/service;
- paid/free active users позже.

Без denominators нельзя связать облачный счёт с бизнесом.

## 10. Capacity/SLO

```text
expected DAU/concurrency
API RPS and p95
ingestion rows/jobs per hour
freshness target
RPO/RTO
acceptable pilot downtime
storage growth/retention
```

Infrastructure size вытекает из этого, а не из tutorial default.

## 11. ADR

`docs/adr/ADR-aws-profile-v1.md`:

```text
decision
load/SLO/rights assumptions
pilot vs standard
services included/excluded
monthly estimate
security risks
SPOF/RTO
upgrade triggers
rollback/deletion
review date
```

## Definition of Done

- processes/state перечислены;
- pilot/standard явно различены;
- Redis/ClickHouse/ML not automatic;
- network egress/NAT understood;
- три dated estimates сохранены;
- fixed/variable costs разделены;
- SLO/RPO/RTO указаны;
- upgrade triggers есть;
- architecture ADR принят;
- `cdk deploy` ещё не запускался без бюджета/estimate.

[Предыдущая глава](01-account-security-budget.md) · [Оглавление](README.md) · [Следующая глава](03-cdk-typescript-foundations.md)

