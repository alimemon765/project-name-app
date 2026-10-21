// Shared by the ingest jobs: polite HTTP with retry/backoff, and the classifier + gazetteer rules from the database.
import type { PoolClient } from "pg";
import type { KeywordRule } from "@/lib/classify/keywords";
import type { GazetteerRegion } from "@/lib/regions/gazetteer";

const RETRY_DELAYS_MS = [2000, 8000, 32000];
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRY_AFTER_MS = 60_000;
export const USER_AGENT = "coastal-hub-ingest (+https://github.com/alimemon765/project-name-app)";

export type Sleep = (ms: number) => Promise<void>;
export const realSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET with a timeout; retries network errors, 429 and 5xx (honouring Retry-After up to 60 s). Other statuses throw. */
export async function fetchWithRetry(url: string, fetchFn: typeof fetch, sleep: Sleep, label: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let res: Response | null = null;
    let networkError: unknown = null;
    try {
      res = await fetchFn(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (e) {
      networkError = e;                                     // DNS, reset, timeout: retryable
    }
    if (res?.ok) return res;
    const retryable = networkError !== null || (res !== null && (res.status === 429 || res.status >= 500));
    if (!retryable || attempt >= RETRY_DELAYS_MS.length) {
      await res?.body?.cancel().catch(() => {});
      throw new Error(res ? `${label} ${res.status} after ${attempt + 1} attempt(s)` : `${label} unreachable after ${attempt + 1} attempt(s): ${String(networkError)}`);
    }
    const retryAfter = Number(res?.headers.get("retry-after"));
    await res?.body?.cancel().catch(() => {});
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, MAX_RETRY_AFTER_MS) : RETRY_DELAYS_MS[attempt]);
  }
}

export async function loadRules(c: PoolClient): Promise<{ rules: KeywordRule[]; regions: GazetteerRegion[] }> {
  const kw = await c.query(`select topic_id, term, weight, kind from keywords where status = 'active'`);
  const rg = await c.query(`select id, parent_id, aliases from regions`);
  return {
    rules: kw.rows.map((r) => ({ topicId: r.topic_id, term: r.term, weight: Number(r.weight), kind: r.kind })),
    regions: rg.rows.map((r) => ({ id: r.id, parentId: r.parent_id, aliases: r.aliases })),
  };
}
