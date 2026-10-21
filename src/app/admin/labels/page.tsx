import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { isLocalAdmin } from "@/lib/admin/guard";
import { LabelReview, type ReviewItem } from "./LabelReview";

export const metadata = { title: "Classifier review", robots: { index: false, follow: false } };
const QUEUE = 50;

async function Queue() {
  if (!isLocalAdmin((await headers()).get("host"), process.env.ADMIN_LABELS)) notFound();
  const rows = await getDb().selectFrom("classifier_eval_items as i")
    .leftJoin("classifier_labels as l", (j) => j.onRef("l.item_id", "=", "i.id").on("l.labeller", "=", "ali"))
    .select(["i.id", "i.title", "i.abstract", "i.venue", "i.doi", "i.predicted_topic_ids", "l.in_scope", "l.topic_ids"])
    .orderBy("i.review_order").limit(QUEUE).execute();
  if (rows.length === 0) return <p className="text-body">No eval set yet. Run <code>npm run eval:build</code> first.</p>;
  const items: ReviewItem[] = rows.map((r) => ({
    id: r.id, title: r.title, abstract: r.abstract, venue: r.venue, doi: r.doi, predicted: r.predicted_topic_ids,
    saved: r.in_scope === null ? null : { inScope: r.in_scope, topicIds: r.topic_ids ?? [] },
  }));
  return <LabelReview items={items} />;
}

export default function AdminLabelsPage() {
  return (
    <div className="max-w-[760px]">
      <h1 className="pt-2 pb-1 text-h1">Classifier review</h1>
      <p className="mb-4 text-small text-text-muted">50 papers in a fixed random order. For each, say whether the topics the classifier gave are right. Local only.</p>
      <Suspense fallback={<p className="text-small text-text-muted">Loading…</p>}><Queue /></Suspense>
    </div>
  );
}
