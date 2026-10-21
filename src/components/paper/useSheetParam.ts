"use client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

// The open paper sheet lives in the URL (?paper=<id>), so browser Back and Android back gestures close it,
// and a shared link reopens it. Next 16 syncs native pushState/replaceState with useSearchParams.
export function useSheetParam(): { openId: string | null; open: (id: string) => void; close: () => void } {
  const openId = useSearchParams().get("paper");
  const pushedByUs = useRef(false);

  // Back (popstate) already removed the entry we pushed; forget it so a later close doesn't go back twice.
  useEffect(() => { if (!openId) pushedByUs.current = false; }, [openId]);

  const open = useCallback((id: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("paper", id);
    window.history.pushState(null, "", `?${params.toString()}`);
    pushedByUs.current = true;
  }, []);

  const close = useCallback(() => {
    if (pushedByUs.current) {                               // pop our own entry: no dead "sheet" step in history
      pushedByUs.current = false;
      window.history.back();
      return;
    }
    const params = new URLSearchParams(window.location.search);   // opened from a shared link: drop the param in place
    params.delete("paper");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, []);

  return { openId, open, close };
}
