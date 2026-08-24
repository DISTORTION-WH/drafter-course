# Глава 7. Repository и PostgreSQL

[← Глава 6](06-rest-versioning-pagination.md) · [Оглавление](README.md) · [Глава 8 →](08-openapi-contract.md)

## Database module

Создайте global или импортируемый `DatabaseModule`, который владеет pool/Drizzle instance. Не создавайте pool в каждом repository.

```ts
export const DATABASE = Symbol('DATABASE');

@Module({
  providers: [
    {
      provide: DATABASE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Database => {
        const url = config.getOrThrow<string>('DATABASE_URL');
        return createDatabase(url);
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
```

`Database` — ваш тип wrapper, содержащий query API и функцию закрытия.

## List row не равен таблице

```ts
export type MatchListRow = {
  internalId: bigint;
  providerMatchId: string;
  startTime: Date;
  durationSeconds: number;
  radiantWin: boolean;
  patchId: string | null;
  radiantTeam: TeamRow | null;
  direTeam: TeamRow | null;
};
```

Repository возвращает проекцию, нужную use case, а не все columns.

## Query ownership

Простой CRUD может использовать Drizzle query builder. Сложные агрегаты и tuned SQL можно хранить явно:

```ts
const rows = await this.db.execute(sql<MatchListRow>`
  SELECT ...
  FROM matches AS m
  LEFT JOIN teams AS rt ON rt.id = m.radiant_team_id
  LEFT JOIN teams AS dt ON dt.id = m.dire_team_id
  WHERE m.start_time < ${cursorStartedAt}
  ORDER BY m.start_time DESC, m.id DESC
  LIMIT ${limitPlusOne}
`);
```

Интерполяция Drizzle `sql` параметризует values; не подставляйте raw user SQL fragments.

## Bigint boundary

PostgreSQL `bigint` driver может вернуть string или JavaScript `bigint` в зависимости от настройки. Зафиксируйте одно поведение в database adapter. Public mapper всегда делает decimal string:

```ts
function bigintToId(value: bigint): string {
  return value.toString(10);
}
```

`JSON.stringify(1n)` бросает ошибку, поэтому raw bigint не должен дойти до HTTP serialization.

## Query timeout

HTTP deadline не останавливает уже выполняющийся SQL автоматически. Настройте server-side `statement_timeout` для runtime role/session и propagation cancellation, если driver поддерживает. Значения зависят от endpoint; analytics может иметь отдельный budget.

## N+1

Если list возвращает 20 matches и затем controller делает 40 запросов teams, это N+1. Соберите данные JOIN/batch query. Но гигантский JOIN с participants и drafts может умножить строки; иногда лучше 2–3 batched queries и grouping в mapper.

## Error translation

Repository знает driver error codes, но наружу возвращает application-friendly category. Никогда не определяйте unique violation по английскому тексту; используйте PostgreSQL SQLSTATE и проверенный constraint name.

## Практика

Integration tests repository:

- page 1/page 2 без duplicate/gap на неизменном dataset;
- фильтр patch;
- nullable teams;
- stable order одинакового start time;
- bigint превращается в string только на DTO boundary;
- query count не растёт с числом matches.

## Самопроверка

- [ ] Pool/DB instance один на process.
- [ ] Repository возвращает явную projection.
- [ ] SQL parameterized.
- [ ] `bigint` не попадает в JSON.
- [ ] List не создаёт N+1.
