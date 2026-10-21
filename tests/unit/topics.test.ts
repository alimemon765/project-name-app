import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { TOPICS, TOPIC_SLUGS } from "@/lib/topics";
import { REGION_TREE } from "@/lib/regions/tree";

const seed = JSON.parse(readFileSync(new URL("../../data/topics.json", import.meta.url), "utf8")).topics as { id: number; slug: string; name: string }[];

describe("client topic and region data mirror the CC0 seeds", () => {
  test("topic names and slugs match data/topics.json", () => {
    for (const t of seed) {
      expect(TOPICS[t.id]).toBe(t.name);
      expect(TOPIC_SLUGS[t.id]).toBe(t.slug);
    }
    expect(Object.keys(TOPIC_SLUGS)).toHaveLength(seed.length);
  });
  test("the region tree lists parents before children, depth-first", () => {
    const seen = new Set<number>();
    for (const r of REGION_TREE) {
      if (r.parentId !== null) expect(seen.has(r.parentId)).toBe(true);
      seen.add(r.id);
    }
    const southAsia = REGION_TREE.findIndex((r) => r.slug === "south-asia");
    expect(REGION_TREE[southAsia + 1].slug).not.toBe("global");          // its children follow it
    expect(REGION_TREE.find((r) => r.slug === "mumbai")?.depth).toBeGreaterThan(REGION_TREE.find((r) => r.slug === "india")!.depth);
  });
});
