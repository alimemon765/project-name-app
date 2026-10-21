import Link from "next/link";
import { Suspense } from "react";
import { TabBar, TabBarFallback } from "./TabBar";
import { Icon } from "@/components/icons";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:pl-[232px]">
      <header data-behind-sheet className="pt-safe sticky top-0 z-20 bg-bg lg:fixed lg:left-0 lg:top-0 lg:w-[232px]">
        <div className="flex h-14 items-center gap-3 px-4 lg:px-5">
          <Link href="/" className="flex min-w-0 items-center gap-2 font-bold text-input no-underline text-text" aria-label="PROJECT_NAME home">
            <span className="size-[18px] flex-none rounded-[5px] bg-text" aria-hidden="true" />
            <span className="truncate">PROJECT_NAME</span>
          </Link>
          <span className="flex-1" />
          <Link href="/settings" aria-label="Account and settings"
            className="press grid size-11 flex-none place-items-center rounded-full text-text lg:fixed lg:right-6 lg:top-3">
            <Icon name="user" />
          </Link>
        </div>
      </header>
      <Suspense fallback={<TabBarFallback />}><TabBar /></Suspense>
      <main data-behind-sheet className="px-4 pb-[calc(72px+env(safe-area-inset-bottom))] lg:mx-auto lg:max-w-[1180px] lg:px-8 lg:pb-12">{children}</main>
    </div>
  );
}
