import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeMatchHistory } from "./domain/history-analytics.js";
import { parseMatchHistory } from "./domain/parse-match-history.js";
import { readJsonFile } from "./io/read-json.js";
import { printHistoryReport } from "./presentation/print-history-report.js";

const defaultDataPath = fileURLToPath(
  new URL("../../data/matches.json", import.meta.url),
);

function selectInputPath(argument: string | undefined): string {
  return argument === undefined
    ? defaultDataPath
    : resolve(process.cwd(), argument);
}

async function main(): Promise<void> {
  const inputPath = selectInputPath(process.argv[2]);
  const rawData = await readJsonFile(inputPath);
  const matches = parseMatchHistory(rawData);
  const report = analyzeMatchHistory(matches);

  printHistoryReport(report);
}

function printUnknownError(error: unknown): void {
  if (!(error instanceof Error)) {
    console.error(`Ошибка: ${String(error)}`);
    return;
  }

  console.error(`Ошибка: ${error.message}`);
  let currentCause: unknown = error.cause;

  while (currentCause instanceof Error) {
    console.error(`Причина: ${currentCause.message}`);
    currentCause = currentCause.cause;
  }

  if (currentCause !== undefined) {
    console.error(`Причина: ${String(currentCause)}`);
  }
}

try {
  await main();
} catch (error: unknown) {
  printUnknownError(error);
  process.exitCode = 1;
}
