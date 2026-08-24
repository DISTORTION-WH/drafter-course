# Модуль 16. Docker и production в AWS

## Результат

API и worker будут работать в ECS Fargate; PostgreSQL — в RDS; очередь — в ElastiCache; HTTPS — через Application Load Balancer и ACM; секреты — в Secrets Manager; logs/alarms — в CloudWatch. Инфраструктура описана AWS CDK и воспроизводится из Git.

## 0. Финансовый предохранитель до первого ресурса

AWS списывает реальные деньги. До `cdk deploy`:

1. включите MFA root account;
2. создайте отдельного admin user/role, root больше не используйте;
3. включите Cost Explorer;
4. создайте AWS Budget с email alerts, например 25%, 50%, 80%, 100% месячного лимита;
5. выберите один region рядом с аудиторией;
6. заведите `staging` и `production` как разные stacks минимум, лучше разные accounts;
7. проверьте Pricing Calculator для NAT Gateway, ALB, Fargate, RDS, ElastiCache и data transfer.

Free Tier не является архитектурой и не гарантирует нулевой счёт.

## 1. Production Dockerfiles

Создайте `apps/api/Dockerfile` из двух stages:

```dockerfile
FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile
COPY apps/api apps/api
COPY packages/contracts packages/contracts
COPY packages/database packages/database
RUN pnpm --filter @dota/database generate
RUN pnpm --filter "./packages/*" build
RUN pnpm --filter @dota/api build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable
COPY --from=build /app /app
USER node
EXPOSE 3000
CMD ["pnpm", "--filter", "@dota/api", "start"]
```

Сделайте аналогичный `apps/worker/Dockerfile`, копируя `packages/ingestion`, и command `@dota/worker start`. Это ваше следующее аналогичное задание ниже.

- `build` содержит compilers и исходники.
- `runtime` запускает готовый код как непривилегированный `node` user.
- `COPY package manifests` до исходников позволяет Docker cache dependency layer.
- В image нет `.env`; production values приходит из ECS environment/secrets.

Создайте `.dockerignore`: `.git`, `node_modules`, `.env*`, test output, `.expo`, `dist`, screenshots. Не исключайте Prisma schema до generate.

Проверьте локально:

```powershell
docker build -f apps/api/Dockerfile -t dota-api:local .
docker run --rm -p 3000:3000 --env-file .env dota-api:local
```

## 2. Создать CDK package

```powershell
New-Item -ItemType Directory -Force infra/bin,infra/lib
pnpm --dir infra add aws-cdk-lib constructs
pnpm --dir infra add -D aws-cdk typescript tsx
```

`infra/bin/app.ts`:

```ts
#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DotaAnalyzerStack } from '../lib/dota-analyzer-stack';

const app = new cdk.App();
const stage = app.node.tryGetContext('stage') ?? 'staging';
const domainName = app.node.tryGetContext('domainName');
if (typeof domainName !== 'string' || domainName.length === 0) {
  throw new Error('Pass -c domainName=example.com');
}

new DotaAnalyzerStack(app, `DotaAnalyzer-${stage}`, {
  stage,
  domainName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
```

- `app` — корень CDK construct tree.
- `stage` читается из `-c stage=staging` и входит в имя stack/resources.
- `domainName` — принадлежащий вам Route 53 domain без `api.`/`www.`; stack props сохраняет его как обязательную строку.
- `env` фиксирует AWS account/region текущего profile.

Создайте type `DotaAnalyzerStackProps extends cdk.StackProps` с полями `stage: string` и `domainName: string`; в constructor получите `const { stage, domainName } = props`. Импортируйте CDK modules `ec2`, `ecs`, `ecs_patterns`, `elasticache`, `rds`, `logs`, `route53`, `acm` и `secretsmanager` в `infra/lib/dota-analyzer-stack.ts` — это ровно сервисы, constructs которых используются ниже.

## 3. Сеть, database и cache

В stack constructor создайте:

```ts
const vpc = new ec2.Vpc(this, 'Vpc', {
  maxAzs: 2,
  natGateways: stage === 'production' ? 2 : 1,
});

const database = new rds.DatabaseInstance(this, 'Database', {
  vpc,
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_17_6,
  }),
  credentials: rds.Credentials.fromGeneratedSecret('dota_app'),
  databaseName: 'dota_analyzer',
  allocatedStorage: 20,
  storageEncrypted: true,
  backupRetention: cdk.Duration.days(stage === 'production' ? 14 : 3),
  multiAz: stage === 'production',
  deletionProtection: stage === 'production',
  removalPolicy:
    stage === 'production' ? cdk.RemovalPolicy.SNAPSHOT : cdk.RemovalPolicy.DESTROY,
});

const cacheSecurityGroup = new ec2.SecurityGroup(this, 'CacheSecurityGroup', {
  vpc,
});

const cache = new elasticache.CfnServerlessCache(this, 'Cache', {
  engine: 'valkey',
  serverlessCacheName: `dota-${stage}`,
  subnetIds: vpc.privateSubnets.map((subnet) => subnet.subnetId),
  securityGroupIds: [cacheSecurityGroup.securityGroupId],
});
```

