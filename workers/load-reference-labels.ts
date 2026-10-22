// CLI: npm run eval:load-reference   Loads replica/eval/reference-labels.json as labeller "reference" (validated against
// the slugs in the database), then marks Ali's review queue: every unsure item plus a seeded random fill to 50.
// Idempotent: re-running replaces the reference labels and the queue, never Ali's answers.
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { parseReferenceLabels } from "../src/lib/eval/reference";
import { pickReviewQueue } from "../src/lib/eval/plan";

const QUEUE_SIZE = 50;
const SEED = 20261023;

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (see .env.example)");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const c = await pool.connect();
  try {
    const topics = await c.query(`select id, slug from topics`);
    const regions = await c.query(`select id, slug from regions`);
    const labels = parseReferenceLabels(JSON.parse(readFileSync(new URL("../replica/eval/reference-labels.json", import.meta.url), "utf8")), {
      topicIds: Object.fromEntries(topics.rows.map((t) => [t.slug, t.id])),
      regionIds: Object.fromEntries(regions.rows.map((r) => [r.slug, r.id])),
    });
    const items = await c.query(`select id, source_key from classifier_eval_items order by review_order`);
    const idByKey = new Map<string, string>(items.rows.map((r) => [r.source_key, r.id]));
    const missing = labels.filter((l) => !idByKey.has(l.sourceKey)).map((l) => l.sourceKey);
    if (missing.length) throw new Error(`labels for items not in the eval set: ${missing.slice(0, 5).join(", ")}`);
    const unlabelled = items.rows.filter((r) => !labels.some((l) => l.sourceKey === r.source_key)).length;
    if (unlabelled) throw new Error(`${unlabelled} eval items have no reference label`);
    await c.query("begin");
    for (const l of labels) {
      await c.query(
        `insert into classifier_labels (item_id, labeller, in_scope, topic_ids, region_ids, reason, unsure)
         values ($1, 'reference', $2, $3, $4, $5, $6)
         on conflict (item_id, labeller) do update set in_scope = excluded.in_scope, topic_ids = excluded.topic_ids,
           region_ids = excluded.region_ids, reason = excluded.reason, unsure = excluded.unsure`,
        [idByKey.get(l.sourceKey), l.inDomain, l.topicIds, l.regionIds, l.reason, l.unsure]);
    }
    const queue = pickReviewQueue(items.rows.map((r) => r.source_key), labels.filter((l) => l.unsure).map((l) => l.sourceKey), QUEUE_SIZE, SEED);
    await c.query(`update classifier_eval_items set in_review_queue = (source_key = any($1))`, [queue]);
    await c.query("commit");
    process.stdout.write(`reference labels: ${labels.length} loaded (${labels.filter((l) => l.inDomain).length} in domain, ${labels.filter((l) => l.unsure).length} unsure); review queue: ${queue.length}\n`);
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => { process.stderr.write(`eval:load-reference failed: ${e instanceof Error ? e.message : e}\n`); process.exit(1); });
