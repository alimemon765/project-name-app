// Text and URL clean-up for metadata from external sources (OpenAlex, Crossref, arXiv, OAI-PMH).

const INLINE_TAGS = /<\/?(?:i|b|em|strong|sub|sup|scp|span|mml:[a-z]+|math)\b[^>]*>/gi;
const JATS_TAGS = /<\/?jats:[a-z-]+\b[^>]*>/gi;

/** Strip only the inline markup publishers use in titles (keeps "<5 mm" and "> 10 m" intact), collapse whitespace. */
export const stripTags = (s: string): string => s.replace(INLINE_TAGS, "").replace(/\s+/g, " ").trim();

/** Strip JATS (Crossref abstracts) plus inline markup. A JATS section title like "Abstract" is dropped. */
export const stripJats = (s: string): string =>
  stripTags(s.replace(/<jats:title>[^<]*<\/jats:title>/gi, " ").replace(JATS_TAGS, " "));

export function httpUrl(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