Если ваша установленная CDK library не содержит ровно `VER_17_6`, выберите доступную minor-константу того же поддерживаемого major и зафиксируйте её в commit; не заменяйте на `latest`.

- `maxAzs: 2` распределяет subnets.
- NAT — заметная статья расходов. Две в production уменьшают single point of failure, одна в staging экономит деньги.
- RDS password генерируется и хранится Secrets Manager.
- `multiAz` — availability/failover, не read scaling.
- Production stack не уничтожает database при случайном удалении CDK stack.
- ElastiCache Serverless использует TLS; worker подключается `rediss://`.

## 4. ECS cluster и API service

```ts
const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
  generateSecretString: {
    excludePunctuation: true,
    passwordLength: 64,
  },
});

const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
  domainName,
});
const apiDomainName = `api.${domainName}`;
const apiCertificate = new acm.Certificate(this, 'ApiCertificate', {
  domainName: apiDomainName,
  validation: acm.CertificateValidation.fromDns(hostedZone),
});

const api = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Api', {
  cluster,
  publicLoadBalancer: true,
  domainName: apiDomainName,
  domainZone: hostedZone,
  certificate: apiCertificate,
  redirectHTTP: true,
  desiredCount: stage === 'production' ? 2 : 1,
  cpu: 512,
  memoryLimitMiB: 1024,
  taskImageOptions: {
    image: ecs.ContainerImage.fromAsset('../', {
      file: 'apps/api/Dockerfile',
    }),
    containerPort: 3000,
    environment: {
      NODE_ENV: 'production',
      API_PORT: '3000',
      APP_VERSION: process.env.GIT_SHA ?? 'unknown',
      DB_HOST: database.dbInstanceEndpointAddress,
      DB_PORT: database.dbInstanceEndpointPort,
      DB_NAME: 'dota_analyzer',
      DB_REQUIRE_TLS: 'true',
      PUBLIC_API_URL: `https://${apiDomainName}`,
      MOBILE_REDIRECT_URI: 'dotaanalyzer://auth/callback',
      CORS_ORIGINS: `https://www.${domainName}`,
    },
    secrets: {
      DB_USER: ecs.Secret.fromSecretsManager(database.secret!, 'username'),
      DB_PASSWORD: ecs.Secret.fromSecretsManager(database.secret!, 'password'),
      JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
    },
    logDriver: ecs.LogDrivers.awsLogs({
      streamPrefix: 'api',
      logRetention: logs.RetentionDays.ONE_MONTH,
    }),
  },
  circuitBreaker: { rollback: true },
});

api.targetGroup.configureHealthCheck({
  path: '/v1/system/readiness',
  healthyHttpCodes: '200',
});
```

Локально есть готовый `DATABASE_URL`, а ECS передаёт password отдельным secret. Создайте в `packages/database/src/connection-url.ts` окончательный builder:

```ts
type DatabaseConnectionInput = {
  url?: string;
  host?: string;
  port?: string;
  name?: string;
  user?: string;
  password?: string;
  requireTls: boolean;
};

export function buildDatabaseUrl(input: DatabaseConnectionInput): string {
  if (input.url) return input.url;
  if (!input.host || !input.port || !input.name || !input.user || !input.password) {
    throw new Error('Database connection variables are incomplete');
  }

  const url = new URL(`postgresql://${input.host}`);
  url.port = input.port;
  url.pathname = `/${input.name}`;
  url.username = input.user;
  url.password = input.password;
  if (input.requireTls) url.searchParams.set('sslmode', 'require');
  return url.toString();
}
```

Экспортируйте функцию из `@dota/database`. В API и worker измените соответствующую Zod env schema: `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` становятся optional. Поле TLS проверяйте так, чтобы строка `"false"` не превратилась в truthy boolean:

```ts
DB_REQUIRE_TLS: z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true'),
```

После `parse` вычислите единственное итоговое поле:

```ts
const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  DATABASE_URL: buildDatabaseUrl({
    url: parsedEnv.DATABASE_URL,
    host: parsedEnv.DB_HOST,
    port: parsedEnv.DB_PORT,
    name: parsedEnv.DB_NAME,
    user: parsedEnv.DB_USER,
    password: parsedEnv.DB_PASSWORD,
    requireTls: parsedEnv.DB_REQUIRE_TLS,
  }),
};
```

В worker объект называется `workerEnv`, но mapping тот же. `URL` сам percent-encode password; ручная склейка `postgresql://${password}@...` запрещена.

