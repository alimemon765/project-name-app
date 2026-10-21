// Seeds reference data (CC0 files in data/): topics, regions, keyword rules, journals. Idempotent upserts.
import { readFileSync } from "node:fs";
import { Pool } from "pg";

const read = (p: string) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), "utf8"));

async function main() {
  const url = process.env.DATABASE_URL ?? "postgres://postgres@localhost:55433/coastal";
  const pool = new Pool({ connectionString: url, max: 1 });
  const c = await pool.connect();
  try {
    await c.query("begin");
    for (const [i, t] of read("topics.json").topics.entries()) {
      await c.query(`insert into topics (id, slug, name, sort_order) values ($1,$2,$3,$4)
        on conflict (id) do update set slug = excluded.slug, name = excluded.name, sort_order = excluded.sort_order`, [t.id, t.slug, t.name, i]);
    }
    const regions = read("regions.json").regions as Array<{ id: number; slug: string; name: string; parent: number | null; level: number; lat: number | null; lon: number | null; aliases: string[] }>;
    for (const r of [...regions].sort((a, b) => a.level - b.level)) {
      await c.query(`insert into regions (id, slug, name, parent_id, level, lat, lon, aliases, sort_order) values ($1,$2,$3,$4,$5,$6,$7,$8,$1)
        on conflict (id) do update set slug=excluded.slug, name=excluded.name, parent_id=excluded.parent_id, level=excluded.level, lat=excluded.lat, lon=excluded.lon, aliases=excluded.aliases`,
        [r.id, r.slug, r.name, r.parent, r.level, r.lat, r.lon, r.aliases]);
    }
    let kw = 0;
    for (const [topic, { include, exclude }] of Object.entries(read("keywords.seed.json").rules as Record<string, { include: [string, number][]; exclude: [string][] }>)) {
      for (const [term, weight] of include) {
        await c.query(`insert into keywords (topic_id, term, weight, kind, source) values ($1,$2,$3,'include','seed')
          on conflict (topic_id, term, kind) do update set weight = excluded.weight`, [Number(topic), term, weight]); kw++;
      }
      for (const [term] of exclude) {
        await c.query(`insert into keywords (topic_id, term, weight, kind, source) values ($1,$2,1,'exclude','seed')
          on conflict (topic_id, term, kind) do nothing`, [Number(topic), term]); kw++;
      }
    }
    const journals = read("journals.json") as Array<Record<string, unknown>>;
    for (const [i, j] of journals.entries()) {
      await c.query(`insert into journals (openalex_id, name, abbreviation, publisher_group, publisher, issns, issn_l, is_oa, verified, sort_order)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        on conflict (openalex_id) do update set name=excluded.name, abbreviation=excluded.abbreviation, publisher_group=excluded.publisher_group,
          publisher=excluded.publisher, issns=excluded.issns, issn_l=excluded.issn_l, is_oa=excluded.is_oa, verified=excluded.verified`,
        [j.openalex_id, j.name, j.abbreviation, j.group, j.publisher, j.issns, j.issn_l, j.is_oa, j.verified, i]);
    }
    await c.query("commit");
    console.log(`seeded ${read("topics.json").topics.length} topics, ${regions.length} regions, ${kw} keyword rules, ${journals.length} journals`);
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => { console.error("seed failed:", e instanceof Error ? e.message : e); process.exit(1); });
