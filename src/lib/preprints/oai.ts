// EarthArXiv via OAI-PMH (oai_dc). OpenAlex covers only a few hundred EarthArXiv works, so read the server directly.
import { XMLParser } from "fast-xml-parser";
import { normalizeDoi } from "@/lib/papers/doi";
import { clampText, MAX_ABSTRACT, MAX_TITLE, stripTags } from "@/lib/sanitize";
import { asArray, nodeText, toIsoDate, type PreprintRecord } from "./types";

const ENDPOINT = "https://eartharxiv.org/api/oai/";
const EARTHARXIV_DOI = /^10\.31223\//;
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", isArray: (n) => ["record", "dc:creator", "dc:identifier", "dc:date", "dc:description"].includes(n) });

export function buildOaiUrl(q: { from: string; resumptionToken?: string }): string {
  const p = q.resumptionToken
    ? new URLSearchParams({ verb: "ListRecords", resumptionToken: q.resumptionToken })
    : new URLSearchParams({ verb: "ListRecords", metadataPrefix: "oai_dc", from: q.from });
  return `${ENDPOINT}?${p.toString()}`;
}

/** "Middleton. Beth a" (EarthArXiv's "Family. Given") -> "Beth a Middleton". */
const creatorName = (raw: string): string => {
  const i = raw.indexOf(". ");
  return i > 0 ? `${raw.slice(i + 2).trim()} ${raw.slice(0, i).trim()}` : raw.trim();
};

/** Keep the text after an "Abstract" heading when there is one; otherwise the whole description. */
function abstractOf(description: string | null): string | null {
  if (!description) return null;
  const m = /(?:^|\n)\s*abstract\s*:?\s*\n([\s\S]+)/i.exec(description);
  const text = clampText(stripTags(m ? m[1] : description), MAX_ABSTRACT);
  return text || null;
}

type Obj = Record<string, unknown>;

function mapRecord(rec: Obj): PreprintRecord | null {
  const header = rec.header as Obj | undefined;
  const dc = (rec.metadata as Obj | undefined)?.["oai_dc:dc"] as Obj | undefined;
  const sourceId = nodeText(header?.identifier);
  if (!dc || !sourceId || (header as Obj)["@_status"] === "deleted") return null;
  const title = clampText(stripTags(nodeText(dc["dc:title"]) ?? ""), MAX_TITLE);
  const pubDate = toIsoDate(asArray(dc["dc:date"])[0] ? nodeText(asArray(dc["dc:date"])[0]) : nodeText(header?.datestamp));
  const doi = asArray(dc["dc:identifier"]).map((v) => normalizeDoi(nodeText(v))).find((d): d is string => !!d && EARTHARXIV_DOI.test(d)) ?? null;
  if (!title || !pubDate || !doi) return null;
  return {
    server: "eartharxiv", sourceId, doi, arxivId: null, publishedDoi: null, title,
    abstract: abstractOf(nodeText(asArray(dc["dc:description"])[0])),
    authors: asArray(dc["dc:creator"]).map((c) => nodeText(c)).filter((n): n is string => !!n).map(creatorName),
    pubDate, url: `https://doi.org/${doi}`, licence: null, isOa: true,
  };
}

export function parseOaiPage(xml: string): { records: PreprintRecord[]; resumptionToken: string | null } {
  // Parse errors propagate so the run is marked failed instead of ending early as if the list were complete.
  const oai = (parser.parse(xml) as Obj)?.["OAI-PMH"] as Obj | undefined;
  if (!oai || typeof oai !== "object") throw new Error("EarthArXiv: response is not OAI-PMH");
  const error = oai.error as Obj | string | undefined;
  if (error !== undefined) {
    const code = typeof error === "object" ? String(error["@_code"] ?? "") : "";
    if (code === "noRecordsMatch") return { records: [], resumptionToken: null };
    throw new Error(`EarthArXiv: OAI-PMH error ${code || nodeText(error) || "unknown"}`);
  }
  const list = oai.ListRecords as Obj | undefined;
  if (!list || typeof list !== "object") return { records: [], resumptionToken: null };
  const records = asArray(list.record as Obj | Obj[]).map(mapRecord).filter((r): r is PreprintRecord => r !== null);
  return { records, resumptionToken: nodeText(list.resumptionToken) };
}