Разрешите network:

```ts
database.connections.allowDefaultPortFrom(api.service);
```

На текущем этапе cache использует worker, поэтому API получает только доступ к RDS. Cache ingress добавьте только для `workerService` после его создания. Не открывайте порт всему VPC без необходимости.

ACM certificate, Route 53 record и redirect HTTP → HTTPS уже входят в construct выше. Steam realm/return URL, privacy URLs и mobile API URL используют этот постоянный domain, не временное DNS имя ALB.

## 5. Ваша аналогичная задача: worker Fargate service

По образцу API создайте `ecs.FargateTaskDefinition` и `ecs.FargateService` без load balancer.

Точные имена:

- `workerTaskDefinition`;
- `workerContainer`;
- `workerService`;
- image file `apps/worker/Dockerfile`;
- environment содержит provider base URL, DB/cache endpoints, `APP_VERSION`;
- secrets — тот же RDS user/password;
- desired count: 1 staging, 2 production;
- command берётся из Dockerfile.

Эталон основы:

```ts
const workerTaskDefinition = new ecs.FargateTaskDefinition(this, 'WorkerTask', {
  cpu: 512,
  memoryLimitMiB: 1024,
});

const workerContainer = workerTaskDefinition.addContainer('WorkerContainer', {
  image: ecs.ContainerImage.fromAsset('../', {
    file: 'apps/worker/Dockerfile',
  }),
  environment: workerEnvironment,
  secrets: workerSecrets,
  logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'worker' }),
});

const workerService = new ecs.FargateService(this, 'WorkerService', {
  cluster,
  taskDefinition: workerTaskDefinition,
  desiredCount: stage === 'production' ? 2 : 1,
  circuitBreaker: { rollback: true },
});
```

В `workerEnvironment` задайте `REDIS_URL` через `cdk.Fn.join('', ['rediss://', cache.attrEndpointAddress, ':', cache.attrEndpointPort])`, `DB_REQUIRE_TLS: 'true'` и те же non-secret DB fields. `workerSecrets` передаёт username/password из RDS secret. После создания service:

```ts
database.connections.allowDefaultPortFrom(workerService);
cacheSecurityGroup.addIngressRule(
  workerService.connections.securityGroups[0],
  ec2.Port.tcp(6379),
);
```

`workerContainer` используется для конфигурации process, даже если значение дальше не читается — это CDK construct итоговой инфраструктуры. Разрешите DB/cache ingress именно от `workerService`.

## 6. Migration — отдельная one-off task

Не запускайте `prisma migrate deploy` одновременно в каждом API container. Создайте migration task definition с тем же image/env/secrets и command:

```text
pnpm --filter @dota/database exec prisma migrate deploy
```

Release pipeline:

```text
build immutable images
-> deploy task definitions/infrastructure
-> run one migration task and wait for exit 0
-> update API/worker services
-> wait for ECS steady state
-> production smoke test
```

Migration должна быть backward-compatible с предыдущей API revision: сначала добавить nullable column/table, выкатить code, заполнить данные, и только следующим release ужесточить constraint.

## 7. Alarms, backup и rollback

Создайте CloudWatch alarms минимум:

- ALB 5xx rate;
- target response p95;
- unhealthy target count;
- ECS running task count ниже desired;
- worker failed jobs custom metric;
- RDS CPU, free storage, connections;
- importer freshness больше 15 минут;
- monthly AWS budget.

Включите ECS circuit breaker с rollback. Он возвращает предыдущую task revision, если новая не становится healthy. Это не откатывает database migration — причина делать migrations совместимыми.

Раз в квартал выполните реальное восстановление RDS snapshot в staging и запишите RTO/RPO. Наличие backup без restore test не доказывает возможность восстановления.

## 8. Deploy и smoke

```powershell
pnpm --dir infra exec cdk bootstrap
pnpm --dir infra exec cdk diff -c stage=staging -c domainName=example.com
pnpm --dir infra exec cdk deploy -c stage=staging -c domainName=example.com
```

Перед production обязательно staging. Smoke script `scripts/smoke-production.ts` проверяет:

- `/system/health` и `/readiness`;
- `/matches?limit=1` через contract;
- `/meta/heroes` через contract;
- неизвестный private endpoint даёт 401;
- latest imported match не старше допустимого окна.

## 9. Commit

```powershell
pnpm -r typecheck
pnpm --dir infra exec cdk synth -c stage=staging
git add apps infra packages scripts
git commit -m "feat(infra): deploy API worker database and queue to AWS"
```

Сохраните AWS account ID, region, domain, stack names и restore procedure в `docs/runbooks/production.md`, но ни одного secret.

[Следующий модуль](17-store-release.md)
