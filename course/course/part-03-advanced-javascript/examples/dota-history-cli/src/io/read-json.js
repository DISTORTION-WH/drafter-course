import { readFile } from "node:fs/promises";

export function parseJson(text, source = "JSON") {
  if (typeof text !== "string") {
    throw new TypeError("parseJson ожидает строку");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Не удалось разобрать JSON из источника: ${source}`, {
      cause: error,
    });
  }
}

export async function readJsonFile(filePath) {
  if (typeof filePath !== "string" || filePath.trim() === "") {
    throw new TypeError("Путь к JSON-файлу должен быть непустой строкой");
  }

  let text;

  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Не удалось прочитать файл: ${filePath}`, {
      cause: error,
    });
  }

  return parseJson(text, filePath);
}
