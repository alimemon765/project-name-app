// Keyset pagination cursor: {key: sort value, id: tiebreaker, sort: which ordering made it}, base64url JSON.
// Decoding never throws. A cursor is only valid for the sort that produced it.
export interface Cursor { key: string | number; id: string; sort?: string }

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c.sort ? { k: c.key, i: c.id, s: c.sort } : { k: c.key, i: c.id }), "utf8").toString("base64url");
}

export function decodeCursor(s: string | null | undefined): Cursor | null {
  if (!s) return null;
  try {
    const v: unknown = JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const { k, i, s: sort } = v as { k?: unknown; i?: unknown; s?: unknown };
    const keyOk = typeof k === "string" || (typeof k === "number" && Number.isFinite(k));
    if (!keyOk || typeof i !== "string" || i.length === 0) return null;
    return typeof sort === "string" ? { key: k as string | number, id: i, sort } : { key: k as string | number, id: i };
  } catch {
    return null;
  }
}
