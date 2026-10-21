// OpenAlex ships abstracts as an inverted index (word -> positions); rebuild the plain text.
const LEADING_LABEL = /^(?:abstract|summary)\s*[.:]?(?:\s+|$)/i;

export function rebuildAbstract(inverted: Record<string, number[]> | null | undefined): string | null {
  if (!inverted || typeof inverted !== "object") return null;
  const slots: string[] = [];
  for (const [word, positions] of Object.entries(inverted)) {
    if (!Array.isArray(positions)) continue;
    for (const pos of positions) if (Number.isInteger(pos) && pos >= 0) slots[pos] = word;
  }
  const text = slots.filter((w) => w !== undefined).join(" ").replace(/\s+/g, " ").trim().replace(LEADING_LABEL, "").trim();
  return text.length ? text : null;
}
