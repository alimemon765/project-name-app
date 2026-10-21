// Volume-balanced OpenAlex batches for every journal in the seed (papers_12mo from the live count in data-sources.md).
import { readFileSync } from "node:fs";
import { planBatches } from "../src/lib/ingest/backfill";

// About 5k works/month per batch: keeps each keyless month query well under OpenAlex's 10,000-result paging cap.
const MAX_WORKS_PER_YEAR_PER_BATCH = 60_000;
const MAX_SOURCES_PER_BATCH = 50;

interface SeedJournal { openalex_id: string; papers_12mo?: number | null }

export function allJournalBatches(only?: string[]): string[][] {
  const raw = JSON.parse(readFileSync(new URL("../data/journals.json", import.meta.url), "utf8")) as SeedJournal[] | { journals: SeedJournal[] };
  const seed = Array.isArray(raw) ? raw : raw.journals;
  const picked = only ? seed.filter((j) => only.includes(j.openalex_id)) : seed;
  return planBatches(picked.map((j) => ({ openalexId: j.openalex_id, perYear: Number(j.papers_12mo ?? 0) })),
    { maxPerYear: MAX_WORKS_PER_YEAR_PER_BATCH, maxSources: MAX_SOURCES_PER_BATCH });
}
