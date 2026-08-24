# Глава 1. AWS account, MFA, доступ, регион и бюджеты

## Цель

Создать AWS environment так, чтобы утечка GitHub secret или случайный resource не привели к захвату root и неограниченному счёту.

## 1. До регистрации

Подготовьте:

- отдельный business-managed email;
- password manager;
- минимум два независимых MFA/recovery механизма по актуальным возможностям;
- платёжный метод;
- billing contact;
- ожидаемый месячный предел;
- страну/юрлицо/налоговую информацию согласно вашим обстоятельствам;
- owner аварийного доступа.

Не публикуйте account ID, invoices, emails и recovery details в public repository.

## 2. Root user

Root имеет полный доступ. Сразу:

1. уникальный длинный password;
2. MFA;
3. no root access keys;
4. recovery защищён отдельно;
5. root используется только для root-only tasks;
6. CloudTrail/billing alerts проверяются;
7. действия root расследуются.

AWS рекомендует не использовать root для ежедневной работы и применять temporary credentials. Первичный источник: [Root user best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-best-practices.html).

## 3. Человеческий доступ

Предпочтительно AWS IAM Identity Center/roles с temporary sessions. Минимальные roles:

```text
administrator-breakglass
developer-readonly
developer-staging
production-deployer
billing-viewer
security-auditor
```

Один человек может выполнять несколько ролей в маленьком проекте, но permissions/session purpose остаются раздельными.

Не создавайте IAM user с вечным admin access key «для удобства».

## 4. Workload access

```text
ECS task role        app calls S3/Secrets/etc
ECS execution role   agent pulls ECR/writes logs/secrets injection
GitHub deploy role   OIDC, scoped repository/environment/branch
migration role/task  temporary DB/schema capability
backup role          only backup/restore scope
```

Task role и execution role не одно и то же. API не получает worker/provider permissions без причины.

## 5. Accounts/environments

Лучше:

```text
management/billing
non-production account
production account
```

Для самого дешёвого pilot допустим один account с жёстко разделёнными stacks/VPC/secrets, но blast radius выше. Запишите ADR, когда перейти к multi-account.

Production и staging никогда не делят:

- RDS database;
- user sessions;
- push recipients;
- provider/store secrets;
- S3 raw prefixes без strict boundary;
- DNS names;
- billing products.

## 6. Регион

Выберите один primary region по:

- latency целевой аудитории;
- доступности ECS/RDS/ElastiCache/backup features;
- data residency/legal;
- provider connectivity;
- цене;
- team operations;
- store users geography.

Не выбирайте `us-east-1` автоматически. Запишите region в config/CDK, не разбрасывайте строку по файлам.

## 7. Budgets

Создайте до workload:

- месячный cost budget;
- thresholds 50/80/100% и forecast;
- email/SNS получателя;
- Cost Anomaly Detection monitor;
- tags/cost allocation;
- weekly manual bill review на старте.

Важно: alert может приходить с задержкой и сам по себе не выключает resources. [AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html) указывает, что Cost Explorer data может запаздывать.

## 8. Tags

```text
Project=dota-analyzer
Environment=staging|production
Owner=...
ManagedBy=cdk
DataClass=public|internal|sensitive
CostCenter=...
ExpiresOn=... for temporary
```

Tag не является security boundary, но помогает inventory/cost/cleanup.

## 9. CLI access

Установите AWS CLI по официальной инструкции. Для Identity Center используйте SSO profile:

```powershell
aws configure sso
aws sso login --profile dota-staging
aws sts get-caller-identity --profile dota-staging
```

Перед любой destructive/paid command проверяйте `get-caller-identity`, region и target stack.

Не коммитите `~/.aws/credentials`, SSO cache или exported environment credentials.

## 10. Account inventory

`docs/runbooks/aws-account-inventory.md` без secrets:

```text
account alias/ID classification
environment
region
root owner/recovery process location
identity center/roles
billing contacts
budget/anomaly monitor
CloudTrail/security status
support plan
deletion/closure owner
```

## 11. Проверка взлома/счёта

Runbook подозрительной активности:

```text
declare incident
protect identity/root
revoke/disable compromised credentials/sessions
inspect CloudTrail/resources/regions
contact AWS support
contain resources
preserve evidence
rotate dependent secrets
review bill
postmortem
```

Не удаляйте логи/evidence в панике.

## Definition of Done

- root MFA/no access keys;
- daily access temporary/federated;
- staging/production decision documented;
- region chosen by criteria;
- budgets/forecast/anomaly notifications received/tested;
- cost tags applied;
- CLI identity/region verified;
- workload roles planned separately;
- inventory/runbook exists;
- no AWS long-lived key in GitHub/repository.

[Оглавление](README.md) · [Следующая глава](02-architecture-environments-cost.md)

