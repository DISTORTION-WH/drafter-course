# Глава 3. Infrastructure as Code на AWS CDK и TypeScript

## Цель

Создать AWS resources из TypeScript code, увидеть CloudFormation template/diff и безопасно разделить staging/production configuration.

## 1. Почему CDK

Вы уже знаете TypeScript. AWS CDK создаёт CloudFormation template из constructs:

```text
TypeScript constructs
-> cdk synth
-> CloudFormation template
-> change set/deployment
-> AWS resources
```

CDK не отменяет знание AWS. Ошибочная программа может воспроизводимо создать дорогую/небезопасную инфраструктуру.

## 2. Папка

```text
infra/aws-cdk/
  bin/app.ts
  lib/
    config.ts
    network-stack.ts
    data-stack.ts
    compute-stack.ts
    edge-stack.ts
    observability-stack.ts
  test/
  cdk.json
  package.json
  tsconfig.json
```

Не создавайте один файл на 2000 строк.

## 3. Установка

В workspace:

```powershell
pnpm --dir infra/aws-cdk add aws-cdk-lib constructs
pnpm --dir infra/aws-cdk add -D aws-cdk typescript vitest
pnpm --dir infra/aws-cdk exec cdk --version
```

Фиксируйте exact versions lockfile. Официальный starting point: [AWS CDK v2 getting started](https://docs.aws.amazon.com/cdk/v2/guide/getting-started.html).

## 4. App entry

```ts
import * as cdk from 'aws-cdk-lib';
import { loadDeploymentConfig } from '../lib/config';
import { NetworkStack } from '../lib/network-stack';

const app = new cdk.App();
const config = loadDeploymentConfig(app);

new NetworkStack(app, `${config.prefix}-network`, {
  env: {
    account: config.account,
    region: config.region,
  },
  config,
});
```

Разбор:

- `App` — root construct;
- config содержит non-secret deployment decisions;
- `Stack` — CloudFormation deployment boundary;
- account/region явны;
- secrets не читаются из local `.env` и не синтезируются в template.

## 5. Typed config

```ts
export type DeploymentEnvironment = 'staging' | 'production';

export type DeploymentConfig = {
  environment: DeploymentEnvironment;
  account: string;
  region: string;
  prefix: string;
  deletionProtection: boolean;
  rdsMultiAz: boolean;
  monthlyBudgetUsd: number;
};
```

Validation запрещает:

```text
production with deletionProtection=false
staging domain in production
unknown region/account
zero budget alerts
same DB name/bucket across env
```

## 6. Stack boundaries

```text
NetworkStack  VPC/subnets/security boundaries
DataStack     RDS/cache/S3/secrets references
ComputeStack  ECR/ECS/ALB/tasks/schedules
EdgeStack     Route53/ACM/CloudFront/public web
OpsStack      dashboards/alarms/budget where supported
```

Слишком много cross-stack references усложняют updates. Начните с 2–4 stacks и разделяйте по lifecycle/risk.

## 7. Bootstrap

CDK bootstrap создаёт deployment resources в account/region:

```powershell
aws sso login --profile dota-staging
aws sts get-caller-identity --profile dota-staging
pnpm --dir infra/aws-cdk exec cdk bootstrap aws://ACCOUNT/REGION --profile dota-staging
```

Замените placeholders и перепроверьте identity. Bootstrap тоже создаёт resources/roles; изучите template/policy.

## 8. Synth/diff

```powershell
pnpm --dir infra/aws-cdk exec cdk synth --context environment=staging
pnpm --dir infra/aws-cdk exec cdk diff --context environment=staging --profile dota-staging
```

До deploy review:

- public resources;
- IAM wildcard;
- replacement/destruction;
- RDS deletion/snapshot policy;
- S3 removal policy;
- new NAT/ALB/public IPv4/log groups;
- secret values absent;
- tags/environment/account.

## 9. CDK tests

Template assertions:

```text
production RDS deletion protection true
S3 public access blocked
ECS tasks no hardcoded secrets
ALB only 443 public
RDS no public accessibility
log retention explicit
budget/alarms present
tags present
```

Snapshot test alone недостаточен: большой diff можно принять не читая. Добавляйте semantic assertions.

## 10. Removal policies

```text
production data -> RETAIN/snapshot/deletion protection
temporary staging compute -> DESTROY acceptable
log groups -> explicit retention
ECR -> lifecycle
S3 -> retain or explicit empty/delete runbook
```

`cdk destroy` не обязан удалить retained resources. Это защита и потенциальный продолжающийся cost.

## 11. Первый deploy

Сначала пустой/safe stack: tags, small log group или network skeleton после estimate. Не создавайте сразу RDS/ALB/cache во время проверки CDK.

После deploy:

```powershell
pnpm --dir infra/aws-cdk exec cdk diff ...
aws cloudformation describe-stacks ...
```

Проверьте Billing/Cost Explorer позже и inventory сразу.

## Definition of Done

- local exact CDK version;
- typed env/account/region config;
- secret values absent from synth;
- stack boundaries/lifecycle documented;
- bootstrap target verified;
- synth/diff reviewed;
- semantic template tests;
- production retain/protection policy;
- first safe deploy tagged;
- delete/retained-resource behavior understood.

[Предыдущая глава](02-architecture-environments-cost.md) · [Оглавление](README.md) · [Следующая глава](04-network-dns-tls.md)
