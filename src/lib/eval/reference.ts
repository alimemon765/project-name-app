// Validates replica/eval/reference-labels.json (the reference labelling pass) before it is loaded. Pure.
import { z } from "zod";

const Item = z.object({
  source_key: z.string().min(1),
  in_domain: z.boolean(),
  topics: z.array(z.string()),
  regions: z.array(z.string()),
  reason: z.string().trim().min(1).max(300),
  unsure: z.boolean(),
});
const Doc = z.object({ labeller: z.literal("reference"), items: z.array(Item) });

export interface ReferenceLabel { sourceKey: string; inDomain: boolean; topicIds: number[]; regionIds: number[]; reason: string; unsure: boolean }
export interface SlugIds { topicIds: Record<string, number>; regionIds: Record<string, number> }

export function parseReferenceLabels(json: unknown, ids: SlugIds): ReferenceLabel[] {
  const doc = Doc.parse(json);
  const seen = new Set<string>();
  return doc.items.map((it) => {
    const where = `item ${it.source_key}`;
    if (seen.has(it.source_key)) throw new Error(`duplicate source key: ${it.source_key}`);
    seen.add(it.source_key);
    const unknownTopic = it.topics.find((t) => !(t in ids.topicIds));
    if (unknownTopic) throw new Error(`${where}: unknown topic slug "${unknownTopic}"`);
    const unknownRegion = it.regions.find((r) => !(r in ids.regionIds));
    if (unknownRegion) throw new Error(`${where}: unknown region slug "${unknownRegion}"`);
    if (it.in_domain && it.topics.length === 0) throw new Error(`${where}: in domain but no topic`);
    if (!it.in_domain && (it.topics.length > 0 || it.regions.length > 0)) throw new Error(`${where}: out of domain items carry no topics or regions`);
    return {
      sourceKey: it.source_key, inDomain: it.in_domain, topicIds: it.topics.map((t) => ids.topicIds[t]), regionIds: it.regions.map((r) => ids.regionIds[r]),
      reason: it.reason.trim(), unsure: it.unsure,
    };
  });
}
