# Build log

| ID | date | status | what's missing | harder than expected |
|---|---|---|---|---|
| step 0: vertical slice | 2026-10-21 | done | Search, filters and sorts (step 2); References/Cited by/Similar (step 3) | OpenAlex `from_created_date` is paid → re-designed ingest around a publication-date window. First real run found 2 worker bugs (same-hour rerun, connection leak) and a budget-guard bug, all now covered by tests |
| S02 Explore feed | 2026-10-21 | partial | Search, Topic/Journal/Region sheets, Most cited/Trending, infinite scroll, pull-to-refresh (step 2) | Cache Components needs Suspense around any dynamic data, including the tab bar's `usePathname` |
| S03 Paper sheet | 2026-10-21 | partial | Connections, author links, share, preprint banner (steps 3, 7) | Keeping the action bar on the visible edge at the 60% detent |
| S08 Saved | 2026-10-21 | done (local) | Account sync (step 7) | A full-page navigation within ms of saving can drop the IndexedDB write. Mitigation: flush on `pagehide` (step 3) |
| S09 Settings | 2026-10-21 | partial | Only theme for now; windows, topics, journals (step 6) | — |
| step 1: shell + PWA | 2026-10-21 | done | Install prompt + iOS instructions (step 7), Web Push (step 7) | Next 16 is not the Next we know: read node_modules/next/dist/docs first |

Classifier note: keyword-only layer 1 admits off-topic papers (lightning strokes, microplastics). Precision is tuned in step 9 against the 200-paper eval (targets P ≥ 0.85, R ≥ 0.70 per topic, D017).
