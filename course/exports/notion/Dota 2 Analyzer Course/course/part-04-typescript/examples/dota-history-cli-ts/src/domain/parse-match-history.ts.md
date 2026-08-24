# Файл `parse-match-history.ts`

Исходный путь в учебном комплекте: `course/part-04-typescript/examples/dota-history-cli-ts/src/domain/parse-match-history.ts`.

```typescript
import type { Match, Player, TeamSide } from "./models.js";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertNonEmptyString(
  value: unknown,
  path: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${path} должен быть непустой строкой`);
  }
}

function assertNonNegativeNumber(
  value: unknown,
  path: string,
): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${path} должно быть неотрицательным числом`);
  }
}

function parseTeamSide(value: unknown, path: string): TeamSide {
  if (value !== "radiant" && value !== "dire") {
    throw new TypeError(`${path} должен быть radiant или dire`);
  }

  return value;
}

function parsePlayer(value: unknown, path: string): Player {
  if (!isRecord(value)) {
    throw new TypeError(`${path} должен быть объектом`);
  }

  const accountId = value.accountId;
  const name = value.name;
  const heroName = value.hero;
  const kills = value.kills;
  const deaths = value.deaths;
  const assists = value.assists;

  assertNonEmptyString(accountId, `${path}.accountId`);
  assertNonEmptyString(name, `${path}.name`);
  assertNonEmptyString(heroName, `${path}.hero`);
  assertNonNegativeNumber(kills, `${path}.kills`);
  assertNonNegativeNumber(deaths, `${path}.deaths`);
  assertNonNegativeNumber(assists, `${path}.assists`);

  return {
    accountId,
    name,
    hero: { name: heroName },
    team: parseTeamSide(value.team, `${path}.team`),
    kills,
    deaths,
    assists,
  };
}

function parseMatch(value: unknown, path: string): Match {
  if (!isRecord(value)) {
    throw new TypeError(`${path} должен быть объектом`);
  }

  const id = value.id;
  const durationSeconds = value.durationSeconds;
  const radiantTeamName = value.radiantTeam;
  const direTeamName = value.direTeam;

  assertNonEmptyString(id, `${path}.id`);
  assertNonNegativeNumber(durationSeconds, `${path}.durationSeconds`);
  assertNonEmptyString(radiantTeamName, `${path}.radiantTeam`);
  assertNonEmptyString(direTeamName, `${path}.direTeam`);

  if (value.status !== "finished") {
    throw new TypeError(`${path}.status должен быть finished`);
  }

  if (durationSeconds === 0) {
    throw new TypeError(`${path}.durationSeconds должно быть больше нуля`);
  }

  if (typeof value.radiantWin !== "boolean") {
    throw new TypeError(`${path}.radiantWin должен быть boolean`);
  }

  if (!Array.isArray(value.players)) {
    throw new TypeError(`${path}.players должен быть массивом`);
  }

  if (value.players.length !== 10) {
    throw new TypeError(`${path}.players должен содержать ровно 10 игроков`);
  }

  const players = value.players.map((player, index) => {
    return parsePlayer(player, `${path}.players[${index}]`);
  });

  const radiantCount = players.filter(
    (player) => player.team === "radiant",
  ).length;
  const direCount = players.filter(
    (player) => player.team === "dire",
  ).length;

  if (radiantCount !== 5 || direCount !== 5) {
    throw new TypeError(
      `${path} должен содержать 5 игроков Radiant и 5 игроков Dire`,
    );
  }

  const accountIds = players.map((player) => player.accountId);

  if (new Set(accountIds).size !== accountIds.length) {
    throw new TypeError(`${path} содержит повторяющийся accountId`);
  }

  return {
    id,
    status: value.status,
    durationSeconds,
    radiantWin: value.radiantWin,
    radiantTeam: {
      name: radiantTeamName,
      side: "radiant",
    },
    direTeam: {
      name: direTeamName,
      side: "dire",
    },
    players,
  };
}

export function parseMatchHistory(value: unknown): readonly Match[] {
  if (!Array.isArray(value)) {
    throw new TypeError("История матчей должна быть массивом");
  }

  if (value.length === 0) {
    throw new TypeError("История матчей не должна быть пустой");
  }

  return value.map((match, index) => {
    return parseMatch(match, `История матчей[${index}]`);
  });
}

```