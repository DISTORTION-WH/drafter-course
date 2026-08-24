const match = {
  id: "8123456789",
  status: "finished",
  durationSeconds: 2470,
  radiantWin: true,
  radiantTeam: "Aurora Owls",
  direTeam: "Crimson Roshan",
  players: [
    { name: "North", hero: "Juggernaut", team: "radiant", kills: 12, deaths: 2, assists: 9 },
    { name: "River", hero: "Puck", team: "radiant", kills: 8, deaths: 3, assists: 14 },
    { name: "Stone", hero: "Mars", team: "radiant", kills: 4, deaths: 4, assists: 17 },
    { name: "Spark", hero: "Rubick", team: "radiant", kills: 3, deaths: 5, assists: 21 },
    { name: "Mist", hero: "Crystal Maiden", team: "radiant", kills: 2, deaths: 6, assists: 19 },
    { name: "Flame", hero: "Luna", team: "dire", kills: 7, deaths: 5, assists: 8 },
    { name: "Shade", hero: "Invoker", team: "dire", kills: 6, deaths: 5, assists: 11 },
    { name: "Iron", hero: "Centaur Warrunner", team: "dire", kills: 3, deaths: 6, assists: 12 },
    { name: "Echo", hero: "Lion", team: "dire", kills: 2, deaths: 7, assists: 13 },
    { name: "Frost", hero: "Jakiro", team: "dire", kills: 1, deaths: 6, assists: 16 },
  ],
};

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeNumber(value) {
  return typeof value === "number"
    && Number.isFinite(value)
    && value >= 0;
}

function roundToTwoDigits(value) {
  return Math.round(value * 100) / 100;
}

function calculateKda(kills, deaths, assists) {
  const safeDeaths = deaths === 0 ? 1 : deaths;
  return (kills + assists) / safeDeaths;
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function validatePlayer(player) {
  if (typeof player !== "object" || player === null) {
    return ["player должен быть объектом"];
  }

  const errors = [];

  if (!isNonEmptyString(player.name)) {
    errors.push("name должен быть непустой строкой");
  }

  if (!isNonEmptyString(player.hero)) {
    errors.push("hero должен быть непустой строкой");
  }

  if (player.team !== "radiant" && player.team !== "dire") {
    errors.push("team должен быть radiant или dire");
  }

  if (!isNonNegativeNumber(player.kills)) {
    errors.push("kills должен быть неотрицательным числом");
  }

  if (!isNonNegativeNumber(player.deaths)) {
    errors.push("deaths должен быть неотрицательным числом");
  }

  if (!isNonNegativeNumber(player.assists)) {
    errors.push("assists должен быть неотрицательным числом");
  }

  return errors;
}

function analyzePlayer(player) {
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

function createTeamSummary(players, team) {
  const teamPlayers = players.filter((player) => player.team === team);

  const kills = teamPlayers.reduce((sum, player) => sum + player.kills, 0);
  const deaths = teamPlayers.reduce((sum, player) => sum + player.deaths, 0);
  const assists = teamPlayers.reduce((sum, player) => sum + player.assists, 0);
  const totalKda = teamPlayers.reduce((sum, player) => sum + player.kda, 0);
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

function findTopPlayer(players) {
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

function validateMatch(matchValue) {
  if (typeof matchValue !== "object" || matchValue === null) {
    return ["match должен быть объектом"];
  }

  const errors = [];

  if (!isNonEmptyString(matchValue.id)) {
    errors.push("id должен быть непустой строкой");
  }

  if (matchValue.status !== "finished") {
    errors.push("status должен быть finished");
  }

  if (!isNonNegativeNumber(matchValue.durationSeconds)
    || matchValue.durationSeconds === 0) {
    errors.push("durationSeconds должен быть числом больше нуля");
  }

  if (typeof matchValue.radiantWin !== "boolean") {
    errors.push("radiantWin должен быть boolean");
  }

  if (!isNonEmptyString(matchValue.radiantTeam)) {
    errors.push("radiantTeam должен быть непустой строкой");
  }

  if (!isNonEmptyString(matchValue.direTeam)) {
    errors.push("direTeam должен быть непустой строкой");
  }

  if (!Array.isArray(matchValue.players)) {
    errors.push("players должен быть массивом");
    return errors;
  }

  if (matchValue.players.length !== 10) {
    errors.push("players должен содержать десять игроков");
  }

  const radiantCount = matchValue.players.filter(
    (player) => player?.team === "radiant",
  ).length;
  const direCount = matchValue.players.filter(
    (player) => player?.team === "dire",
  ).length;

  if (radiantCount !== 5) {
    errors.push("в матче должно быть пять игроков Radiant");
  }

  if (direCount !== 5) {
    errors.push("в матче должно быть пять игроков Dire");
  }

  matchValue.players.forEach((player, index) => {
    const playerErrors = validatePlayer(player);

    for (const error of playerErrors) {
      errors.push(`players[${index}]: ${error}`);
    }
  });

  return errors;
}

function createMatchReport(matchValue) {
  const errors = validateMatch(matchValue);

  if (errors.length > 0) {
    throw new Error(`Невалидный матч: ${errors.join("; ")}`);
  }

  const analyzedPlayers = matchValue.players.map(analyzePlayer);
  const topPlayer = findTopPlayer(analyzedPlayers);

  return {
    matchId: matchValue.id,
    duration: formatDuration(matchValue.durationSeconds),
    winner: matchValue.radiantWin
      ? matchValue.radiantTeam
      : matchValue.direTeam,
    radiant: createTeamSummary(analyzedPlayers, "radiant"),
    dire: createTeamSummary(analyzedPlayers, "dire"),
    topPlayer,
    players: analyzedPlayers,
  };
}

function printMatchReport(report) {
  console.log(`Матч: ${report.matchId}`);
  console.log(`Длительность: ${report.duration}`);
  console.log(`Победитель: ${report.winner}`);
  console.log(`Radiant kills: ${report.radiant.kills}`);
  console.log(`Dire kills: ${report.dire.kills}`);

  if (report.topPlayer !== null) {
    console.log(
      `Лучший KDA: ${report.topPlayer.name} — ${report.topPlayer.kda}`,
    );
  }
}

console.assert(calculateKda(10, 2, 8) === 9, "KDA: обычный случай");
console.assert(calculateKda(5, 0, 5) === 10, "KDA: ноль смертей");
console.assert(formatDuration(2470) === "41:10", "Формат времени");
console.assert(validatePlayer(match.players[0]).length === 0, "Валидный игрок");

const invalidPlayer = {
  ...match.players[0],
  kills: -1,
};

console.assert(
  validatePlayer(invalidPlayer).length === 1,
  "Отрицательные kills должны быть отклонены",
);

try {
  const report = createMatchReport(match);
  printMatchReport(report);
} catch (error) {
  console.error("Не удалось создать отчёт");
  console.error(error);
}

