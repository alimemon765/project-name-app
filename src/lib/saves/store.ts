"use client";
// Device-local saves (works signed out). Persisted to IndexedDB; merged into the account on sign-in (step 7).
import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";
import type { FeedPaper } from "@/lib/papers/types";

export interface SavedPaper { paper: FeedPaper; savedAt: string }

interface SavesState {
  saved: Record<string, SavedPaper>;
  lastVisit: string | null;          // ISO; set when the feed is left (persisted)
  sessionBaseline: string | null;    // lastVisit as it was when this session loaded (not persisted)
  toggle: (paper: FeedPaper) => boolean;
  markVisited: (at: string) => void;
}

// Write-ahead journal: IndexedDB writes are async and a full navigation right after Save can cut them off.
// Each change is mirrored synchronously to localStorage and cleared once IndexedDB confirms; on the next load an
// unflushed journal wins over the (older) IndexedDB copy.
const JOURNAL_KEY = "ph-saves-journal-v1";
interface Journal { saved: Record<string, SavedPaper>; at: number }

function readJournal(): Journal | null {
  try { const raw = localStorage.getItem(JOURNAL_KEY); return raw ? (JSON.parse(raw) as Journal) : null; } catch { return null; }
}
function writeJournal(saved: Record<string, SavedPaper>): void {
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify({ saved, at: Date.now() } satisfies Journal)); } catch { /* storage full or blocked: IndexedDB path still runs */ }
}

const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => {
    const journalAtStart = readJournal()?.at;
    await set(name, value);
    // Clear only the journal this write covered; a newer toggle may have journaled meanwhile.
    try { if (readJournal()?.at === journalAtStart) localStorage.removeItem(JOURNAL_KEY); } catch { /* ignore */ }
  },
  removeItem: async (name) => { await del(name); },
};

export const useSaves = create<SavesState>()(
  persist(
    (setState, getState) => ({
      saved: {},
      lastVisit: null,
      sessionBaseline: null,
      toggle: (paper) => {
        const isSaved = Boolean(getState().saved[paper.id]);
        setState((s) => {
          const next = { ...s.saved };
          if (isSaved) delete next[paper.id];
          else next[paper.id] = { paper, savedAt: new Date().toISOString() };
          writeJournal(next);                                   // synchronous: survives an immediate navigation
          return { saved: next };
        });
        return !isSaved;
      },
      markVisited: (at) => setState({ lastVisit: at }),
    }),
    {
      name: "ph-saves-v1", storage: createJSONStorage(() => idbStorage), version: 1,
      partialize: (s) => ({ saved: s.saved, lastVisit: s.lastVisit }),
      // Freeze the previous visit as this session's "new since" baseline the moment storage is read.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const journal = readJournal();                           // replay a change IndexedDB never received
        useSaves.setState({ sessionBaseline: state.lastVisit, ...(journal ? { saved: journal.saved } : {}) });
      },
    },
  ),
);
