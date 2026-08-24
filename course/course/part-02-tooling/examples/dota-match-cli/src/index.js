import { match } from "./data/match.js";
import { createMatchReport } from "./domain/match-report.js";
import { printMatchReport } from "./presentation/print-report.js";

try {
  const report = createMatchReport(match);
  printMatchReport(report);
} catch (error) {
  console.error("Не удалось создать отчёт");
  console.error(error);
  process.exitCode = 1;
}

