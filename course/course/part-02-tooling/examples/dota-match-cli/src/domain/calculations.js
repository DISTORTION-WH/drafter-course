export function roundToTwoDigits(value) {
  return Math.round(value * 100) / 100;
}

export function calculateKda(kills, deaths, assists) {
  const safeDeaths = deaths === 0 ? 1 : deaths;
  return (kills + assists) / safeDeaths;
}

export function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

