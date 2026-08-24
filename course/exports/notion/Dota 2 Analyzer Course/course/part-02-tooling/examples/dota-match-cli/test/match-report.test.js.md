# Файл `match-report.test.js`

Исходный путь в учебном комплекте: `course/part-02-tooling/examples/dota-match-cli/test/match-report.test.js`.

```javascript
import test from "node:test";
import assert from "node:assert/strict";

import { match } from "../src/data/match.js";
import {
  analyzePlayer,
  createMatchReport,
  findTopPlayer,
} from "../src/domain/match-report.js";

test("createMatchReport создаёт основной отчёт", () => {
  const report = createMatchReport(match);

  assert.equal(report.matchId, "8123456789");
  assert.equal(report.duration, "41:10");
  assert.equal(report.winner, "Aurora Owls");
  assert.equal(report.radiant.kills, 29);
  assert.equal(report.dire.kills, 19);
  assert.equal(report.radiant.averageKda, 6.28);
  assert.equal(report.dire.averageKda, 2.78);
  assert.equal(report.topPlayer.name, "North");
  assert.equal(report.topPlayer.kda, 10.5);
});

test("createMatchReport не изменяет исходный match", () => {
  const original = structuredClone(match);

  createMatchReport(match);

  assert.deepEqual(match, original);
  assert.equal(match.players[0].kda, undefined);
});

test("analyzePlayer сообщает о невалидном игроке", () => {
  const invalidPlayer = {
    ...match.players[0],
    kills: -1,
  };

  assert.throws(
    () => analyzePlayer(invalidPlayer),
    /kills должен быть неотрицательным числом/,
  );
});

test("createMatchReport отклоняет невалидный матч", () => {
  const invalidMatch = {
    ...match,
    players: match.players.map((player, index) => {
      return index === 0 ? { ...player, hero: "" } : { ...player };
    }),
  };

  assert.throws(
    () => createMatchReport(invalidMatch),
    /players\[0\]: hero должен быть непустой строкой/,
  );
});

test("findTopPlayer возвращает null для пустого массива", () => {
  assert.equal(findTopPlayer([]), null);
});


```