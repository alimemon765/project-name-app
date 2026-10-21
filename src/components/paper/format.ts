import { formatCount } from "@/lib/format";
// Client-safe display helpers. Dates are calendar dates (no time zone shift).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dayMonth = (iso: string) => { const [, m, d] = iso.split("-"); return `${Number(d)} ${MONTHS[Number(m) - 1]}`; };
export const dayMonthYear = (iso: string) => { const [y, m, d] = iso.split("-"); return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`; };
const encodeDoi = (doi: string) => doi.split("/").map(encodeURIComponent).join("/");
export const paperHref = (doi: string | null, id: string) => (doi ? `/paper/${encodeDoi(doi)}` : `/paper/id/${encodeURIComponent(id)}`);
export const doiUrl = (doi: string) => `https://doi.org/${encodeDoi(doi)}`;
export const citations = (n: number) => formatCount(n, "citation", "citations");
