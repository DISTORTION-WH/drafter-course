# Файл `fixtures.ts`

Исходный путь в учебном комплекте: `course/part-04-typescript/examples/dota-history-cli-ts/test/fixtures.ts`.

```typescript
interface RawPlayerFixture {
  accountId: string;
  name: string;
  hero: string;
  team: "radiant" | "dire";
  kills: number;
  deaths: number;
  assists: number;
}

interface RawMatchFixture {
  id: string;
  status: string;
  durationSeconds: number;
  radiantWin: boolean;
  radiantTeam: string;
  direTeam: string;
  players: RawPlayerFixture[];
}

function createRawPlayer(index: number): RawPlayerFixture {
  const radiant = index < 5;

  return {
    accountId: String(1000 + index),
    name: `Player ${index}`,
    hero: index === 0 ? "Rubick" : `Hero ${index}`,
    team: radiant ? "radiant" : "dire",
    kills: index,
    deaths: Math.max(1, index - 1),
    assists: index + 5,
  };
}

export function createRawHistory(): RawMatchFixture[] {
  return [
    {
      id: "fixture-match-1",
      status: "finished",
      durationSeconds: 2400,
      radiantWin: true,
      radiantTeam: "Fixture Radiant",
      direTeam: "Fixture Dire",
      players: Array.from({ length: 10 }, (_, index) => {
        return createRawPlayer(index);
      }),
    },
  ];
}

```