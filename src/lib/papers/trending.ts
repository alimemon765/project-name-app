// Trending = citations in the current and previous calendar year per month since publication.
const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.4375;

export function trendingScore(countsByYear: Record<string, number>, pubDate: string, now: Date): number {
  const year = now.getUTCFullYear();
  const recent = [year, year - 1].reduce((sum, y) => sum + Math.max(0, Number(countsByYear?.[String(y)]) || 0), 0);
  if (recent === 0) return 0;
  const published = Date.parse(`${pubDate}T00:00:00Z`);
  const months = Number.isFinite(published) ? Math.floor((now.getTime() - published) / MS_PER_MONTH) : 1;
  return recent / Math.max(1, months);
}
