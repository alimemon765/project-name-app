# Step 2 design pass (in progress, 2026-10-22)

Ali asked for the five design skills on everything built in step 2. Status when the usage limit hit:

| Skill | Status |
|---|---|
| impeccable (critique + audit) | context + craft floor loaded; Assessment A (design review) and B (detector + browser) sub-agents launched; **reports not yet collected** |
| taste-skill (app screens) | lint 0/0; inspect: Explore 1 FAIL (onboarding dialog shadow: a real overlay, defensible) + 1 WARN (edge text @390); Settings 2 WARN (unused canvas, defensible: 560px form column) |
| emil-design-eng | reviewed (findings below) |
| review-animations | **cannot be started by Claude** (user-invoked only): Ali types `/review-animations` |
| break-ui | 12 worst-case scenarios × 320/412(dark)/640px shot to `.localdb/scratch/breakui/` (no horizontal overflow at any width); **screenshots not yet reviewed** |

## Findings so far (to fix next session)
1. [P1] Onboarding initial focus lands on the scroll container: a blue ring around the whole topic list (phone). Focus the heading (tabIndex -1) instead.
2. [P1] A first-time visitor opening a shared link (`/?q=…`) gets the onboarding modal on top of it. Show onboarding only on the plain Explore URL.
3. [P2] Desktop onboarding uses the right side panel and wraps topic names; use a centred dialog (~560px) on desktop.
4. [P2] Topic picker draws round radio marks for a multi-select; use square check marks. In Settings it nests bordered boxes in a bordered card; use tone-step rows.
5. [P2] Tiny uppercase tracked labels ("TOPICS" rail heading, journal group legends in the sheet): banned by taste-skill and impeccable. Sentence case.
6. [P2] Chip row on tablet loads scrolled sideways (new-since chip cut off) despite overflow-anchor:none; investigate snap-x.
7. [P3] Settings switch animates `left` (layout); use transform translateX. Dialog exit should be faster than enter (150ms). Status line and new-since count need tabular-nums. Review-page buttons need a visible "Saving…" state. FilterDialog `autoFocus` on Done shows a focus ring on mouse open.

## Emil review (Before / After)
| Before | After | Why |
| --- | --- | --- |
| switch thumb `transition-[left]` | `transform: translateX()` | animate transform only |
| dialog enter = exit 200ms | exit 150ms, enter 200ms | exit faster than enter |
| proportional digits in status line / new count | `tabular-nums` | counts change on every filter |
| onboarding reuses side-panel slide on desktop | centred dialog, opacity + scale(0.97) from center | modals stay centred |

## Assessment B (detector + browser), collected
- Source scan clean. URL scans: 6 `line-length` (desktop card abstract snippet ~110 chars/line), `overused-font` (Geist, deferred to brand), a few stragglers.
- No console errors, no overflow at 320 or 640@2x. Contrast passes everywhere (muted text on dark highlight 4.18, only if muted text ever sits in a mark).
- Phone Fast-4G + 4× CPU: FCP/LCP 1.13–1.14 s (under the 1.5 s target), CLS 0.025, 466 KB.
- [P2] Filter chips are 36px tall: below our own 44px target (P2 from steps 0–1, still open).
- [P2] Filter sheets put first focus on "Done" (same root cause as finding 7).
- [P3] Text uses px sizes, so the browser's font-size setting doesn't scale it (page zoom does).
- [P3] Logo accessible name reads "PROJECT_NAME home" (placeholder until brand).

## Assessment A (design review), collected: Nielsen 27/40
Specificity: authored for this product; Tide Ledger rules mostly held.
Fix list, in order:
1. [P0] New-since chip hidden on phone at load (row starts scrollLeft ≈236): add scroll-px-4, reset scrollLeft when baseline appears, drop snap-x (ChipRow.tsx:39).
2. [P1] Journals panel scrolls sideways (fieldset min-inline-size): min-w-0 on fieldsets (FilterPanels.tsx:17,55,70); wrap names to 2 lines instead of truncate.
3. [P1] New count can exceed the window total (cached total vs uncached count): return count and total from one request; status line uses that total.
4. [P1] Active filters invisible on phone: Clear all to the front when active; sort chip shows active when not default (ChipRow.tsx:58).
5. [P2] Zero counts at opacity-60 fail AA (FilterDialog.tsx:63, TopicRail.tsx:30): plain muted ink. Picker indicator a square check (TopicPicker.tsx:19).
6. [P2] Empty state's only exit clears everything: add "Search all topics" (keep q).
7. Also: rail sr-only ", N papers"; skip link + "/" shortcut to search; rounded-[6px] → rounded-chip; add highlight token to DESIGN.md; card snippet max 70ch; Saved empty state links to Explore; chips 44px hit area.
Questions for Ali: (a) time window as a chip on Explore ("This week ▾") instead of Settings only? (b) desktop rail vs Topics chip: drop one? (c) make "New since your last visit" the default view for returning readers?

## Ingest after this pass
arXiv: 3,999 looked at, 2,286 kept. Redo of last 2 months: EarthArXiv 351/201, ESSOAr 574/291, SSRN 44,807/8,164. Preprint precision is the C2 problem.
