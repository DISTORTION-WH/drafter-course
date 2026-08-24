import { deepEqual, equal, throws } from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseJson, readJsonFile } from "../src/io/read-json.js";

test("parseJson разбирает корректный JSON как unknown-значение", () => {
  const result = parseJson('{"matches":3}', "unit-test");

  deepEqual(result, { matches: 3 });
});

test("parseJson добавляет source к синтаксической ошибке", () => {
  throws(
    () => parseJson('{"matches":}', "broken.json"),
    /Не удалось разобрать JSON из источника: broken\.json/,
  );
});

test("readJsonFile читает демонстрационную историю", async () => {
  const dataPath = fileURLToPath(
    new URL("../../data/matches.json", import.meta.url),
  );
  const result = await readJsonFile(dataPath);

  if (!Array.isArray(result)) {
    throw new TypeError("Fixture должен быть массивом");
  }

  equal(result.length, 3);
});
