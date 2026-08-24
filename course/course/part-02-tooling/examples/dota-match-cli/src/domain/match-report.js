import {
  calculateKda,
  formatDuration,
  roundToTwoDigits,
} from "./calculations.js";
import { validateMatch, validatePlayer } from "./validation.js";

export function analyzePlayer(player) {
  const errors = validatePlayer(player);

  if (errors.length > 0) {
    throw new Error(`Невалидный игрок: ${errors.join(", ")}`);
  }

  return {
    ...player,
    kda: roundToTwoDigits(
      calculateKda(player.kills, player.deaths, player.assists),
    ),
  };
}

export function createTeamSummary(players, team) {
  const teamPlayers = players.filter((player) => player.team === team);

  const kills = teamPlayers.reduce((sum, player) => sum + player.kills, 0);
  const deaths = teamPlayers.reduce((sum, player) => sum + player.deaths, 0);
  const assists = teamPlayers.reduce((sum, player) => sum + player.assists, 0);
  const totalKda = teamPlayers.reduce((sum, player) => {
    const exactKda = calculateKda(
      player.kills,
      player.deaths,
      player.assists,
    );

    return sum + exactKda;
  }, 0);
  const averageKda = teamPlayers.length === 0
    ? 0
    : roundToTwoDigits(totalKda / teamPlayers.length);

  return {
    team,
    playerCount: teamPlayers.length,
    kills,
    deaths,
    assists,
    averageKda,
  };
}

export function findTopPlayer(players) {
  if (players.length === 0) {
    return null;
  }

  let topPlayer = players[0];

  for (const player of players) {
    if (player.kda > topPlayer.kda) {
      topPlayer = player;
    }
  }

  return topPlayer;
}

export function createMatchReport(match) {
  const errors = validateMatch(match);

  if (errors.length > 0) {
    throw new Error(`Невалидный матч: ${errors.join("; ")}`);
  }

  const analyzedPlayers = match.players.map(analyzePlayer);

  return {
    matchId: match.id,
    duration: formatDuration(match.durationSeconds),
    winner: match.radiantWin ? match.radiantTeam : match.direTeam,
    radiant: createTeamSummary(analyzedPlayers, "radiant"),
    dire: createTeamSummary(analyzedPlayers, "dire"),
    topPlayer: findTopPlayer(analyzedPlayers),
    players: analyzedPlayers,
  };
}
