"use server";
// Saves one of Ali's classifier labels. Re-checks the local-only guard: a server action is a public endpoint otherwise.
import { headers } from "next/headers";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { isLocalAdmin } from "@/lib/admin/guard";

const Label = z.object({
  itemId: z.string().uuid(),
  inScope: z.boolean(),
  topicIds: z.array(z.number().int().min(1).max(13)).max(13),
}).refine((l) => !l.inScope || l.topicIds.length > 0, { message: "Pick at least one topic, or mark it off-topic." });

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveLabel(input: unknown): Promise<SaveResult> {
  if (!isLocalAdmin((await headers()).get("host"), process.env.ADMIN_LABELS)) return { ok: false, error: "Not available here." };
  const parsed = Label.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid label." };
  const { itemId, inScope, topicIds } = parsed.data;
  try {
    await getDb().insertInto("classifier_labels")
      .values({ item_id: itemId, labeller: "ali", in_scope: inScope, topic_ids: inScope ? [...new Set(topicIds)].sort((a, b) => a - b) : [] })
      .onConflict((oc) => oc.columns(["item_id", "labeller"]).doUpdateSet((eb) => ({ in_scope: eb.ref("excluded.in_scope"), topic_ids: eb.ref("excluded.topic_ids") })))
      .execute();
    return { ok: true };
  } catch (e) {
    process.stderr.write(`[admin/labels] ${e instanceof Error ? e.message : String(e)}\n`);
    return { ok: false, error: "Couldn't save. Is the local database running?" };
  }
}
