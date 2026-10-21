// Outline icons (own drawings, 24px grid, 1.5 stroke). aria-hidden: every use has a text label or aria-label.
const PATHS = {
  feed: <path d="M4 6h16M4 12h16M4 18h10" />,
  explore: <><circle cx="12" cy="12" r="8.5" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  news: <><path d="M5 5h11v14H6a1 1 0 0 1-1-1zM16 9h3v9a1 1 0 0 1-1 1h-2" /><path d="M8 9h5M8 12h5M8 15h3" /></>,
  saved: <path d="M7 4h10v16l-5-3.5L7 20z" />,
  tools: <path d="M14 6a4 4 0 0 0-5 5l-5 5 3 3 5-5a4 4 0 0 0 5-5l-2.5 2.5-2-1-1-2z" />,
  share: <path d="M12 4v11M8 8l4-4 4 4M6 13v6h12v-6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  copy: <><rect x="8" y="8" width="11" height="11" rx="1.5" /><path d="M5 15V5h10" /></>,
  ext: <path d="M14 5h5v5M19 5l-8 8M17 14v5H5V7h5" />,
  user: <><circle cx="12" cy="9" r="3.5" /><path d="M5.5 19c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  chevron: <path d="m7 10 5 5 5-5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={filled ? "currentColor" : "none"} stroke="currentColor"
      strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
      {PATHS[name]}
    </svg>
  );
}
