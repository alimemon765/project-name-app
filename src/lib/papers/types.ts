// Client-safe paper shape for the feed, sheet and saved list (no server imports).
export interface FeedPaper {
  id: string;
  doi: string | null;
  title: string;
  abstract: string | null;
  authors: string;              // display string, e.g. "A, B, C and 4 others"
  authorCount: number;
  pubDate: string;              // YYYY-MM-DD
  firstSeenAt: string;          // ISO, drives "new since last visit"
  isOa: boolean;
  oaUrl: string | null;
  licence: string | null;
  citedByCount: number;
  topicIds: number[];
  regionNames: string[];
  isPreprint: boolean;
  retraction: "none" | "retracted" | "corrected" | "expression_of_concern" | "withdrawn";
  journal: { name: string; abbreviation: string; group: string };
}
