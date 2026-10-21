// Page iterators per preprint server. Each yields normalised records, newest windows first, and respects the server's rate rules.
import { fetchWithRetry, readJson, readText, type Sleep } from "@/lib/ingest/shared";
import { ARXIV_DELAY_MS, ARXIV_TIMEOUT_MS, buildArxivUrl, parseArxivFeed } from "./arxiv";
import { buildEssoarUrl, buildSsrnUrl, parseEssoarPage, parseSsrnPage } from "./crossref";
import { buildOaiUrl, parseOaiPage } from "./oai";
import type { PreprintRecord, PreprintServer } from "./types";

export interface SourceContext {
  fromDate: string; toDate?: string; fetchFn: typeof fetch; sleep: Sleep; mailto?: string;
}

const ARXIV_PAGE = 100;
const CROSSREF_DELAY_MS = 400;               // polite pool: ≤ 3 list requests/s
const OAI_DELAY_MS = 1000;
const MAX_PAGES = 500;                       // hard stop against a server that never ends its paging
const MAX_XML_BYTES = 25 * 1024 * 1024;
const MAX_CROSSREF_BYTES = 50 * 1024 * 1024; // rows=1000 with abstracts

// Primary ocean/atmosphere and geophysics, plus cross-lists from ML, fluids and statistics that mention our subject.
export const ARXIV_QUERIES = [
  "cat:physics.ao-ph OR cat:physics.geo-ph",
  '(cat:cs.LG OR cat:cs.CV OR cat:physics.flu-dyn OR cat:stat.AP OR cat:eess.IV) AND (abs:flood OR abs:"storm surge" OR abs:"sea level" OR abs:subsidence OR abs:coastal OR abs:inundation)',
];

const inWindow = (r: PreprintRecord, c: SourceContext) => r.pubDate >= c.fromDate && (!c.toDate || r.pubDate <= c.toDate);

async function* arxiv(c: SourceContext): AsyncGenerator<PreprintRecord[]> {
  let first = true;
  for (const query of ARXIV_QUERIES) {
    for (let start = 0, page = 0; page < MAX_PAGES; start += ARXIV_PAGE, page++) {
      if (!first) await c.sleep(ARXIV_DELAY_MS);
      first = false;
      const res = await fetchWithRetry(buildArxivUrl({ query, start, max: ARXIV_PAGE }), c.fetchFn, c.sleep, "arXiv", { timeoutMs: ARXIV_TIMEOUT_MS });
      const { records, total } = parseArxivFeed(await readText(res, MAX_XML_BYTES));
      yield records.filter((r) => inWindow(r, c));
      const oldest = records.at(-1)?.pubDate;
      if (records.length === 0 || !oldest || oldest < c.fromDate || start + ARXIV_PAGE >= total) break;
    }
  }
}

function crossrefPrefix(build: typeof buildEssoarUrl, parse: typeof parseEssoarPage) {
  return async function* (c: SourceContext): AsyncGenerator<PreprintRecord[]> {
    let cursor = "*";
    for (let page = 0; page < MAX_PAGES; page++) {
      if (page > 0) await c.sleep(CROSSREF_DELAY_MS);
      const res = await fetchWithRetry(build({ from: c.fromDate, to: c.toDate, cursor, mailto: c.mailto }), c.fetchFn, c.sleep, "Crossref");
      const body = await readJson(res, MAX_CROSSREF_BYTES);
      const { records, nextCursor } = parse(body);
      const itemCount = (body as { message?: { items?: unknown[] } })?.message?.items?.length ?? 0;
      yield records.filter((r) => inWindow(r, c));
      if (!nextCursor || itemCount === 0) break;
      cursor = nextCursor;
    }
  };
}

const essoar = crossrefPrefix(buildEssoarUrl, parseEssoarPage);
// SSRN has no API, and OpenAlex dates every SSRN work 1 January of its year: read Crossref by DOI registration date.
const ssrn = crossrefPrefix(buildSsrnUrl, parseSsrnPage);

async function* eartharxiv(c: SourceContext): AsyncGenerator<PreprintRecord[]> {
  let token: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    if (page > 0) await c.sleep(OAI_DELAY_MS);
    const res = await fetchWithRetry(buildOaiUrl({ from: c.fromDate, resumptionToken: token ?? undefined }), c.fetchFn, c.sleep, "EarthArXiv");
    const { records, resumptionToken } = parseOaiPage(await readText(res, MAX_XML_BYTES));
    yield records.filter((r) => inWindow(r, c));
    if (!resumptionToken) break;
    token = resumptionToken;
  }
}

export const SOURCES: Record<PreprintServer, (c: SourceContext) => AsyncGenerator<PreprintRecord[]>> = { arxiv, essoar, eartharxiv, ssrn };
