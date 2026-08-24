# Глава 8. OpenAPI и проверяемый контракт

[← Глава 7](07-repository-and-database.md) · [Оглавление](README.md) · [Глава 9 →](09-operations-and-testing.md)

## Зачем OpenAPI

OpenAPI — machine-readable описание routes, parameters, schemas и responses. Оно позволяет:

- видеть interactive docs;
- проверять breaking changes;
- генерировать TypeScript client для React Native;
- создавать contract tests;
- не переписывать DTO вручную на mobile.

Документация не заменяет runtime validation.

## Bootstrap Swagger

```ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const openApiConfig = new DocumentBuilder()
  .setTitle('Dota Analyzer API')
  .setDescription('Professional Dota 2 match and meta API')
  .setVersion('1.0.0')
  .build();

const document = SwaggerModule.createDocument(app, openApiConfig);
SwaggerModule.setup('docs', app, document);
```

В production interactive docs могут требовать access control или быть выключены; JSON spec может публиковаться отдельно.

## Response classes

Decorator metadata не видит TypeScript type alias после compilation. Для хорошей schema используйте classes и `@ApiProperty`, либо официальный CLI plugin:

```ts
export class MatchSummaryResponse {
  @ApiProperty({ example: '8000000000', pattern: '^\\d+$' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  startedAt!: string;

  @ApiProperty({ example: 2345, minimum: 0 })
  durationSeconds!: number;
}
```

Definite assignment `!` говорит compiler, что framework/mapper назначит поле; это не runtime validation. Можно предпочесть constructor для более явной инициализации.

## Документируйте ошибки

Каждый endpoint описывает `400`, `404`, `500/503`, а не только happy path. Общие schemas вынесите в reusable response model.

## Export spec

Добавьте script, который bootstrap application без listen, создаёт document и записывает `openapi.json`. Generated spec можно проверять в CI.

```text
code DTO/routes
→ openapi.json
→ lint/diff
→ generated mobile client
```

Generated client не коммитьте или коммитьте осознанно в одном PR с spec; выберите один repeatable workflow.

## Breaking change check

Примеры breaking:

- `id: string` стал number;
- required field удалён;
- optional стал required;
- enum потерял value;
- response `200` изменил wrapper;
- cursor изменил публичную семантику.

Добавление нового optional response field обычно безопаснее.

## Contract examples

Examples должны быть вымышленными/обезличенными, не secret и не огромным реальным provider payload.

## Практика

1. Откройте `/docs`.
2. Найдите все `/v1/matches` operations.
3. Проверьте type ID, date-time, nullable team, limit constraints.
4. Сохраните spec.
5. Напишите test, что operation IDs уникальны и error schema присутствует.

## Самопроверка

- [ ] OpenAPI отражает runtime routes.
- [ ] ID описан как string.
- [ ] Ошибки документированы.
- [ ] Spec генерируется повторяемо.
- [ ] Breaking changes проверяются до merge.
