import { getExploreNewCount } from "@/lib/papers/queries";
import { parseFeedRequest, parseSince } from "@/lib/feed/api";

// GET /api/new-count?<Explore query>&since=<ISO> -> { count: first seen after `since`, total: the same window now }.
export async function GET(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams;
  const parsed = parseFeedRequest(params);
  const since = parseSince(params.get("since"));
  if (!parsed.ok || !since) return Response.json({ error: parsed.ok ? "Invalid since." : parsed.error }, { status: 400 });
  try {
    return Response.json(await getExploreNewCount(parsed.query, since), { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (e) {
    process.stderr.write(`[api/new-count] ${e instanceof Error ? e.message : String(e)}\n`);
    return Response.json({ error: "Couldn't count new papers." }, { status: 503 });
  }
}
