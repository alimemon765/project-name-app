import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { isLocalAdmin } from "@/lib/admin/guard";
import { LabelReview, type ReviewItem } from "./LabelReview";

export const metadata = { title: "Classifier review", robots: { index: false, follow: false } };

async function Queue() {
  if (!isLocalAdmin((await headers()).get("host"), process.env.ADMIN_LABELS)) notFound();
  const db = getDb();
  const rows = await db.selectFrom("classifier_eval_items as i")
    .innerJoin("classifier_labels as r", (j) => j.onRef("r.item_id", "=", "i.id").on("r.labeller", "=", "reference"))
    .leftJoin("classifier_labels as a", (j) => j.onRef("a.item_id", "=", "i.id").on("a.labeller", "=", "ali"))
    .select(["i.id", "i.title", "i.abstract", "i.venue", "i.doi", "i.pub_date", "i.stratum",
      "r.in_scope as ref_in", "r.topic_ids as ref_topics", "r.region_ids as ref_regions", "r.reason as ref_reason", "r.unsure as ref_unsure",
      "a.verdict", "a.topic_ids as ali_topics", "a.note"])
    .where("i.in_review_queue", "=", true)
    .orderBy("i.review_order").execute();
  if (rows.length === 0) return <p className="text-body">No review queue yet. Run <code>npm run eval:build</code> and <code>npm run eval:load-reference</code>.</p>;
  const regions = await db.selectFrom("regions").select(["id", "name"]).execute();
  const regionName = new Map(regions.map((r) => [r.id, r.name]));
  const items: ReviewItem[] = rows.map((r) => ({
    id: r.id, title: r.title, abstract: r.abstract, venue: r.venue, doi: r.doi,
    year: r.pub_date ? String(r.pub_date).slice(0, 4) : null,
    reference: { inDomain: Boolean(r.ref_in), topicIds: r.ref_topics, regions: r.ref_regions.map((id) => regionName.get(id) ?? String(id)), reason: r.ref_reason ?? "", unsure: r.ref_unsure },
    answer: r.verdict ? { verdict: r.verdict, topicIds: r.ali_topics ?? [], note: r.note ?? "" } : null,
  }));
  return <LabelReview items={items} />;
}

export default function AdminLabelsPage() {
  return (
    <div className="max-w-[1180px]">
      <h1 className="pt-2 pb-1 text-h1">Classifier review</h1>
      <p className="mb-4 text-small text-text-muted">Check my labels for each paper. Keys: 1 Correct, 2 Wrong topic, 3 Off-topic, S Skip, ← → move. Every answer saves straight away. Local only.</p>
      <Suspense fallback={<p className="text-small text-text-muted">Loading…</p>}><Queue /></Suspense>
    </div>
  );
}
