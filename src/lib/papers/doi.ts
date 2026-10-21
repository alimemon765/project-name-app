// DOI normalisation: one canonical lower-case form so `papers.doi` stays unique (schema check doi_shape).
const PREFIX = /^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i;
const SHAPE = /^10\.\d{4,9}\/\S+$/;
const TRAILING_PUNCT = /([a-z0-9])[.,;]$/;

export function normalizeDoi(input: string | null | undefined): string | null {
  if (!input) return null;
  let doi = input.trim().replace(PREFIX, "").trim().toLowerCase();
  doi = doi.replace(TRAILING_PUNCT, "$1");
  return SHAPE.test(doi) ? doi : null;
}
