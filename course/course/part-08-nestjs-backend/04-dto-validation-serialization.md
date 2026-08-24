# Глава 4. DTO, validation и serialization

[← Глава 3](03-modules-controllers-services-di.md) · [Оглавление](README.md) · [Глава 5 →](05-error-contract.md)

## DTO — transport contract

DTO описывает вход/выход API. Domain model и database row решают другие задачи. Не возвращайте Drizzle object напрямую.

## Path parameter

Создайте custom pipe для decimal ID string:

```ts
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class DecimalIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException('ID must contain digits only');
    }
    return value;
  }
}
```

Controller:

```ts
getOne(@Param('id', DecimalIdPipe) id: string): Promise<MatchDto>
```

Мы не преобразуем ID в `number`.

## Query DTO

```ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListMatchesQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  patch?: string;
}
```

Query parameters приходят строками. `@Type(() => Number)` выполняет явное преобразование; validators проверяют результат. Не включайте неограниченное implicit conversion глобально, пока не понимаете последствия.

## Output DTO

```ts
export type MatchSummaryDto = {
  id: string;
  startedAt: string;
  durationSeconds: number;
  patch: string | null;
  winner: 'radiant' | 'dire';
  radiantTeam: TeamSummaryDto | null;
  direTeam: TeamSummaryDto | null;
};
```

Правила:

- ID — decimal string;
- time — ISO 8601 UTC (`Date.toISOString()`);
- duration — seconds;
- unknown — документированный `null`, не случайное отсутствие;
- enum values стабильны и lowercase.

## Whitelist

Global ValidationPipe с `whitelist: true` удаляет свойства без validation decorators; `forbidNonWhitelisted: true` вместо молчаливого игнорирования сообщает ошибку. Это относится к class DTO. Type aliases сами runtime validation не создают.

## Serialization leak

Следующие поля не должны случайно попасть в ответ:

- internal IDs, если public ID другой;
- raw provider payload;
- ingestion errors;
- secret/provider key;
- internal notes;
- database timestamps, не входящие в contract.

Используйте явный mapper:

```ts
function toMatchSummaryDto(row: MatchListRow): MatchSummaryDto {
  return {
    id: row.providerMatchId,
    startedAt: row.startTime.toISOString(),
    durationSeconds: row.durationSeconds,
    patch: row.patchId,
    winner: row.radiantWin ? 'radiant' : 'dire',
    radiantTeam: toTeamDto(row.radiantTeam),
    direTeam: toTeamDto(row.direTeam),
  };
}
```

## Практика

Проверьте E2E:

- `limit=0`, `101`, `abc` → `400`;
- unknown query field → `400`;
- ID с `/`, minus, decimal → `400`;
- valid response не содержит `internalId`;
- все даты заканчиваются `Z`.

## Самопроверка

- [ ] DTO не является database row.
- [ ] Query string явно преобразуется и проверяется.
- [ ] ID остаётся string.
- [ ] Mapper перечисляет public fields.
- [ ] Неожиданные input fields запрещены.
