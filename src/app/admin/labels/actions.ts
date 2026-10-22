"use server";
// Ali's review of the reference labels. Every action re-checks the local-only guard: a server action is a public
// endpoint otherwise. The export writes one fixed file inside the repo; nothing from the request picks the path.
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { sql } from "kysely";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { isLocalAdmin } from "@/lib/admin/guard";
import { VERDICTS, reviewCsv, verdictToLabel, type ReviewRow, type Verdict } from "@/lib/eval/review";

const EXPORT_PATH = path.join(process.cwd(), "replica", "eval", "ali-reviews.csv");

const Review = z.object({
  itemId: z.string().uuid(),
  verdict: z.enum(VERDICTS as [Verdict, ...Verdict[]]),
  topicIds: z.array(z.number().int().min(1).max(13)).max(13),
  note: z.string().max(500).optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

async function guarded(): Promise<boolean> {
  return isLocalAdmin((await headers()).get("host"), process.env.ADMIN_LABELS);
}

export async function saveReview(input: unknown): Promise<ActionResult> {
  if (!(await guarded())) return { ok: false, error: "Not available here." };
  const parsed = Review.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid review." };
  const { itemId, verdict, topicIds, note } = parsed.data;
  try {
    const ref = await getDb().selectFrom("classifier_labels").select(["in_scope", "topic_ids"])
      .where("item_id", "=", itemId).where("labeller", "=", "reference").executeTakeFirst();
    if (!ref || ref.in_scope === null) return { ok: false, error: "This paper has no reference label yet." };
    const label = verdictToLabel(verdict, { inScope: ref.in_scope, topicIds: ref.topic_ids }, topicIds);
    const trimmed = note?.trim() || null;
    await getDb().insertInto("classifier_labels")
      .values({ item_id: itemId, labeller: "ali", verdict, in_scope: label.inScope, topic_ids: label.topicIds, note: trimmed })
      .onConflict((oc) => oc.columns(["item_id", "labeller"]).doUpdateSet({ verdict, in_scope: label.inScope, topic_ids: label.topicIds, note: trimmed }))
      .execute();
    return { ok: true };
  } catch (e) {
    process.stderr.write(`[admin/labels] save: ${e instanceof Error ? e.message : String(e)}\n`);
    return { ok: false, error: e instanceof Error && /topic/.test(e.message) ? e.message : "Couldn't save. Is the local database running?" };
  }
}

export async function exportReviews(): Promise<{ ok: true; path: string; rows: number } | { ok: false; error: string }> {
  if (!(await guarded())) return { ok: false, error: "Not available here." };
  try {
    const rows = await sql<{
      source_key: string; stratum: string; venue: string; year: string | null; title: string; ref_in: boolean; ref_topics: string[]; ref_regions: string[];
      ref_reason: string; ref_unsure: boolean; verdict: Verdict; ali_in: boolean | null; ali_topics: string[]; note: string | null; answered_at: Date;
    }>`
      select i.source_key, i.stratum, i.venue, to_char(i.pub_date, 'YYYY') as year, i.title,
        r.in_scope as ref_in, r.reason as ref_reason, r.unsure as ref_unsure,
        coalesce((select array_agg(t.name order by t.id) from topics t where t.id = any(r.topic_ids)), '{}') as ref_topics,
        coalesce((select array_agg(g.name order by g.id) from regions g where g.id = any(r.region_ids)), '{}') as ref_regions,
        a.verdict, a.in_scope as ali_in, a.note, a.updated_at as answered_at,
        coalesce((select array_agg(t.name order by t.id) from topics t where t.id = any(a.topic_ids)), '{}') as ali_topics
      from classifier_eval_items i
      join classifier_labels r on r.item_id = i.id and r.labeller = 'reference'
      join classifier_labels a on a.item_id = i.id and a.labeller = 'ali'
      order by i.review_order`.execute(getDb());
    const csvRows: ReviewRow[] = rows.rows.map((r) => ({
      sourceKey: r.source_key, stratum: r.stratum, venue: r.venue, year: r.year, title: r.title,
      refInDomain: r.ref_in, refTopics: r.ref_topics, refRegions: r.ref_regions, refReason: r.ref_reason, refUnsure: r.ref_unsure,
      verdict: r.verdict, aliInDomain: r.ali_in, aliTopics: r.ali_topics, note: r.note, answeredAt: new Date(r.answered_at).toISOString(),
    }));
    await mkdir(path.dirname(EXPORT_PATH), { recursive: true });
    await writeFile(EXPORT_PATH, reviewCsv(csvRows), "utf8");
    return { ok: true, path: path.relative(process.cwd(), EXPORT_PATH), rows: csvRows.length };
  } catch (e) {
    process.stderr.write(`[admin/labels] export: ${e instanceof Error ? e.message : String(e)}\n`);
    return { ok: false, error: "Couldn't write the export." };
  }
}
