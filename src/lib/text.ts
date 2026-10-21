// Shared text matching helpers (classifier + gazetteer): whole-word, case-insensitive,
// phrase words joined by space or any dash (- – —), regex-safe.
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function phrasePattern(term: string): RegExp {
  const words = term.trim().split(/[\s\-–—]+/).filter(Boolean).map(escapeRegex);
  return new RegExp(`(?<![\\p{L}\\p{N}])${words.join("[\\s\\-–—]+")}(?![\\p{L}\\p{N}])`, "iu");
}

/** A term must contain a letter or digit, otherwise it would match almost anywhere. */
export const isMatchableTerm = (term: string) => /[\p{L}\p{N}]/u.test(term);
