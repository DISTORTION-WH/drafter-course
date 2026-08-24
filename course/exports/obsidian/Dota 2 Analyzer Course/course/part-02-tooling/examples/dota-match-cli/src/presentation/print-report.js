export function printMatchReport(report) {
  console.log(`Матч: ${report.matchId}`);
  console.log(`Длительность: ${report.duration}`);
  console.log(`Победитель: ${report.winner}`);
  console.log(`Radiant kills: ${report.radiant.kills}`);
  console.log(`Dire kills: ${report.dire.kills}`);

  if (report.topPlayer !== null) {
    console.log(
      `Лучший KDA: ${report.topPlayer.name} — ${report.topPlayer.kda}`,
    );
  }
}

