# Файл `print-history-report.js`

Исходный путь в учебном комплекте: `course/part-03-advanced-javascript/examples/dota-history-cli/src/presentation/print-history-report.js`.

```javascript
function formatDuration(totalSeconds) {
  const roundedSeconds = Math.round(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = String(roundedSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function buildHistoryReportLines(report) {
  const topHeroes = report.heroStats.slice(0, 5);

  return [
    "История профессиональных матчей Dota 2",
    "======================================",
    `Матчей: ${report.totalMatches}`,
    `Побед Radiant: ${report.radiantWins}`,
    `Побед Dire: ${report.direWins}`,
    `Суммарные kills: ${report.totalKills}`,
    `Средняя длительность: ${formatDuration(report.averageDurationSeconds)}`,
    `Уникальных игроков: ${report.uniquePlayers}`,
    `Самый популярный герой: ${report.mostPickedHero.hero} — игр: ${report.mostPickedHero.games}`,
    "",
    "Топ-5 героев по числу игр",
    "Герой | Игр | Побед | Win rate | Средние kills",
    ...topHeroes.map((hero) => {
      return `${hero.hero} | ${hero.games} | ${hero.wins} | ${hero.winRate}% | ${hero.averageKills}`;
    }),
    "",
    "Матчи",
    ...report.matchSummaries.map((match) => {
      return `#${match.id} | ${formatDuration(match.durationSeconds)} | победитель: ${match.winnerTeam} | kills: ${match.totalKills}`;
    }),
  ];
}

export function printHistoryReport(report) {
  for (const line of buildHistoryReportLines(report)) {
    console.log(line);
  }
}

```