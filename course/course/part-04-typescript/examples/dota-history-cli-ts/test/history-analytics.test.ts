import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  analyzeMatchHistory,
  roundToTwoDigits,
} from "../src/domain/history-analytics.js";
import { parseMatchHistory } from "../src/domain/parse-match-history.js";
import { readJsonFile } from "../src/io/read-json.js";

const dataPath = fileURLToPath(
  new URL("../../data/matches.json", import.meta.url),
);
const rawData = await readJsonFile(dataPath);
const matches = parseMatchHistory(rawData);

test("отчёт содержит ожидаемые агрегаты", () => {
  const report = analyzeMatchHistory(matches);

  equal(report.totalMatches, 3);
  equal(report.radiantWins, 1);
  equal(report.direWins, 2);
  equal(report.totalKills, 137);
  equal(report.averageDurationSeconds, 2539);
  equal(report.uniquePlayers, 11);
});

test("Rubick лидирует по заданным правилам сортировки", () => {
  const report = analyzeMatchHistory(matches);

  equal(report.mostPickedHero.hero, "Rubick");
  equal(report.mostPickedHero.games, 3);
  equal(report.mostPickedHero.wins, 2);
  equal(report.mostPickedHero.winRate, 66.67);
  equal(report.mostPickedHero.averageAssists, 20.33);
});

test("analytics не изменяет входные модели", () => {
  const input = structuredClone(matches);
  const before = structuredClone(input);

  analyzeMatchHistory(input);

  deepEqual(input, before);
});

test("roundToTwoDigits округляет только конечное значение", () => {
  equal(roundToTwoDigits(2 / 3), 0.67);
  equal(roundToTwoDigits(10.005), 10.01);
});
