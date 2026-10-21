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

const idbStorage: StateStorage = {
  getItem: async (name) => (await get<string>(name)) ?? null,
  setItem: async (name, value) => { await set(name, value); },
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
      onRehydrateStorage: () => (state) => { if (state) useSaves.setState({ sessionBaseline: state.lastVisit }); },
    },
  ),
);
