// One preprint from any server, normalised before gating and storage.
export type PreprintServer = "arxiv" | "essoar" | "eartharxiv" | "ssrn";

export interface PreprintRecord {
  server: PreprintServer;
  sourceId: string;                 // the server's own id: arXiv id, DOI, or OAI identifier
  doi: string | null;               // normalised (lower case, no resolver prefix)
  arxivId: string | null;
  publishedDoi: string | null;      // the journal version's DOI, when the server reports one
  title: string;
  abstract: string | null;
  authors: string[];
  pubDate: string;                  // YYYY-MM-DD
  url: string | null;
  licence: string | null;
  isOa: boolean;
}

export const toIsoDate = (v: unknown): string | null => {
  const m = typeof v === "string" ? /^(\d{4}-\d{2}-\d{2})/.exec(v.trim()) : null;
  return m ? m[1] : null;
};

export const asArray = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** The text of an XML node parsed by fast-xml-parser (plain string, or an object with "#text"). */
export function nodeText(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  if (v && typeof v === "object" && "#text" in v) return nodeText((v as Record<string, unknown>)["#text"]);
  return null;
}
