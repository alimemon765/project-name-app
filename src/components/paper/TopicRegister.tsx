import { GLYPHS, TOPICS, TOPIC_IDS } from "@/lib/topics";

// Gauge's 13-slot register (D024): fixed slot per topic, shape + hue + names; never colour alone.
export function TopicRegister({ topicIds: raw, named = 2 }: { topicIds: number[]; named?: number }) {
  const topicIds = raw.filter((t) => t in TOPICS);           // ignore ids outside the 13 known topics
  const on = new Set(topicIds);
  const names = topicIds.slice(0, named).map((t) => TOPICS[t]);
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-0.5" role="img" aria-label={`Topics: ${topicIds.map((t) => TOPICS[t]).join(", ") || "none"}`}>
      {TOPIC_IDS.map((id) => (
        <span key={id} className="grid size-3 flex-none place-items-center" style={{ color: `var(--c-topic-${id})` }}>
          {on.has(id)
            ? <svg viewBox="0 0 10 10" width={10} height={10} fill="currentColor" aria-hidden="true" dangerouslySetInnerHTML={{ __html: GLYPHS[id] }} />
            : <span className="size-[3px] rounded-full bg-border-strong" aria-hidden="true" />}
        </span>
      ))}
      {names.length > 0 && (
        <span className="ml-2 min-w-0 text-meta font-normal text-text-muted" aria-hidden="true">
          {names.join(" · ")}{topicIds.length > named ? ` +${topicIds.length - named}` : ""}
        </span>
      )}
    </div>
  );
}

/** One topic's glyph in its register hue (constant SVG paths from lib/topics, not data). */
export function TopicGlyph({ id, size = 10 }: { id: number; size?: number }) {
  return (
    <svg viewBox="0 0 10 10" width={size} height={size} fill="currentColor" aria-hidden="true" className="flex-none"
      style={{ color: `var(--c-topic-${id})` }} dangerouslySetInnerHTML={{ __html: GLYPHS[id] }} />
  );
}
