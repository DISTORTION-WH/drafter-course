import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  analyzeMatchHistory,
  buildHeroStats,
  roundToTwoDigits,
} from "../src/domain/history-analytics.js";
import { readJsonFile } from "../src/io/read-json.js";

const dataPath = fileURLToPath(
  new URL("../data/matches.json", import.meta.url),
);
const matches = await readJsonFile(dataPath);

test("общий отчёт содержит ожидаемые агрегаты", () => {
  const report = analyzeMatchHistory(matches);

  assert.equal(report.totalMatches, 3);
  assert.equal(report.radiantWins, 1);
  assert.equal(report.direWins, 2);
  assert.equal(report.totalKills, 137);
  assert.equal(report.averageDurationSeconds, 2539);
  assert.equal(report.uniquePlayers, 11);
});

test("Rubick — самый популярный герой по правилам сортировки", () => {
  const report = analyzeMatchHistory(matches);

  assert.equal(report.mostPickedHero.hero, "Rubick");
  assert.equal(report.mostPickedHero.games, 3);
  assert.equal(report.mostPickedHero.wins, 2);
  assert.equal(report.mostPickedHero.winRate, 66.67);
  assert.equal(report.mostPickedHero.averageKills, 2);
  assert.equal(report.mostPickedHero.averageAssists, 20.33);
});

test("buildHeroStats возвращает одну строку на уникального героя", () => {
  const stats = buildHeroStats(matches);
  const uniqueHeroes = new Set(
    matches.flatMap((match) => match.players.map((player) => player.hero)),
  );

  assert.equal(stats.length, uniqueHeroes.size);
});

test("анализ не изменяет входные данные", () => {
  const input = structuredClone(matches);
  const before = structuredClone(input);

  analyzeMatchHistory(input);

  assert.deepEqual(input, before);
});

test("roundToTwoDigits округляет конечное значение до двух знаков", () => {
  assert.equal(roundToTwoDigits(2 / 3), 0.67);
  assert.equal(roundToTwoDigits(10.005), 10.01);
});
