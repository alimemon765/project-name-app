// Keyset pagination cursor: {key: sort value, id: tiebreaker}, base64url JSON. Decoding never throws.
export interface Cursor { key: string | number; id: string }

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify({ k: c.key, i: c.id }), "utf8").toString("base64url");
}

export function decodeCursor(s: string | null | undefined): Cursor | null {
  if (!s) return null;
  try {
    const v: unknown = JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const { k, i } = v as { k?: unknown; i?: unknown };
    const keyOk = typeof k === "string" || (typeof k === "number" && Number.isFinite(k));
    return keyOk && typeof i === "string" && i.length > 0 ? { key: k as string | number, id: i } : null;
  } catch {
    return null;
  }
}
