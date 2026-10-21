// Region hierarchy for the Region filter (client-safe). Depth-first, parents before children, from data/regions.json.
import data from "../../../data/regions.json";

export interface RegionNode { id: number; slug: string; name: string; parentId: number | null; depth: number }

interface SeedRegion { id: number; slug: string; name: string; parent: number | null }

function build(regions: SeedRegion[]): RegionNode[] {
  const children = new Map<number | null, SeedRegion[]>();
  for (const r of regions) children.set(r.parent, [...(children.get(r.parent) ?? []), r]);
  const out: RegionNode[] = [];
  const walk = (parent: number | null, depth: number) => {
    for (const r of children.get(parent) ?? []) {
      out.push({ id: r.id, slug: r.slug, name: r.name, parentId: r.parent, depth });
      walk(r.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export const REGION_TREE: RegionNode[] = build((data as { regions: SeedRegion[] }).regions);
