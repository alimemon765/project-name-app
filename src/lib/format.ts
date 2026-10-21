// Display formatting: Intl for numbers and plurals (never hand-written plurals).

export function formatAuthors(names: string[], max = 3): string {
  if (!names?.length) return "";
  if (names.length <= max) return names.join(", ");
  const rest = names.length - max;
  return `${names.slice(0, max).join(", ")} and ${rest} ${rest === 1 ? "other" : "others"}`;
}

export function formatCount(n: number, singular: string, plural: string, locale = "en"): string {
  const word = new Intl.PluralRules(locale).select(n) === "one" ? singular : plural;
  return `${new Intl.NumberFormat(locale).format(n)} ${word}`;
}
