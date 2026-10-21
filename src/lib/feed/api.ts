// Request parsing for the Explore API routes. Pure: no database, no Next imports.
import { parseFeedQuery, type FeedQuery } from "./query";

const MAX_QUERY_STRING = 4000;
const MAX_CURSOR = 300;
const MAX_SINCE_AGE_DAYS = 400;

export type FeedRequest = { ok: true; query: FeedQuery; cursor: string | null } | { ok: false; error: string };

export function parseFeedRequest(params: URLSearchParams): FeedRequest {
  if (params.toString().length > MAX_QUERY_STRING) return { ok: false, error: "Request too long." };
  const cursor = params.get("cursor");
  if (cursor !== null && (cursor.length === 0 || cursor.length > MAX_CURSOR)) return { ok: false, error: "Invalid cursor." };
  return { ok: true, query: parseFeedQuery(params), cursor };
}

/** "New since" baseline from the client: an ISO time, not in the future, not absurdly old. */
export function parseSince(raw: string | null, now: Date = new Date()): Date | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(raw)) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime()) || d > now || now.getTime() - d.getTime() > MAX_SINCE_AGE_DAYS * 86_400_000) return null;
  return d;
}
