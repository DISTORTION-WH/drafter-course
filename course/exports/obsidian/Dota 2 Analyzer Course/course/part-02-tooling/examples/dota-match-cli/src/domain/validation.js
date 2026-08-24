export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isNonNegativeNumber(value) {
  return typeof value === "number"
    && Number.isFinite(value)
    && value >= 0;
}

export function validatePlayer(player) {
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

export function validateMatch(match) {
  if (typeof match !== "object" || match === null) {
    return ["match должен быть объектом"];
  }

  const errors = [];

  if (!isNonEmptyString(match.id)) {
    errors.push("id должен быть непустой строкой");
  }

  if (match.status !== "finished") {
    errors.push("status должен быть finished");
  }

  if (!isNonNegativeNumber(match.durationSeconds)
    || match.durationSeconds === 0) {
    errors.push("durationSeconds должен быть числом больше нуля");
  }

  if (typeof match.radiantWin !== "boolean") {
    errors.push("radiantWin должен быть boolean");
  }

  if (!isNonEmptyString(match.radiantTeam)) {
    errors.push("radiantTeam должен быть непустой строкой");
  }

  if (!isNonEmptyString(match.direTeam)) {
    errors.push("direTeam должен быть непустой строкой");
  }

  if (!Array.isArray(match.players)) {
    errors.push("players должен быть массивом");
    return errors;
  }

  if (match.players.length !== 10) {
    errors.push("players должен содержать десять игроков");
  }

  const radiantCount = match.players.filter(
    (player) => player?.team === "radiant",
  ).length;
  const direCount = match.players.filter(
    (player) => player?.team === "dire",
  ).length;

  if (radiantCount !== 5) {
    errors.push("в матче должно быть пять игроков Radiant");
  }

  if (direCount !== 5) {
    errors.push("в матче должно быть пять игроков Dire");
  }

  match.players.forEach((player, index) => {
    const playerErrors = validatePlayer(player);

    for (const error of playerErrors) {
      errors.push(`players[${index}]: ${error}`);
    }
  });

  return errors;
}

