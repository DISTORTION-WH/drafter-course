import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateKda,
  formatDuration,
  roundToTwoDigits,
} from "../src/domain/calculations.js";

test("calculateKda рассчитывает обычный случай", () => {
  assert.equal(calculateKda(10, 2, 8), 9);
});

test("calculateKda использует единицу как делитель при нуле смертей", () => {
  const actual = calculateKda(5, 0, 5);

  assert.equal(actual, 10);
  assert.equal(Number.isFinite(actual), true);
});

test("formatDuration форматирует минуты и секунды", () => {
  assert.equal(formatDuration(0), "0:00");
  assert.equal(formatDuration(7), "0:07");
  assert.equal(formatDuration(60), "1:00");
  assert.equal(formatDuration(2470), "41:10");
});

test("roundToTwoDigits округляет до двух знаков", () => {
  assert.equal(roundToTwoDigits(6.2766), 6.28);
});

