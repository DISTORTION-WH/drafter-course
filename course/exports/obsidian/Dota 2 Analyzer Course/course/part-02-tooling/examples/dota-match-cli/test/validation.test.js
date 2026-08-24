import test from "node:test";
import assert from "node:assert/strict";

import { match } from "../src/data/match.js";
import {
  validateMatch,
  validatePlayer,
} from "../src/domain/validation.js";

function createValidPlayer(overrides = {}) {
  return {
    name: "North",
    hero: "Juggernaut",
    team: "radiant",
    kills: 12,
    deaths: 2,
    assists: 9,
    ...overrides,
  };
}

test("validatePlayer принимает валидного игрока", () => {
  assert.deepEqual(validatePlayer(createValidPlayer()), []);
});

test("validatePlayer отклоняет отрицательные kills", () => {
  const errors = validatePlayer(createValidPlayer({ kills: -1 }));

  assert.equal(
    errors.includes("kills должен быть неотрицательным числом"),
    true,
  );
});

test("validatePlayer отклоняет отсутствующего героя", () => {
  const errors = validatePlayer(createValidPlayer({ hero: undefined }));

  assert.equal(
    errors.includes("hero должен быть непустой строкой"),
    true,
  );
});

test("validatePlayer отклоняет неизвестную команду", () => {
  const errors = validatePlayer(createValidPlayer({ team: "unknown" }));

  assert.equal(
    errors.includes("team должен быть radiant или dire"),
    true,
  );
});

test("validatePlayer обрабатывает null понятной ошибкой", () => {
  assert.deepEqual(validatePlayer(null), ["player должен быть объектом"]);
});

test("validateMatch принимает валидный fixture", () => {
  assert.deepEqual(validateMatch(match), []);
});

test("validateMatch требует десять игроков", () => {
  const invalidMatch = {
    ...match,
    players: match.players.slice(0, 9),
  };

  const errors = validateMatch(invalidMatch);

  assert.equal(
    errors.includes("players должен содержать десять игроков"),
    true,
  );
});

