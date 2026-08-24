# Глава 3. Module, controller, service и dependency injection

[← Глава 2](02-nestjs-fastify-bootstrap.md) · [Оглавление](README.md) · [Глава 4 →](04-dto-validation-serialization.md)

## Четыре роли

- Module соединяет providers/controllers и определяет границы feature.
- Controller переводит HTTP в вызов use case.
- Service содержит application logic.
- Repository читает/пишет persistence.

## Feature structure

```text
src/matches/
├─ matches.module.ts
├─ matches.controller.ts
├─ matches.service.ts
├─ match.repository.ts
├─ postgres-match.repository.ts
├─ match.mapper.ts
└─ dto/
```

Группировка по feature лучше папок `controllers/` на всё приложение: связанные файлы находятся рядом.

## Injection token

Interface исчезает после компиляции TypeScript, поэтому нужен runtime token:

```ts
export const MATCH_REPOSITORY = Symbol('MATCH_REPOSITORY');

export interface MatchRepository {
  findByPublicId(id: string): Promise<MatchRecord | null>;
  list(input: MatchListQuery): Promise<MatchPageRecord>;
}
```

`Symbol` исключает случайное совпадение строковых tokens.

## Service

```ts
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class MatchesService {
  constructor(
    @Inject(MATCH_REPOSITORY)
    private readonly matches: MatchRepository,
  ) {}

  async getOne(id: string): Promise<MatchView> {
    const record = await this.matches.findByPublicId(id);
    if (record === null) throw new MatchNotFoundError(id);
    return mapMatchRecordToView(record);
  }
}
```

Decorator `@Injectable()` добавляет metadata для container. Constructor объявляет зависимость; service не создаёт repository через `new`.

## Controller

```ts
import { Controller, Get, Param } from '@nestjs/common';

@Controller({ path: 'matches', version: '1' })
export class MatchesController {
  constructor(private readonly service: MatchesService) {}

  @Get(':id')
  getOne(@Param('id') id: string): Promise<MatchView> {
    return this.service.getOne(id);
  }
}
```

Validation ID добавим pipe/DTO в следующей главе. Controller тонкий: не знает SQL, provider и calculation details.

## Module wiring

```ts
@Module({
  controllers: [MatchesController],
  providers: [
    MatchesService,
    {
      provide: MATCH_REPOSITORY,
      useClass: PostgresMatchRepository,
    },
  ],
})
export class MatchesModule {}
```

В unit test token получит fake repository. В production — PostgreSQL implementation. Это и есть dependency inversion на практическом уровне.

## Не превращайте service в pass-through

Если service навсегда только вызывает repository теми же аргументами, слой не даёт пользы. Но здесь service является местом use-case rules, mapping, authorization later и domain errors. Не кладите туда HTTP status decorators.

## Circular dependencies

`MatchesService → TeamsService → MatchesService` — сигнал неверной границы. Вынесите общий use case/query provider, измените направление зависимости. `forwardRef` — крайний инструмент, не стандартный ремонт архитектуры.

## Практика

Создайте fake repository с двумя matches и unit test service:

- найденная запись maps в view;
- отсутствие вызывает `MatchNotFoundError`;
- repository получает ID без изменения;
- service не возвращает database-only field.

## Самопроверка

- [ ] Controller содержит только transport coordination.
- [ ] Service получает repository через constructor.
- [ ] Interface имеет runtime token.
- [ ] Public view отделён от DB record.
- [ ] Нет циклической зависимости features.
