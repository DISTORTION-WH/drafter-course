function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

export function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new TypeError(message);
  }
}

export function validatePlayer(player, context = "Игрок") {
  assertCondition(isRecord(player), `${context} должен быть объектом`);
  assertCondition(
    isNonEmptyString(player.accountId),
    `${context}.accountId должен быть непустой строкой`,
  );
  assertCondition(
    isNonEmptyString(player.name),
    `${context}.name должен быть непустой строкой`,
  );
  assertCondition(
    isNonEmptyString(player.hero),
    `${context}.hero должен быть непустой строкой`,
  );
  assertCondition(
    player.team === "radiant" || player.team === "dire",
    `${context}.team должен быть radiant или dire`,
  );

  for (const field of ["kills", "deaths", "assists"]) {
    assertCondition(
      isNonNegativeNumber(player[field]),
      `${context}.${field} должно быть неотрицательным числом`,
    );
  }
}

export function validateMatch(match, context = "Матч") {
  assertCondition(isRecord(match), `${context} должен быть объектом`);
  assertCondition(
    isNonEmptyString(match.id),
    `${context}.id должен быть непустой строкой`,
  );
  assertCondition(
    match.status === "finished",
    `${context}.status должен быть finished`,
  );
  assertCondition(
    isNonNegativeNumber(match.durationSeconds) && match.durationSeconds > 0,
    `${context}.durationSeconds должно быть положительным числом`,
  );
  assertCondition(
    typeof match.radiantWin === "boolean",
    `${context}.radiantWin должен быть boolean`,
  );
  assertCondition(
    isNonEmptyString(match.radiantTeam),
    `${context}.radiantTeam должен быть непустой строкой`,
  );
  assertCondition(
    isNonEmptyString(match.direTeam),
    `${context}.direTeam должен быть непустой строкой`,
  );
  assertCondition(
    Array.isArray(match.players),
    `${context}.players должен быть массивом`,
  );
  assertCondition(
    match.players.length === 10,
    `${context}.players должен содержать ровно 10 игроков`,
  );

  match.players.forEach((player, index) => {
    validatePlayer(player, `${context}.players[${index}]`);
  });

  const radiantCount = match.players.filter(
    (player) => player.team === "radiant",
  ).length;
  const direCount = match.players.filter(
    (player) => player.team === "dire",
  ).length;

  assertCondition(
    radiantCount === 5 && direCount === 5,
    `${context} должен содержать 5 игроков Radiant и 5 игроков Dire`,
  );

  const accountIds = match.players.map((player) => player.accountId);
  const uniqueAccountIds = new Set(accountIds);

  assertCondition(
    uniqueAccountIds.size === accountIds.length,
    `${context} содержит повторяющийся accountId`,
  );
}

export function validateMatchHistory(matches, context = "История матчей") {
  assertCondition(Array.isArray(matches), `${context} должна быть массивом`);
  assertCondition(matches.length > 0, `${context} не должна быть пустой`);

  matches.forEach((match, index) => {
    validateMatch(match, `${context}[${index}]`);
  });
}
