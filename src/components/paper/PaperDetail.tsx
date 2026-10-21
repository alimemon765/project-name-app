"use client";
import { useState } from "react";
import type { FeedPaper } from "@/lib/papers/types";
import { TOPICS, GLYPHS } from "@/lib/topics";
import { Icon } from "@/components/icons";
import { dayMonthYear, doiUrl } from "./format";

const MAX_TOPIC_CHIPS = 4;
const AUTHORS_PREVIEW = 8;

// Content shared by the sheet and the full /paper page (components.md: PaperSheet order).
export function PaperDetail({ paper, titleId }: { paper: FeedPaper; titleId: string }) {
  const [allTopics, setAllTopics] = useState(false);
  const [abstractOpen, setAbstractOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const authors = paper.authors;
  const known = paper.topicIds.filter((t) => t in TOPICS);
  const topics = allTopics ? known : known.slice(0, MAX_TOPIC_CHIPS);
  const copyDoi = async () => {
    if (!paper.doi) return;
    await navigator.clipboard?.writeText(doiUrl(paper.doi)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }, () => {});
  };
  return (
    <div className="pb-6">
      {paper.retraction !== "none" && (
        <div role="note" className="mb-4 rounded-card bg-badge-retracted-bg p-3 text-body text-badge-retracted-text">
          <strong className="font-bold">This paper has been {paper.retraction === "retracted" ? "retracted" : paper.retraction.replaceAll("_", " ")}.</strong>{" "}
          Check the publisher&apos;s notice before relying on it or citing it.
        </div>
      )}
      <p className="text-small text-text-muted"><bdi>{paper.journal.name}</bdi>{paper.isPreprint ? " · preprint, not peer reviewed" : ""}</p>
      <h2 id={titleId} className="mt-1.5 mb-2.5 font-title text-sheet-title tracking-[-0.01em] text-balance">{paper.title}</h2>
      <p className="text-small text-text-muted">{dayMonthYear(paper.pubDate)}</p>
      {paper.doi && (
        <p className="mt-1 flex items-start gap-1">
          <code className="min-w-0 flex-1 font-mono text-small text-text-muted [overflow-wrap:anywhere]">{paper.doi}</code>
          <button type="button" onClick={copyDoi} aria-label="Copy DOI link" className="press -mt-1.5 grid size-8 flex-none place-items-center rounded-full text-text-muted"><Icon name="copy" size={18} /></button>
          <span aria-live="polite" className="sr-only">{copied ? "DOI link copied" : ""}</span>
        </p>
      )}
      {authors && (
        <p className="mt-3 text-body" title={paper.authorCount > AUTHORS_PREVIEW ? `${paper.authorCount} authors` : undefined}>
          {authors}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {paper.isOa && <span className="inline-flex h-6 items-center rounded-chip bg-badge-oa-bg px-2 text-meta text-badge-oa-text">Open access{paper.licence ? ` · ${paper.licence.toUpperCase().replace("CC-", "CC ")}` : ""}</span>}
        {topics.map((t) => (
          <span key={t} className="inline-flex h-6 flex-none items-center gap-1.5 whitespace-nowrap rounded-chip px-2 text-meta font-normal"
            style={{ background: `var(--c-topic-${t}-tint)`, color: `var(--c-topic-${t})` }}>
            <svg viewBox="0 0 10 10" width={9} height={9} fill="currentColor" aria-hidden="true" dangerouslySetInnerHTML={{ __html: GLYPHS[t] }} />
            {TOPICS[t]}
          </span>
        ))}
        {!allTopics && known.length > MAX_TOPIC_CHIPS && (
          <button type="button" onClick={() => setAllTopics(true)} className="h-6 px-1 text-meta text-text underline underline-offset-2">+{known.length - MAX_TOPIC_CHIPS} more</button>
        )}
        {paper.regionNames.map((r) => <span key={r} className="inline-flex h-6 items-center rounded-chip bg-raised px-2 text-meta font-normal text-text"><bdi>{r}</bdi></span>)}
      </div>
      <h3 className="mt-6 mb-2 text-body font-bold">Abstract</h3>
      {paper.abstract ? (
        <>
          <p className={`prose-abstract text-abstract ${abstractOpen ? "" : "line-clamp-6"}`}>{paper.abstract}</p>
          <button type="button" onClick={() => setAbstractOpen((o) => !o)} className="mt-1 min-h-11 text-body underline underline-offset-4">
            {abstractOpen ? "Show less" : "Show full abstract"}
          </button>
        </>
      ) : (
        <p className="text-body text-text-muted">
          The publisher hasn&apos;t shared this abstract with open metadata services.{" "}
          {paper.doi && <a className="text-text underline underline-offset-4" href={doiUrl(paper.doi)} target="_blank" rel="noopener noreferrer">Read it at the source</a>}
        </p>
      )}
      <p className="mt-6 text-meta font-normal text-text-muted">Metadata: OpenAlex (CC0)</p>
    </div>
  );
}

export function OpenArticle({ paper }: { paper: FeedPaper }) {
  const safeOa = paper.oaUrl && /^https?:\/\//i.test(paper.oaUrl) ? paper.oaUrl : null;
  const href = paper.isOa && safeOa ? safeOa : paper.doi ? doiUrl(paper.doi) : null;
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="press flex h-12 flex-1 items-center justify-center gap-2 rounded-control bg-primary font-bold text-on-primary no-underline">
      {paper.isOa ? "Open free article" : "Open article"} <Icon name="ext" size={16} />
    </a>
  );
}
