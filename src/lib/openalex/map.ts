// Map one OpenAlex work to our paper row. Pure: never mutates input, never throws on missing fields.
import { normalizeDoi } from "@/lib/papers/doi";
import { rebuildAbstract } from "@/lib/papers/abstract";
import { trendingScore } from "@/lib/papers/trending";
import { formatAuthors } from "@/lib/format";
import { clampText, httpUrl, MAX_ABSTRACT, MAX_TITLE, stripTags } from "@/lib/sanitize";

export interface PaperRow {
  openalexId: string | null; doi: string | null; title: string; abstract: string | null;
  authorsDisplay: string; authorCount: number; authors: string[]; journalId: string; pubDate: string | null;
  isOa: boolean; oaUrl: string | null; licence: string | null; citedByCount: number;
  citationsByYear: Record<string, number>; trendingScore: number; isPreprint: boolean;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

const clipOrNull = (s: string | null): string | null => (s === null ? null : clampText(s, MAX_ABSTRACT));

export function mapWork(work: unknown, journalId: string, now: Date): PaperRow | null {
  if (!isObj(work)) return null;
  const title = str(work.title) ? clampText(stripTags(work.title as string), MAX_TITLE) : "";
  if (!title) return null;
  const authors = (Array.isArray(work.authorships) ? work.authorships : [])
    .map((a) => (isObj(a) && isObj(a.author) ? str(a.author.display_name) : null))
    .filter((n): n is string => !!n);
  const citationsByYear: Record<string, number> = {};
  for (const c of Array.isArray(work.counts_by_year) ? work.counts_by_year : []) {
    if (isObj(c) && typeof c.year === "number" && typeof c.cited_by_count === "number") citationsByYear[String(c.year)] = c.cited_by_count;
  }
  const oa = isObj(work.open_access) ? work.open_access : {};
  const best = isObj(work.best_oa_location) ? work.best_oa_location : {};
  const pubDate = str(work.publication_date);
  const id = str(work.id);
  return {
    openalexId: id ? id.replace(/^https?:\/\/openalex\.org\//, "") : null,
    doi: normalizeDoi(str(work.doi)),
    title,
    abstract: clipOrNull(rebuildAbstract(isObj(work.abstract_inverted_index) ? (work.abstract_inverted_index as Record<string, number[]>) : null)),
    authorsDisplay: formatAuthors(authors),
    authorCount: authors.length,
    authors,
    journalId,
    pubDate,
    isOa: oa.is_oa === true,
    oaUrl: httpUrl(oa.oa_url),
    licence: str(best.license),
    citedByCount: typeof work.cited_by_count === "number" ? work.cited_by_count : 0,
    citationsByYear,
    trendingScore: pubDate ? trendingScore(citationsByYear, pubDate, now) : 0,
    isPreprint: work.type === "preprint",
  };
}
