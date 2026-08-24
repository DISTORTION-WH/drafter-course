import { validateMatchHistory } from "./validation.js";

export function roundToTwoDigits(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function playerWonMatch(player, match) {
  return player.team === "radiant"
    ? match.radiantWin
    : !match.radiantWin;
}

export function buildHeroStats(matches) {
  const statsByHero = new Map();

  for (const match of matches) {
    for (const player of match.players) {
      const current = statsByHero.get(player.hero) ?? {
        hero: player.hero,
        games: 0,
        wins: 0,
        kills: 0,
        assists: 0,
      };

      statsByHero.set(player.hero, {
        ...current,
        games: current.games + 1,
        wins: current.wins + Number(playerWonMatch(player, match)),
        kills: current.kills + player.kills,
        assists: current.assists + player.assists,
      });
    }
  }

  return [...statsByHero.values()]
    .map((stats) => ({
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

export function analyzeMatchHistory(matches) {
  validateMatchHistory(matches);

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

  const matchSummaries = matches.map((match) => ({
    id: match.id,
    durationSeconds: match.durationSeconds,
    winnerTeam: match.radiantWin ? match.radiantTeam : match.direTeam,
    totalKills: match.players.reduce(
      (sum, player) => sum + player.kills,
      0,
    ),
  }));

  return {
    totalMatches: matches.length,
    radiantWins,
    direWins: matches.length - radiantWins,
    totalKills,
    averageDurationSeconds: roundToTwoDigits(
      totalDurationSeconds / matches.length,
    ),
    uniquePlayers: uniqueAccountIds.size,
    mostPickedHero: heroStats[0],
    heroStats,
    matchSummaries,
  };
}
