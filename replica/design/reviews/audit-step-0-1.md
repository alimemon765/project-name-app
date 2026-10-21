# /impeccable audit: build steps 0–1 (2026-10-21)

**Target:** a production build (`npm run build && npm start`) of `/`, the paper sheet, `/saved`, `/settings` and `/offline`.

**Evidence:**
- Impeccable detector (live URL + source)
- Playwright on Chrome (Pixel 7 + 1280px), 8 passed
- headless CDP screenshots at 390 and 1280px, light and dark
- the ECC code-reviewer report (0 critical, 3 high, 12 medium, 8 low)

## Audit Health Score
| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 3 | Fixed: skipped heading level; sheet background reachable by Tab and screen readers. Open: filter chips are 36px tall (WCAG 2.5.8 passes at 24px, but our own 44px rule doesn't) |
| 2 | Performance | 3 | Fixed: regex compiled per work, sequential feed queries. Open: full abstracts ship in the feed payload |
| 3 | Theming | 4 | Tokens only (generated from tokens.json); light/dark/system work; contrast 78 pairs × 2 themes, 0 failures. Hex only in the manifest and OG icons, where CSS vars can't reach |
| 4 | Responsive | 3 | Fixed: desktop sidebar overlap, unbounded line length (feed capped at 820px). Sheet drag tested with synthetic pointer events only; real-phone test pending (B5) |
| 5 | Implementation integrity | 3 | Coherent Ledger system; the detector flags Geist as an overused font (deferred to /replica-brand) |
| **Total** | | **16/20** | **Good** |

## P0 / P1: all fixed in steps 0–1
- [P1] Skipped heading level (h1 → h3). Card titles are now h2.
- [P1] Sheet background reachable by Tab and screen readers. Background is now `inert`; the sheet is portalled to `<body>`.
- [P1] Sheet re-opening on a parent re-render. The close handler is now stable.
- [P1] Service worker cached error and redirect responses. It now caches only ok + same-origin responses, from an allow-list, capped.
- [P1] Desktop sidebar links overlapping. Fixed.

## P2 / P3: logged, with owner step
| Sev | Issue | Fix in |
|---|---|---|
| P2 | Chip hit areas below our 44px rule | step 2 (filter chips) |
| P2 | Back button doesn't close the sheet; no history entry | B3 (this session) |
| P2 | Fast navigation after Save can drop the IndexedDB write | B4 (this session) |
| P2 | iOS scroll lock via `overflow: hidden` | step 3 |
| P2 | Saved snapshots not migrated or refreshed for retractions | step 3 / step 8 |
| P2 | `'use cache'` never revalidated by the worker | step 2 (revalidate route) |
| P2 | Feed ships full abstracts | step 2 |
| P3 | Geist flagged as an overused font | /replica-brand |
| P3 | Freshness label reads "GMT+5:30" in en-US locales | step 2 (status line) |
| P3 | Theme radiogroup lacks arrow-key navigation | step 6 (Settings) |

**Suggested next commands:**
- `/impeccable harden`: sheet history, scroll lock, error states
- `/impeccable adapt`: chip hit areas
- `/impeccable polish`: before deploy
