import { equal, throws } from "node:assert/strict";
import { test } from "node:test";
import { parseMatchHistory } from "../src/domain/parse-match-history.js";
import { createRawHistory } from "./fixtures.js";

test("parser создаёт типизированные вложенные модели", () => {
  const matches = parseMatchHistory(createRawHistory());
  const firstMatch = matches[0];

  if (firstMatch === undefined) {
    throw new Error("Parser вернул пустую историю");
  }

  equal(firstMatch.radiantTeam.side, "radiant");
  equal(firstMatch.direTeam.side, "dire");
  equal(firstMatch.players[0]?.hero.name, "Rubick");
});

test("parser отклоняет корневое значение не-массив", () => {
  throws(
    () => parseMatchHistory({}),
    /История матчей должна быть массивом/,
  );
});

test("parser требует ровно 10 игроков", () => {
  const raw = createRawHistory();
  raw[0]?.players.pop();

  throws(
    () => parseMatchHistory(raw),
    /должен содержать ровно 10 игроков/,
  );
});

test("parser отклоняет повторяющийся accountId", () => {
  const raw = createRawHistory();
  const firstMatch = raw[0];

  if (firstMatch === undefined) {
    throw new Error("Fixture не содержит матч");
  }

  const firstPlayer = firstMatch.players[0];
  const secondPlayer = firstMatch.players[1];

  if (firstPlayer === undefined || secondPlayer === undefined) {
    throw new Error("Fixture не содержит нужных игроков");
  }

  secondPlayer.accountId = firstPlayer.accountId;

  throws(
    () => parseMatchHistory(raw),
    /содержит повторяющийся accountId/,
  );
});

test("parser отклоняет отрицательные kills с точным path", () => {
  const raw = createRawHistory();
  const firstPlayer = raw[0]?.players[0];

  if (firstPlayer === undefined) {
    throw new Error("Fixture не содержит игрока");
  }

  firstPlayer.kills = -1;

  throws(
    () => parseMatchHistory(raw),
    /История матчей\[0\]\.players\[0\]\.kills должно быть неотрицательным числом/,
  );
});
