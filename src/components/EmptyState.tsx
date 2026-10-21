export function EmptyState({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-border-strong bg-surface p-5">
      <p className="text-body font-bold">{title}</p>
      <p className="mt-1 text-small text-text-muted">{body}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
