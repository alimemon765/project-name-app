import { getExploreFacets } from "@/lib/papers/queries";
import { parseFeedRequest } from "@/lib/feed/api";

// GET /api/facets?<Explore query> -> live counts for the filter sheets (each facet ignores its own selection).
export async function GET(req: Request): Promise<Response> {
  const parsed = parseFeedRequest(new URL(req.url).searchParams);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    return Response.json(await getExploreFacets(parsed.query), { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) {
    process.stderr.write(`[api/facets] ${e instanceof Error ? e.message : String(e)}\n`);
    return Response.json({ error: "Couldn't load filter counts." }, { status: 503 });
  }
}
