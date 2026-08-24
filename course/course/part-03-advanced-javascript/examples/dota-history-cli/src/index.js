import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeMatchHistory } from "./domain/history-analytics.js";
import { readJsonFile } from "./io/read-json.js";
import { printHistoryReport } from "./presentation/print-history-report.js";

const defaultDataPath = fileURLToPath(
  new URL("../data/matches.json", import.meta.url),
);

function selectInputPath(argument) {
  return argument
    ? resolve(process.cwd(), argument)
    : defaultDataPath;
}

async function main() {
  const inputPath = selectInputPath(process.argv[2]);
  const rawData = await readJsonFile(inputPath);
  const report = analyzeMatchHistory(rawData);

  printHistoryReport(report);
}

function printError(error) {
  console.error(`Ошибка: ${error.message}`);

  let currentCause = error.cause;

  while (currentCause instanceof Error) {
    console.error(`Причина: ${currentCause.message}`);
    currentCause = currentCause.cause;
  }
}

try {
  await main();
} catch (error) {
  printError(error);
  process.exitCode = 1;
}
