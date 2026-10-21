"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Icon, type IconName } from "@/components/icons";

// 5 slots; Tools stays hidden until v1.5 (D005/D019) — flip SHOW_TOOLS, no layout change.
const SHOW_TOOLS = false;
const TABS: { href: string; label: string; icon: IconName; hidden?: boolean }[] = [
  { href: "/feed", label: "Feed", icon: "feed" },
  { href: "/", label: "Explore", icon: "explore" },
  { href: "/news", label: "News", icon: "news" },
  { href: "/tools", label: "Tools", icon: "tools", hidden: !SHOW_TOOLS },
  { href: "/saved", label: "Saved", icon: "saved" },
];

export function TabBarFallback() { return <TabBarView path={null} />; }

export function TabBar() { return <TabBarView path={usePathname()} />; }

function TabBarView({ path }: { path: string | null }) {
  const lastTap = useRef(0);
  const onActiveTap = (e: React.MouseEvent, href: string) => {
    if (href !== path) return;
    e.preventDefault();
    const now = e.timeStamp;
    const second = now - lastTap.current < 1200;      // re-tap: top; second re-tap on Explore: focus search
    lastTap.current = now;
    if (second && href === "/") document.querySelector<HTMLInputElement>("[data-search]")?.focus();
    else window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const visible = TABS.filter((t) => !t.hidden);
  return (
    <nav data-behind-sheet aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-[repeat(var(--tabs),minmax(0,1fr))] border-t border-border bg-bg lg:top-16 lg:bottom-auto lg:right-auto lg:flex lg:w-[232px] lg:flex-col lg:gap-0.5 lg:border-0 lg:px-3 lg:py-2"
      style={{ "--tabs": visible.length } as React.CSSProperties}>
      {TABS.map((t) => {
        const active = path !== null && (t.href === "/" ? path === "/" : path === t.href || path.startsWith(`${t.href}/`));
        return (
          <Link key={t.href} href={t.href} hidden={t.hidden} aria-current={active ? "page" : undefined} onClick={(e) => onActiveTap(e, t.href)}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[12px] font-medium no-underline lg:min-h-[34px] lg:flex-row lg:justify-start lg:gap-2.5 lg:rounded-control lg:px-2.5 lg:text-[14px] lg:font-normal ${active ? "text-text lg:bg-selected" : "text-text-muted"}`}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
