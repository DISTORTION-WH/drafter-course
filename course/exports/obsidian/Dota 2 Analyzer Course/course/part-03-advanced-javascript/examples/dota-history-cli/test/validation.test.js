import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { readJsonFile } from "../src/io/read-json.js";
import { validateMatchHistory } from "../src/domain/validation.js";

const dataPath = fileURLToPath(
  new URL("../data/matches.json", import.meta.url),
);
const validMatches = await readJsonFile(dataPath);

test("корректная история проходит validation", () => {
  assert.doesNotThrow(() => validateMatchHistory(validMatches));
});

test("корневое значение должно быть массивом", () => {
  assert.throws(
    () => validateMatchHistory({}),
    /История матчей должна быть массивом/,
  );
});

test("в матче должно быть ровно 10 игроков", () => {
  const matches = structuredClone(validMatches);
  matches[0].players.pop();

  assert.throws(
    () => validateMatchHistory(matches),
    /должен содержать ровно 10 игроков/,
  );
});

test("accountId не должен повторяться внутри матча", () => {
  const matches = structuredClone(validMatches);
  matches[0].players[1].accountId = matches[0].players[0].accountId;

  assert.throws(
    () => validateMatchHistory(matches),
    /содержит повторяющийся accountId/,
  );
});

test("kills не могут быть отрицательными", () => {
  const matches = structuredClone(validMatches);
  matches[1].players[7].kills = -1;

  assert.throws(
    () => validateMatchHistory(matches),
    /История матчей\[1\]\.players\[7\]\.kills должно быть неотрицательным числом/,
  );
});
