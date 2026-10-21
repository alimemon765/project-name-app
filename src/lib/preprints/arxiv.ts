// arXiv API (Atom). Terms: 1 request every 3 s, one connection; metadata is CC0; link to the abstract page.
import { XMLParser } from "fast-xml-parser";
import { normalizeDoi } from "@/lib/papers/doi";
import { stripTags } from "@/lib/sanitize";
import { asArray, nodeText, toIsoDate, type PreprintRecord } from "./types";

const API = "https://export.arxiv.org/api/query";
export const ARXIV_DELAY_MS = 3000;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", removeNSPrefix: false, isArray: (n) => n === "entry" || n === "author" });

export function buildArxivUrl(q: { query: string; start: number; max: number }): string {
  const p = new URLSearchParams({ search_query: q.query, sortBy: "submittedDate", sortOrder: "descending", start: String(q.start), max_results: String(q.max) });
  return `${API}?${p.toString()}`;
}

export function arxivIdFromUrl(u: string): string | null {
  const m = /arxiv\.org\/abs\/(.+?)(?:v\d+)?$/.exec(u.trim());
  return m ? m[1] : null;
}

type Entry = Record<string, unknown>;

function mapEntry(e: Entry): PreprintRecord | null {
  const arxivId = arxivIdFromUrl(nodeText(e.id) ?? "");
  const title = stripTags(nodeText(e.title) ?? "");
  const pubDate = toIsoDate(nodeText(e.published));
  if (!arxivId || !title || !pubDate) return null;
  const summary = nodeText(e.summary);
  return {
    server: "arxiv", sourceId: arxivId, arxivId, doi: normalizeDoi(`10.48550/arXiv.${arxivId}`),
    publishedDoi: normalizeDoi(nodeText(e["arxiv:doi"])),
    title, abstract: summary ? stripTags(summary) : null,
    authors: asArray(e.author as Entry | Entry[]).map((a) => nodeText(a?.name)).filter((n): n is string => !!n),
    pubDate, url: `https://arxiv.org/abs/${arxivId}`, licence: null, isOa: true,
  };
}

export function parseArxivFeed(xml: string): { records: PreprintRecord[]; total: number } {
  let feed: Entry | undefined;
  try { feed = (parser.parse(xml) as Entry)?.feed as Entry | undefined; } catch { feed = undefined; }
  if (!feed || typeof feed !== "object") return { records: [], total: 0 };
  const records = asArray(feed.entry as Entry | Entry[]).map(mapEntry).filter((r): r is PreprintRecord => r !== null);
  return { records, total: Number(nodeText(feed["opensearch:totalResults"]) ?? 0) || 0 };
}
