# Модуль 2. Запускаем настоящий Node.js API

## Результат

Появится `apps/api`: production-oriented NestJS/Fastify приложение с проверяемой конфигурацией, `/health` и `/version`. Эти endpoints останутся в AWS deployment.

## 1. Создать API package

Мы не запускаем generator с демонстрационными controller/service, которые пришлось бы удалять. Создайте только итоговые директории:

```powershell
New-Item -ItemType Directory -Force apps/api/src/config,apps/api/src/system
```

Создайте `apps/api/package.json`:

```json
{
  "name": "@dota/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "nest build",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-fastify": "^11.0.0",
    "dotenv": "^17.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@types/node": "^24.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^3.0.0"
  }
}
```

Создайте `apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts", "test"]
}
```

Создайте `apps/api/nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "sourceRoot": "src"
}
```

Теперь выполните `pnpm install`. Все созданные файлы остаются в финальном backend; default `Hello World` code в репозиторий вообще не попадает.

## 2. Проверяем конфигурацию, а не надеемся на неё

Создайте `apps/api/src/config/env.ts`:

```ts
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  API_PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z.string().url(),
  APP_VERSION: z.string().min(1),
});

export const env = envSchema.parse(process.env);
```

Разбор:

- `envSchema` — переменная с правилами всех обязательных настроек API;
- `config` читает единственный корневой `.env` при локальном запуске; в ECS файла нет, и используются настоящие process environment variables;
- `z.object` требует объект с перечисленными полями;
- `z.enum` не разрешит опечатку `prodution`;
- `z.coerce.number` превращает строку `"3000"` из `.env` в число `3000`;
- `min(1).max(65535)` запрещает невозможный TCP port;
- `parse(process.env)` выполняется при запуске;
- `env` — уже проверенный объект. Остальной код не читает `process.env` напрямую.

Если `DATABASE_URL` отсутствует, API должен упасть сразу. Позднее это лучше, чем ошибка через двадцать минут при первом запросе.

## 3. Настоящий `main.ts`

Замените `apps/api/src/main.ts`:

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  const adapter = new FastifyAdapter({
    logger: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  app.enableShutdownHooks();
  app.setGlobalPrefix('v1');

  await app.listen({
    port: env.API_PORT,
    host: '0.0.0.0',
  });
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
```

Разбор функций и переменных:

- `bootstrap` — async-функция, собирающая и запускающая сервер;
- `Promise<void>` означает: функция завершится асинхронно, но не возвращает предметные данные;
- `adapter` хранит Fastify adapter, который Nest использует вместо Express;
- `app` хранит запущенное Nest application;
- generic `<NestFastifyApplication>` сообщает TypeScript, какие методы доступны;
- `enableShutdownHooks` нужен для корректного завершения ECS task;
- `setGlobalPrefix('v1')` делает URL versioned;
- `env.API_PORT` берётся только из проверенной конфигурации;
- `0.0.0.0` позволяет Docker/ECS направить запрос в контейнер;
- `void bootstrap()` явно запускает async-функцию из top-level;
- `error` хранит причину неудачного старта, а `process.exitCode = 1` сообщает Docker/ECS, что process завершился ошибкой.

## 4. Реальный пример: health endpoint

Создайте `apps/api/src/system/system.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
type HealthResponse = {
  status: 'ok';
};

@Controller('system')
export class SystemController {
  @Get('health')
  getHealth(): HealthResponse {
    return { status: 'ok' };
  }

}
```

Создайте `apps/api/src/system/system.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';

@Module({
  controllers: [SystemController],
})
export class SystemModule {}
```

Подключите в `app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { SystemModule } from './system/system.module';

@Module({
  imports: [SystemModule],
})
export class AppModule {}
```

`SystemModule` группирует только системные endpoints. Позже `MatchesModule` не будет смешан с health check.

## 5. Ваша аналогичная задача: version endpoint

`health` уже показывает, что process жив. Теперь добавьте endpoint, который навсегда останется экраном диагностики и меткой production release.

1. Импортируйте `env` из `../config/env`.
2. Создайте type `VersionResponse`.
3. Поле `version` имеет type `string`.
4. Поле `environment` имеет type `string`.
5. В `SystemController` создайте функцию `getVersion`.
6. Decorator: `@Get('version')`.
7. Верните `env.APP_VERSION` и `env.NODE_ENV`.

Эталон:

```ts
type VersionResponse = {
  version: string;
  environment: string;
};

@Get('version')
getVersion(): VersionResponse {
  return {
    version: env.APP_VERSION,
    environment: env.NODE_ENV,
  };
}
```

`version` и `environment` берутся из уже проверенного объекта `env`. Здесь не создаётся временная константа: endpoint в таком виде остаётся в production и используется mobile-экраном состояния.

## 6. Проверка

Корневой `.env` уже читается через явный путь. Запустите:

```powershell
pnpm dev:api
```

В другом окне:

```powershell
Invoke-RestMethod http://localhost:3000/v1/system/health
Invoke-RestMethod http://localhost:3000/v1/system/version
```

Ожидается `status=ok` и версия `0.1.0`.

## 7. Commit

```powershell
git add apps/api package.json pnpm-lock.yaml
git commit -m "feat(api): bootstrap Fastify API with validated configuration"
```

## Готово, если

- API запускается root-командой;
- неверный port останавливает запуск;
- два endpoint отвечают;
- вы понимаете, чем type отличается от runtime validation;
- вы можете объяснить каждую переменную `adapter`, `app` и `env`.

[Следующий модуль](03-matches-vertical-slice.md)
