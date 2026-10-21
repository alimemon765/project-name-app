"use client";
import Link from "next/link";
import type { FeedPaper } from "@/lib/papers/types";
import { MONOGRAM } from "@/lib/topics";
import { TopicRegister } from "./TopicRegister";
import { SaveButton } from "./SaveButton";
import { citations, dayMonth, paperHref } from "./format";

export function PaperCard({ paper, isNew, onOpen }: { paper: FeedPaper; isNew: boolean; onOpen: (p: FeedPaper) => void }) {
  return (
    <article className="hover-border relative rounded-card border border-border bg-surface py-2 pr-2 pb-3.5 pl-3.5">
      <div className="flex flex-wrap items-center gap-x-1.5 text-small text-text-muted">
        <span className="grid size-7 flex-none place-items-center rounded-chip bg-raised text-meta font-bold text-text" title={paper.journal.group} aria-hidden="true">
          {MONOGRAM[paper.journal.group] ?? "··"}
        </span>
        <span className="min-w-0 max-w-[60%] truncate font-medium text-text" title={paper.journal.name}><bdi>{paper.journal.abbreviation}</bdi></span>
        <span aria-hidden="true">·</span>
        <span className="flex-none whitespace-nowrap">{dayMonth(paper.pubDate)}</span>
        {paper.regionNames[0] && <><span aria-hidden="true">·</span><span className="min-w-0 truncate"><bdi>{paper.regionNames[0]}</bdi></span></>}
        {isNew && <span className="ml-0.5 size-2 flex-none rounded-full bg-accent" role="img" aria-label="New since your last visit" />}
        <span className="w-11 flex-none" aria-hidden="true" />
      </div>
      <h2 className="mt-0.5 mr-2 font-title text-card-title [-webkit-line-clamp:4] [display:-webkit-box] [-webkit-box-orient:vertical] overflow-hidden" >
        <Link data-paper-link={paper.id} href={paperHref(paper.doi, paper.id)} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); onOpen(paper); }}
          className="text-text no-underline after:absolute after:inset-0 [position:static]">
          {/* titleHtml is built server-side: the whole title is HTML-escaped, then only <mark> is added (feed/explore.ts). */}
          {paper.titleHtml ? <span dangerouslySetInnerHTML={{ __html: paper.titleHtml }} /> : paper.title}
        </Link>
      </h2>
      <div className="absolute top-1 right-1"><SaveButton paper={paper} /></div>
      {paper.authors && <p className="mr-2 mt-1 line-clamp-2 text-small text-text-muted">{paper.authors}</p>}
      {paper.snippetHtml
        ? <p className="mr-2 mt-1.5 line-clamp-3 text-small text-text" dangerouslySetInnerHTML={{ __html: paper.snippetHtml }} />
        : paper.abstract && <p className="mr-2 mt-1.5 hidden line-clamp-2 text-small text-text-muted lg:[display:-webkit-box]">{paper.abstract}</p>}
      <TopicRegister topicIds={paper.topicIds} />
      <p className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {paper.retraction !== "none" && <span className="inline-flex h-6 items-center rounded-chip bg-badge-retracted-bg px-2 text-meta text-badge-retracted-text">Retracted</span>}
        {paper.isPreprint && <span className="inline-flex h-6 items-center rounded-chip bg-badge-preprint-bg px-2 text-meta text-badge-preprint-text">Preprint</span>}
        {paper.isOa && <span className="inline-flex h-6 items-center rounded-chip bg-badge-oa-bg px-2 text-meta text-badge-oa-text">Open access</span>}
        <span className="ml-0.5 text-meta font-normal text-text-muted">{citations(paper.citedByCount)}</span>
      </p>
    </article>
  );
}
