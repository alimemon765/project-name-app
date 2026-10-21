// Backfill planning: calendar-month publication windows and volume-balanced journal batches.
// Month windows keep each keyless query under OpenAlex's 10,000-result page-number cap and make the backfill resumable.

export interface MonthWindow { key: string; from: string; to: string }

const iso = (d: Date): string => d.toISOString().slice(0, 10);

/** `months` calendar months ending today, newest first. The current month ends today, not at month end. */
export function monthWindows(today: Date, months: number): MonthWindow[] {
  if (!Number.isInteger(months) || months < 1) throw new Error(`monthWindows: months must be a positive integer, got ${months}`);
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  return Array.from({ length: months }, (_, i) => {
    const start = new Date(Date.UTC(y, m - i, 1));
    const end = i === 0 ? today : new Date(Date.UTC(y, m - i + 1, 0));
    return { key: iso(start).slice(0, 7), from: iso(start), to: iso(end) };
  });
}

export interface JournalVolume { openalexId: string; perYear: number }
export interface BatchLimits { maxPerYear: number; maxSources: number }

/** First-fit decreasing: large journals first, each batch stays under the yearly volume cap and the source-id cap. */
export function planBatches(journals: readonly JournalVolume[], limits: BatchLimits): string[][] {
  const sorted = [...journals]
    .map((j) => ({ id: j.openalexId, vol: Number.isFinite(j.perYear) && j.perYear > 0 ? j.perYear : 0 }))
    .sort((a, b) => b.vol - a.vol);
  const batches: { ids: string[]; vol: number }[] = [];
  for (const j of sorted) {
    const fit = batches.find((b) => b.ids.length < limits.maxSources && b.vol + j.vol <= limits.maxPerYear);
    if (fit) {
      fit.ids = [...fit.ids, j.id];
      fit.vol += j.vol;
    } else {
      batches.push({ ids: [j.id], vol: j.vol });
    }
  }
  return batches.map((b) => b.ids);
}
