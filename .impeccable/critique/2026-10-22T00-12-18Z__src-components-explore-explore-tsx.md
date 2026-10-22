---
target: step 2 Explore UI
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/Users/ali/coastal-hub/src/components/explore/Explore.tsx"
target_fingerprint: "sha256:f4026918b20e6a8a0e31c332120b32dce3dc2c9fb77cb0ffc5777d48d31a2aed"
target_path: /Users/ali/coastal-hub/src/components/explore/Explore.tsx
timestamp: 2026-10-22T00-12-18Z
slug: src-components-explore-explore-tsx
---
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
