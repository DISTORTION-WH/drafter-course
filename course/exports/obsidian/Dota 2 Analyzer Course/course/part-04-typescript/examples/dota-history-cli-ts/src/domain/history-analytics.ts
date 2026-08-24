import type {
  HeroStats,
  HistoryReport,
  Match,
  Player,
} from "./models.js";

interface HeroAccumulator {
  readonly hero: string;
  readonly games: number;
  readonly wins: number;
  readonly kills: number;
  readonly assists: number;
}

export function roundToTwoDigits(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function playerWonMatch(player: Player, match: Match): boolean {
  return player.team === "radiant"
    ? match.radiantWin
    : !match.radiantWin;
}

export function buildHeroStats(
  matches: readonly Match[],
): HeroStats[] {
  const statsByHero = new Map<string, HeroAccumulator>();

  for (const match of matches) {
    for (const player of match.players) {
      const heroName = player.hero.name;
      const current = statsByHero.get(heroName) ?? {
        hero: heroName,
        games: 0,
        wins: 0,
        kills: 0,
        assists: 0,
      };

      statsByHero.set(heroName, {
        hero: current.hero,
        games: current.games + 1,
        wins: current.wins + Number(playerWonMatch(player, match)),
        kills: current.kills + player.kills,
        assists: current.assists + player.assists,
      });
    }
  }

  return [...statsByHero.values()]
    .map((stats): HeroStats => ({
      ...stats,
      winRate: roundToTwoDigits((stats.wins / stats.games) * 100),
      averageKills: roundToTwoDigits(stats.kills / stats.games),
      averageAssists: roundToTwoDigits(stats.assists / stats.games),
    }))
    .sort((first, second) => {
      return (
        second.games - first.games ||
        second.wins - first.wins ||
        first.hero.localeCompare(second.hero, "en")
      );
    });
}

export function analyzeMatchHistory(
  matches: readonly Match[],
): HistoryReport {
  if (matches.length === 0) {
    throw new TypeError("Нельзя анализировать пустую историю матчей");
  }

  const allPlayers = matches.flatMap((match) => match.players);
  const radiantWins = matches.filter((match) => match.radiantWin).length;
  const totalKills = allPlayers.reduce(
    (sum, player) => sum + player.kills,
    0,
  );
  const totalDurationSeconds = matches.reduce(
    (sum, match) => sum + match.durationSeconds,
    0,
  );
  const uniqueAccountIds = new Set(
    allPlayers.map((player) => player.accountId),
  );
  const heroStats = buildHeroStats(matches);
  const mostPickedHero = heroStats[0];

  if (mostPickedHero === undefined) {
    throw new Error("Нельзя определить самого популярного героя");
  }

  return {
    totalMatches: matches.length,
    radiantWins,
    direWins: matches.length - radiantWins,
    totalKills,
    averageDurationSeconds: roundToTwoDigits(
      totalDurationSeconds / matches.length,
    ),
    uniquePlayers: uniqueAccountIds.size,
    mostPickedHero,
    heroStats,
    matchSummaries: matches.map((match) => ({
      id: match.id,
      durationSeconds: match.durationSeconds,
      winnerTeam: match.radiantWin
        ? match.radiantTeam.name
        : match.direTeam.name,
      totalKills: match.players.reduce(
        (sum, player) => sum + player.kills,
        0,
      ),
    })),
  };
}
