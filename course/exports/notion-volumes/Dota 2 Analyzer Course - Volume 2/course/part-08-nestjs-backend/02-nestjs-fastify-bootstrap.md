# Глава 2. Создание NestJS-приложения с Fastify

[← Глава 1](01-server-and-request-lifecycle.md) · [Оглавление](README.md) · [Глава 3 →](03-modules-controllers-services-di.md)

## Scaffold

В корне учебного repository создайте приложение через актуальный Nest CLI без глобальной установки:

```powershell
pnpm dlx @nestjs/cli@latest new apps/api --package-manager pnpm --strict --skip-git
```

Если актуальный CLI изменил flags, выполните `pnpm dlx @nestjs/cli@latest new --help` и выберите эквиваленты: TypeScript strict, pnpm, без вложенного Git.

Установите adapter и инфраструктурные пакеты:

```powershell
Set-Location apps/api
pnpm add @nestjs/platform-fastify @nestjs/config @nestjs/swagger
pnpm add class-validator class-transformer
```

Удаляйте Express adapter только после того, как импортов на него нет и Fastify build проходит.

## `main.ts`

```ts
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  const port = readPort(process.env.PORT);
  const host = process.env.HOST ?? '127.0.0.1';
  await app.listen(port, host);
}

function readPort(value: string | undefined): number {
  if (value === undefined) return 3000;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer from 1 to 65535');
  }
  return port;
}

void bootstrap();
```

`void bootstrap()` явно показывает, что Promise не await-ится на top level. Для production добавьте bootstrap error handler, который пишет безопасную ошибку и завершает process.

## Host

Локально `127.0.0.1` безопаснее. В container обычно нужен `0.0.0.0`, иначе порт недоступен снаружи container. Это configuration, а не захардкоженная production уступка.

## Versioning

URI versioning превращает controller version `1` в `/v1/...`. Не добавляйте одновременно global prefix `v1`, иначе получите дублирование.

## CORS

React Native native networking не подчиняется браузерному CORS так же, но web/dev tools могут. Не используйте `origin: '*'` вместе с credentials. Allowed origins задаются configuration для конкретной среды.

## Проверка

```powershell
pnpm start:dev
```

Во втором terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/v1/health
```

Endpoint появится после health controller. Сейчас важен успешный bootstrap без Express.

## Самопроверка

- [ ] CLI не установлен глобально без необходимости.
- [ ] Strict TypeScript включён.
- [ ] Fastify adapter используется явно.
- [ ] Host/port валидируются из configuration.
- [ ] Version появляется ровно один раз.
