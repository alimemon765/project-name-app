import { getFeedPage } from "@/lib/papers/queries";

// GET /api/feed?cursor=<keyset cursor> -> next 30 papers. Invalid cursors return an empty page (never 500).
export async function GET(req: Request): Promise<Response> {
  const cursor = new URL(req.url).searchParams.get("cursor");
  if (!cursor || cursor.length > 200) return Response.json({ papers: [], nextCursor: null }, { status: 400 });
  try {
    return Response.json(await getFeedPage(cursor), { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) {
    process.stderr.write(`[api/feed] ${e instanceof Error ? e.message : String(e)}\n`);
    return Response.json({ papers: [], nextCursor: null, error: "Couldn't load more papers." }, { status: 503 });
  }
}
