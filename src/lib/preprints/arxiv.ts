// arXiv API (Atom). Terms: 1 request every 3 s, one connection; metadata is CC0; link to the abstract page.
import { XMLParser } from "fast-xml-parser";
import { normalizeDoi } from "@/lib/papers/doi";
import { clampText, MAX_ABSTRACT, MAX_TITLE, stripTags } from "@/lib/sanitize";
import { asArray, nodeText, toIsoDate, type PreprintRecord } from "./types";

const API = "https://export.arxiv.org/api/query";
export const ARXIV_DELAY_MS = 3000;
export const ARXIV_TIMEOUT_MS = 90_000;             // the API is slow on large sorted queries
// New-style 2610.28219 or old-style physics/0601001 (subject class optional), then an optional version.
const ARXIV_ID = /^https?:\/\/arxiv\.org\/abs\/(\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})(?:v\d+)?$/;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", removeNSPrefix: false, isArray: (n) => n === "entry" || n === "author" });

export function buildArxivUrl(q: { query: string; start: number; max: number }): string {
  const p = new URLSearchParams({ search_query: q.query, sortBy: "submittedDate", sortOrder: "descending", start: String(q.start), max_results: String(q.max) });
  return `${API}?${p.toString()}`;
}

export function arxivIdFromUrl(u: string): string | null {
  const m = ARXIV_ID.exec(u.trim());
  return m ? m[1] : null;
}

type Entry = Record<string, unknown>;

function mapEntry(e: Entry): PreprintRecord | null {
  const arxivId = arxivIdFromUrl(nodeText(e.id) ?? "");
  const title = clampText(stripTags(nodeText(e.title) ?? ""), MAX_TITLE);
  const pubDate = toIsoDate(nodeText(e.published));
  if (!arxivId || !title || !pubDate) return null;
  const summary = nodeText(e.summary);
  return {
    server: "arxiv", sourceId: arxivId, arxivId, doi: normalizeDoi(`10.48550/arXiv.${arxivId}`),
    publishedDoi: normalizeDoi(nodeText(e["arxiv:doi"])),
    title, abstract: summary ? clampText(stripTags(summary), MAX_ABSTRACT) : null,
    authors: asArray(e.author as Entry | Entry[]).map((a) => nodeText(a?.name)).filter((n): n is string => !!n),
    pubDate, url: `https://arxiv.org/abs/${arxivId}`, licence: null, isOa: true,
  };
}

export function parseArxivFeed(xml: string): { records: PreprintRecord[]; total: number } {
  // Parse errors (including fast-xml-parser's prototype-pollution guard) propagate: the run is marked failed, not "empty".
  const root = parser.parse(xml) as Entry;
  if (!root || typeof root !== "object" || !("feed" in root)) throw new Error("arXiv: response is not an Atom feed");
  const feed = (root.feed && typeof root.feed === "object" ? root.feed : {}) as Entry;
  const records = asArray(feed.entry as Entry | Entry[]).map(mapEntry).filter((r): r is PreprintRecord => r !== null);
  return { records, total: Number(nodeText(feed["opensearch:totalResults"]) ?? 0) || 0 };
}
