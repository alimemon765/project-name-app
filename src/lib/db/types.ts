// Kysely table types for the tables v1 code touches. Mirrors supabase/migrations/0001–0003.
import type { ColumnType, Generated } from "kysely";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export interface JournalsTable {
  id: Generated<string>;
  openalex_id: string | null;          // null for servers OpenAlex doesn't list (ESSOAr)
  name: string;
  abbreviation: string;
  slug: ColumnType<string, never, never>;   // generated from abbreviation (0003)
  publisher_group: string;
  publisher: string | null;
  issns: string[];
  issn_l: string | null;
  is_oa: boolean;
  is_preprint_server: boolean;
  ingest_source: string;
  ingest_config: unknown;
  enabled: boolean;
  verified: boolean;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface TopicsTable { id: number; slug: string; name: string; sort_order: number; default_on: boolean; created_at: Timestamp }

export interface KeywordsTable {
  id: Generated<string>;
  topic_id: number;
  term: string;
  weight: number;
  kind: "include" | "exclude";
  source: "seed" | "user_shared" | "admin";
  status: "active" | "pending" | "rejected";
  created_at: Timestamp;
}

export interface RegionsTable {
  id: number; slug: string; name: string; parent_id: number | null; level: number;
  lat: number | null; lon: number | null; aliases: string[]; sort_order: number;
}

export interface PapersTable {
  id: Generated<string>;
  doi: string | null;
  openalex_id: string | null;
  arxiv_id: string | null;
  title: string;
  abstract: string | null;
  abstract_source: string | null;
  authors_display: string;
  author_count: number;
  journal_id: string;
  pub_date: ColumnType<string, string, string>;
  first_seen_at: Timestamp;
  is_oa: boolean;
  oa_url: string | null;
  oa_status: string | null;
  licence: string | null;
  cited_by_count: number;
  citations_by_year: ColumnType<Record<string, number>, string, string>;
  trending_score: number;
  citations_refreshed_at: Timestamp | null;
  topic_ids: number[];
  topic_scores: ColumnType<Record<string, number>, string, string>;
  region_ids: number[];
  is_preprint: boolean;
  published_version_id: string | null;
  retraction_status: "none" | "retracted" | "corrected" | "expression_of_concern" | "withdrawn";
  classifier_version: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PaperLedgerTable {
  openalex_id: string; doi: string | null; journal_id: string; pub_date: string;
  first_seen_at: Timestamp; classified: boolean; classifier_version: number;
}

export interface PreprintLedgerTable {
  server: "arxiv" | "essoar" | "eartharxiv" | "ssrn"; source_id: string; doi: string | null; journal_id: string; pub_date: string;
  first_seen_at: Timestamp; classified: boolean; classifier_version: number;
}

export interface JobRunsTable {
  id: Generated<string>; job: string; run_key: string;
  status: "running" | "succeeded" | "failed" | "skipped"; attempt: number;
  started_at: Timestamp; finished_at: Timestamp | null; items_in: number; items_out: number;
  spend_usd: ColumnType<string, number | string, number | string>; error: string | null; meta: ColumnType<unknown, string, string>;
}

export interface Database {
  journals: JournalsTable;
  topics: TopicsTable;
  keywords: KeywordsTable;
  regions: RegionsTable;
  papers: PapersTable;
  paper_ledger: PaperLedgerTable;
  preprint_ledger: PreprintLedgerTable;
  job_runs: JobRunsTable;
}
