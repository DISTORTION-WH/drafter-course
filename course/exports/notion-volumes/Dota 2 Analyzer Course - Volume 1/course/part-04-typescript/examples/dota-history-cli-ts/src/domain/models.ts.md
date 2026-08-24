# Файл `models.ts`

Исходный путь в учебном комплекте: `course/part-04-typescript/examples/dota-history-cli-ts/src/domain/models.ts`.

```typescript
export type TeamSide = "radiant" | "dire";

export type MatchStatus = "finished";

export interface Hero {
  readonly name: string;
}

export interface Team {
  readonly name: string;
  readonly side: TeamSide;
}

export interface Player {
  readonly accountId: string;
  readonly name: string;
  readonly hero: Hero;
  readonly team: TeamSide;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
}

export interface Match {
  readonly id: string;
  readonly status: MatchStatus;
  readonly durationSeconds: number;
  readonly radiantWin: boolean;
  readonly radiantTeam: Team;
  readonly direTeam: Team;
  readonly players: readonly Player[];
}

export interface HeroStats {
  readonly hero: string;
  readonly games: number;
  readonly wins: number;
  readonly kills: number;
  readonly assists: number;
  readonly winRate: number;
  readonly averageKills: number;
  readonly averageAssists: number;
}

export interface MatchSummary {
  readonly id: string;
  readonly durationSeconds: number;
  readonly winnerTeam: string;
  readonly totalKills: number;
}

export interface HistoryReport {
  readonly totalMatches: number;
  readonly radiantWins: number;
  readonly direWins: number;
  readonly totalKills: number;
  readonly averageDurationSeconds: number;
  readonly uniquePlayers: number;
  readonly mostPickedHero: HeroStats;
  readonly heroStats: readonly HeroStats[];
  readonly matchSummaries: readonly MatchSummary[];
}

```