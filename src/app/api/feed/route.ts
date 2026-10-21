import { getExplorePage, getExploreSummary } from "@/lib/papers/queries";
import { parseFeedRequest, parseSince } from "@/lib/feed/api";

// GET /api/feed?<Explore query>&cursor=<cursor>[&since=<ISO>] -> one page. The first page (no cursor) also carries the total.
// `since` keeps only papers first seen after it ("new only").
// Bad input is a 400 with a message; database trouble is a 503 the client can retry. Never a 500 with a stack.
export async function GET(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams;
  const parsed = parseFeedRequest(params);
  if (!parsed.ok) return Response.json({ papers: [], nextCursor: null, error: parsed.error }, { status: 400 });
  const since = params.has("since") ? parseSince(params.get("since")) : null;
  if (params.has("since") && !since) return Response.json({ papers: [], nextCursor: null, error: "Invalid since." }, { status: 400 });
  try {
    const [page, summary] = await Promise.all([
      getExplorePage(parsed.query, parsed.cursor, since ? since.toISOString() : null),
      parsed.cursor ? null : getExploreSummary(parsed.query),
    ]);
    return Response.json({ ...page, ...(summary ?? {}) }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) {
    process.stderr.write(`[api/feed] ${e instanceof Error ? e.message : String(e)}\n`);
    return Response.json({ papers: [], nextCursor: null, error: "Couldn't load papers." }, { status: 503 });
  }
}
