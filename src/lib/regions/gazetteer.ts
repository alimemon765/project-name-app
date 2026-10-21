// Region tagging: whole-word alias match on title + abstract; a match also tags every ancestor.
import { isMatchableTerm, phrasePattern } from "@/lib/text";

export interface GazetteerRegion { id: number; parentId: number | null; aliases: string[] }

const compiled = new WeakMap<GazetteerRegion[], Map<number, RegExp[]>>();
function patterns(regions: GazetteerRegion[]) {
  let out = compiled.get(regions);
  if (!out) {
    out = new Map(regions.map((r) => [r.id, r.aliases.filter((a) => a.trim() && isMatchableTerm(a)).map(phrasePattern)]));
    compiled.set(regions, out);
  }
  return out;
}

export function tagRegions(text: string, regions: GazetteerRegion[]): number[] {
  if (!text?.trim()) return [];
  const pats = patterns(regions);
  const byId = new Map(regions.map((r) => [r.id, r]));
  const found = new Set<number>();
  for (const region of regions) {
    if (!(pats.get(region.id) ?? []).some((re) => re.test(text))) continue;
    let current: GazetteerRegion | undefined = region;
    const seen = new Set<number>();
    while (current && !seen.has(current.id)) {           // cycle-safe ancestor walk
      seen.add(current.id);
      found.add(current.id);
      current = current.parentId == null ? undefined : byId.get(current.parentId);
    }
  }
  return [...found].sort((a, b) => a - b);
}
