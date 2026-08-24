# Файл `read-json.test.js`

Исходный путь в учебном комплекте: `course/part-03-advanced-javascript/examples/dota-history-cli/test/read-json.test.js`.

```javascript
import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseJson, readJsonFile } from "../src/io/read-json.js";

test("parseJson разбирает корректный JSON", () => {
  const result = parseJson('{"matches":3}', "unit-test");

  assert.deepEqual(result, { matches: 3 });
});

test("parseJson добавляет источник к синтаксической ошибке", () => {
  assert.throws(
    () => parseJson('{"matches":}', "broken.json"),
    /Не удалось разобрать JSON из источника: broken\.json/,
  );
});

test("parseJson отклоняет нестроковый аргумент", () => {
  assert.throws(
    () => parseJson({ matches: 3 }),
    /parseJson ожидает строку/,
  );
});

test("readJsonFile асинхронно читает демонстрационную историю", async () => {
  const dataPath = fileURLToPath(
    new URL("../data/matches.json", import.meta.url),
  );

  const matches = await readJsonFile(dataPath);

  assert.equal(matches.length, 3);
  assert.equal(matches[0].players.length, 10);
});

```