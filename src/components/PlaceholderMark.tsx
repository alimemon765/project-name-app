// Placeholder app mark until /replica-brand: an ink square on fog (tokens: bg #f2f4f7, text #0a0a0a).
export function PlaceholderMark({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const inner = Math.round(size * (maskable ? 0.42 : 0.56));
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#f2f4f7" }}>
      <div style={{ width: inner, height: inner, borderRadius: Math.round(inner * 0.22), background: "#0a0a0a" }} />
    </div>
  );
}
