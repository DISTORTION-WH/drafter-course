import { readFile } from "node:fs/promises";

export function parseJson(text: string, source = "JSON"): unknown {
  try {
    return JSON.parse(text);
  } catch (error: unknown) {
    throw new Error(`Не удалось разобрать JSON из источника: ${source}`, {
      cause: error,
    });
  }
}

export async function readJsonFile(filePath: string): Promise<unknown> {
  if (filePath.trim() === "") {
    throw new TypeError("Путь к JSON-файлу не должен быть пустым");
  }

  let text: string;

  try {
    text = await readFile(filePath, "utf8");
  } catch (error: unknown) {
    throw new Error(`Не удалось прочитать файл: ${filePath}`, {
      cause: error,
    });
  }

  return parseJson(text, filePath);
}
