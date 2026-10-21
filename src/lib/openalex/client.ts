// OpenAlex request helpers. Server/worker only: the key and the daily budget never reach the browser.
const BASE = "https://api.openalex.org/works";
const MAX_PER_PAGE = 100;
const MAX_SOURCES_PER_CALL = 50;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const WORK_FIELDS = ["id", "doi", "title", "publication_date", "primary_location", "authorships", "abstract_inverted_index",
  "open_access", "best_oa_location", "cited_by_count", "counts_by_year", "type"] as const;

// from_created_date / from_updated_date are paid "daily sync" filters (HTTP 429 "Plan upgrade required", checked 2026-10-21),
// so ingest windows by publication date. Cursor paging needs a key; keyless runs page by number (`page`).
export interface WorksQuery { sourceIds: string[]; fromPublicationDate: string; toPublicationDate?: string; cursor?: string; page?: number; perPage?: number; apiKey?: string; mailto?: string }

export function buildWorksUrl(opts: WorksQuery): string {
  if (!opts.sourceIds?.length) throw new Error("buildWorksUrl: at least one source id is required");
  if (opts.sourceIds.length > MAX_SOURCES_PER_CALL) throw new Error(`buildWorksUrl: at most ${MAX_SOURCES_PER_CALL} source ids per call`);
  for (const d of [opts.fromPublicationDate, opts.toPublicationDate]) {
    if (d !== undefined && !ISO_DATE.test(d)) throw new Error(`buildWorksUrl: publication dates must be YYYY-MM-DD, got "${d}"`);
  }
  const window = `from_publication_date:${opts.fromPublicationDate}${opts.toPublicationDate ? `,to_publication_date:${opts.toPublicationDate}` : ""}`;
  const params = new URLSearchParams({
    filter: `primary_location.source.id:${opts.sourceIds.join("|")},${window}`,
    per_page: String(Math.min(MAX_PER_PAGE, Math.max(1, opts.perPage ?? MAX_PER_PAGE))),
    select: WORK_FIELDS.join(","),
  });
  if (opts.page !== undefined) params.set("page", String(opts.page));
  else params.set("cursor", opts.cursor ?? "*");
  if (opts.apiKey) params.set("api_key", opts.apiKey);
  if (opts.mailto) params.set("mailto", opts.mailto);
  return `${BASE}?${params.toString()}`;
}

function num(v: string | null): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export interface Spend { costUsd: number | null; remainingUsd: number | null; limitUsd: number | null }

export function parseSpend(headers: Headers): Spend {
  return {
    costUsd: num(headers.get("x-ratelimit-cost-usd")),
    remainingUsd: num(headers.get("x-ratelimit-remaining-usd")),
    limitUsd: num(headers.get("x-ratelimit-limit-usd")),
  };
}

const MIN_RESERVE_SHARE = 0.05;

/** Stop non-critical work when today's spend (limit - remaining) reaches the cap, or under 5% of the budget is left. */
export function shouldStopForBudget(spend: Spend, capUsd: number): boolean {
  if (spend.remainingUsd === null || spend.limitUsd === null) return false;
  const spent = spend.limitUsd - spend.remainingUsd;
  return spent >= capUsd || spend.remainingUsd <= spend.limitUsd * MIN_RESERVE_SHARE;
}
