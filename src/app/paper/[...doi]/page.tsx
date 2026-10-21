import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getPaperByDoi } from "@/lib/papers/queries";
import { normalizeDoi } from "@/lib/papers/doi";
import { PaperDetail, OpenArticle } from "@/components/paper/PaperDetail";

type Props = { params: Promise<{ doi: string[] }> };
const doiFrom = async (params: Props["params"]) => {
  const raw = (await params).doi.join("/");
  try { return normalizeDoi(decodeURIComponent(raw)); } catch { return normalizeDoi(raw); }   // malformed %-escapes -> 404, not 500
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doi = await doiFrom(params);
  const paper = doi ? await getPaperByDoi(doi) : null;
  return paper ? { title: paper.title, description: paper.abstract?.slice(0, 200) ?? `${paper.journal.name}, ${paper.pubDate}` } : { title: "Paper not found" };
}

export default function PaperPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto mt-6 max-w-[720px]" aria-busy="true"><div className="h-6 w-3/4 rounded bg-raised" /><div className="mt-3 h-4 w-1/2 rounded bg-raised" /></div>}>
      <PaperContent params={params} />
    </Suspense>
  );
}

async function PaperContent({ params }: Props) {
  const doi = await doiFrom(params);
  const paper = doi ? await getPaperByDoi(doi) : null;
  if (!paper) notFound();
  return (
    <article className="mx-auto max-w-[720px] pt-4">
      <PaperDetail paper={paper} titleId="paper-title" />
      <div className="flex"><OpenArticle paper={paper} /></div>
    </article>
  );
}
