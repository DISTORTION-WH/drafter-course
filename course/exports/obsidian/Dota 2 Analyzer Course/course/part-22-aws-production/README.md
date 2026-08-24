# Часть 22. Развёртывание Dota Analyzer в AWS с нуля

Эта часть берёт release candidate части 21 и разворачивает его в AWS. Infrastructure создаётся AWS CDK v2 на TypeScript, чтобы staging/production можно было воспроизвести и проверить.

## Целевая схема

```text
Route 53 + ACM
-> Application Load Balancer
-> ECS Fargate API service

ECS Fargate worker service
EventBridge scheduled ECS tasks

RDS PostgreSQL
ElastiCache only when required
S3 private artifacts
CloudFront + private S3 public legal/support site
Secrets Manager
CloudWatch
ECR
GitHub Actions OIDC
```

## Главы

1. [AWS account, MFA, доступ, регион и бюджеты](01-account-security-budget.md)
2. [Архитектура, окружения и расчёт стоимости](02-architecture-environments-cost.md)
3. [Infrastructure as Code на AWS CDK и TypeScript](03-cdk-typescript-foundations.md)
4. [VPC, security groups, Route 53, ACM и HTTPS](04-network-dns-tls.md)
5. [ECR и ECS Fargate для API, worker и scheduler](05-ecr-ecs-fargate.md)
6. [RDS PostgreSQL, миграции, PITR и restore](06-rds-postgresql.md)
7. [ElastiCache, S3, CloudFront и Secrets Manager](07-cache-storage-secrets.md)
8. [GitHub Actions, OIDC и безопасный deployment](08-github-oidc-deployment.md)
9. [CloudWatch, безопасность, scaling и контроль расходов](09-operations-scaling-cost.md)
10. [Итоговая лабораторная: AWS staging и production](10-final-aws-lab.md)

## Стоимость

Создание AWS resources может сразу начать начислять плату. Перед каждым `cdk deploy` смотрите diff, оценку и текущие pricing pages. После лаборатории удаляйте только проверенные временные stacks и вручную проверяйте остаточные snapshots, domains, log groups, ECR images и backups.

## Навигация

- [Назад: единый MVP](../part-21-guided-mvp-assembly/README.md)
- [Дальше: публикация в магазинах](../part-23-store-release/README.md)

