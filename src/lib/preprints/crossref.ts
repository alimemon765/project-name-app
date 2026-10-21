// Preprints registered with Crossref, read by DOI prefix. Polite pool: mailto + identifying User-Agent, ≤ 3 list requests/s.
// - ESSOAr: prefix 10.22541 (shared with Authorea; keep essoar DOIs), dated by `posted`.
// - SSRN: prefix 10.2139, dated by `created` (DOI registration). Its `published` and OpenAlex's date are year-only.
import { normalizeDoi } from "@/lib/papers/doi";
import { clampText, MAX_ABSTRACT, MAX_TITLE, stripJats, stripTags } from "@/lib/sanitize";
import type { PreprintRecord, PreprintServer } from "./types";

interface CrossrefSource {
  server: PreprintServer;
  prefix: string;
  doiPattern: RegExp;
  dateField: "posted" | "created";
  typeFilter?: string;
}

const ESSOAR: CrossrefSource = { server: "essoar", prefix: "10.22541", doiPattern: /^10\.22541\/essoar\./, dateField: "posted", typeFilter: "posted-content" };
const SSRN: CrossrefSource = { server: "ssrn", prefix: "10.2139", doiPattern: /^10\.2139\/ssrn\./, dateField: "created" };

interface PageQuery { from: string; to?: string; cursor: string; mailto?: string }

function buildUrl(src: CrossrefSource, q: PageQuery): string {
  const window = src.dateField === "posted"
    ? `from-posted-date:${q.from}${q.to ? `,until-posted-date:${q.to}` : ""}`
    : `from-created-date:${q.from}${q.to ? `,until-created-date:${q.to}` : ""}`;
  const filter = src.typeFilter ? `type:${src.typeFilter},${window}` : window;
  const p = new URLSearchParams({ filter, rows: "1000", cursor: q.cursor, select: `DOI,title,abstract,author,${src.dateField},URL,license,relation` });
  if (q.mailto) p.set("mailto", q.mailto);
  return `https://api.crossref.org/prefixes/${src.prefix}/works?${p.toString()}`;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

function dateOf(v: unknown): string | null {
  if (isObj(v) && typeof v["date-time"] === "string") return v["date-time"].slice(0, 10);
  const parts = isObj(v) && Array.isArray(v["date-parts"]) && Array.isArray(v["date-parts"][0]) ? (v["date-parts"][0] as unknown[]) : [];
  const [y, m = 1, d = 1] = parts.map(Number);
  if (!Number.isInteger(y) || y < 1900) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function licenceSlug(v: unknown): string | null {
  const url = Array.isArray(v) && isObj(v[0]) ? String(v[0].URL ?? "") : "";
  const m = /creativecommons\.org\/(?:licenses|publicdomain)\/([a-z-]+)/i.exec(url);
  return m ? (m[1].toLowerCase() === "zero" ? "cc0" : `cc-${m[1].toLowerCase()}`) : null;
}

function mapItem(src: CrossrefSource, i: Obj): PreprintRecord | null {
  const doi = normalizeDoi(typeof i.DOI === "string" ? i.DOI : null);
  const title = clampText(stripTags(Array.isArray(i.title) ? String(i.title[0] ?? "") : ""), MAX_TITLE);
  const pubDate = dateOf(i[src.dateField]);
  if (!doi || !src.doiPattern.test(doi) || !title || !pubDate) return null;
  const rel = isObj(i.relation) && Array.isArray(i.relation["is-preprint-of"]) ? (i.relation["is-preprint-of"] as Obj[]) : [];
  const published = rel.find((r) => r["id-type"] === "doi");
  const abstract = typeof i.abstract === "string" ? clampText(stripJats(i.abstract), MAX_ABSTRACT) : "";
  return {
    server: src.server, sourceId: doi, doi, arxivId: null, publishedDoi: normalizeDoi(published ? String(published.id) : null),
    title, abstract: abstract || null,
    authors: (Array.isArray(i.author) ? i.author : []).filter(isObj)
      .map((a) => [a.given, a.family].filter((x) => typeof x === "string" && x.trim()).join(" ") || (typeof a.name === "string" ? a.name : ""))
      .filter(Boolean),
    // Links always go through doi.org, never a registrant-supplied host.
    pubDate, url: `https://doi.org/${doi}`, licence: licenceSlug(i.license), isOa: true,
  };
}

function parsePage(src: CrossrefSource, body: unknown): { records: PreprintRecord[]; nextCursor: string | null } {
  const msg = isObj(body) && body.status === "ok" && isObj(body.message) ? body.message : null;
  if (!msg || !Array.isArray(msg.items)) throw new Error(`Crossref: unexpected response (${isObj(body) ? String(body.status) : typeof body})`);
  const records = msg.items.filter(isObj).map((i) => mapItem(src, i)).filter((r): r is PreprintRecord => r !== null);
  const next = typeof msg["next-cursor"] === "string" && msg.items.length > 0 ? msg["next-cursor"] : null;
  return { records, nextCursor: next };
}

export const buildEssoarUrl = (q: PageQuery) => buildUrl(ESSOAR, q);
export const parseEssoarPage = (body: unknown) => parsePage(ESSOAR, body);
export const buildSsrnUrl = (q: PageQuery) => buildUrl(SSRN, q);
export const parseSsrnPage = (body: unknown) => parsePage(SSRN, body);
