// Feed row selection and mapping, shared by the cached app queries and the Explore queries. No Next.js imports.
import { sql, type Kysely } from "kysely";
import type { Database } from "@/lib/db/types";
import type { FeedPaper } from "./types";

export function toFeedPaper(r: Record<string, unknown>): FeedPaper {
  return {
    id: String(r.id), doi: (r.doi as string) ?? null, title: String(r.title), abstract: (r.abstract as string) ?? null,
    authors: String(r.authors_display ?? ""), authorCount: Number(r.author_count ?? 0),
    pubDate: String(r.pub_date), firstSeenAt: new Date(r.first_seen_at as string).toISOString(),
    isOa: Boolean(r.is_oa), oaUrl: (r.oa_url as string) ?? null, licence: (r.licence as string) ?? null,
    citedByCount: Number(r.cited_by_count ?? 0), topicIds: (r.topic_ids as number[]) ?? [], regionNames: (r.region_names as string[]) ?? [],
    isPreprint: Boolean(r.is_preprint), retraction: (r.retraction_status as FeedPaper["retraction"]) ?? "none",
    journal: { name: String(r.journal_name), abbreviation: String(r.journal_abbr), group: String(r.journal_group) },
  };
}

/** papers p ⋈ journals j with every column a card or the sheet needs. Published-version duplicates excluded. */
export const selectFeedRows = (db: Kysely<Database>) => db
  .selectFrom("papers as p")
  .innerJoin("journals as j", "j.id", "p.journal_id")
  .select(["p.id", "p.doi", "p.title", "p.abstract", "p.authors_display", "p.author_count", "p.first_seen_at", "p.is_oa", "p.oa_url", "p.licence",
    "p.cited_by_count", "p.topic_ids", "p.is_preprint", "p.retraction_status",
    sql<string>`to_char(p.pub_date, 'YYYY-MM-DD')`.as("pub_date"),
    sql<string[]>`coalesce((select array_agg(r.name order by r.level desc, r.id) from regions r where r.id = any(p.region_ids) and r.level > 0), '{}')`.as("region_names"),
    "j.name as journal_name", "j.abbreviation as journal_abbr", "j.publisher_group as journal_group"])
  .where("p.published_version_id", "is", null);
