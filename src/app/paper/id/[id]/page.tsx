import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPaperById } from "@/lib/papers/queries";
import { PaperDetail, OpenArticle } from "@/components/paper/PaperDetail";

// Papers without a DOI (allowed by the schema) are addressed by our id.
type Props = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Content({ params }: Props) {
  const { id } = await params;
  const paper = UUID.test(id) ? await getPaperById(id) : null;
  if (!paper) notFound();
  return (<article className="mx-auto max-w-[720px] pt-4"><PaperDetail paper={paper} titleId="paper-title" /><div className="flex"><OpenArticle paper={paper} /></div></article>);
}

export default function PaperByIdPage({ params }: Props) {
  return <Suspense fallback={<div className="mx-auto mt-6 h-6 max-w-[720px] rounded bg-raised" aria-busy="true" />}><Content params={params} /></Suspense>;
}
