# Component specs: PROJECT_NAME (Ledger + topic register, D024)

Every value below is a token from [`tokens.json`](tokens.json); components use role classes (`bg-surface`, `text-text-muted`, `rounded-card`), never hex. States listed are the minimum each component ships with. **Bold rules marked `[break-ui #n]`** come from the worst-case run at the end of this file and are not optional.

Global rules:
- **Touch targets:** at least 44×44px. Inputs use 16px text.
- **Numbers:** tabular figures everywhere; `Intl.NumberFormat` and `Intl.PluralRules` (never hand-written plurals).
- **Names:** every person or journal name is isolated with `<bdi>` (mixed-script names keep their own direction).
- **Focus:** `:focus-visible` shows a 2px `focus` ring at 2px offset. Mouse focus shows nothing extra.
- **Motion:** press feedback scales to `press-scale.*` over `duration.press` on `ease.out`. Sheets use springs (`motion.spring.*`). With reduced motion, sheets cross-fade (`motion.reduced.fade`) and press scale is off.
- **Hover:** hover styles apply only inside `@media (hover: hover) and (pointer: fine)` (no sticky hover on touch).
- **Never shown:** shimmer gradients, spinners on content, or a shadow on anything at rest.

---

## PaperCard
- **Layout:** `surface` card, 1px `border`, `radius.card`, padding 14/8/14/14.
  1. **Meta row:** publisher monogram (28px, `raised`, `meta` 700) · journal abbreviation (`body` 500, ink) · relative date · new-dot (8px `accent`) · spacer · share (40px) · save (40px).
  2. **Title:** `card-title` serif.
  3. **Authors:** `small`, `text-muted`.
  4. **Topic register:** 13 slots (`register.*`), then up to 2 topic names in `meta` + "+N".
  5. **Badges row:** Retracted · Preprint · Open access · "1,234 citations".
- **States:**
  - default;
  - hover (pointer only): border → `border-strong`;
  - pressed: scale 0.99 over 120ms;
  - focus-visible: ring on the card (the card is a link to `/paper/[doi]`, intercepted into the sheet);
  - new: dot + `aria-label` "New since your last visit";
  - saved: bookmark filled, `aria-pressed=true`;
  - loading: Skeleton card at the same height;
  - offline: unchanged if cached; the save action queues.
- **Truncation:**
  - title wraps, **clamped at 4 lines on cards** (the full title is in the sheet and the `title` attribute) `[break-ui #6]`;
  - authors wrap, at most 2 lines;
  - journal abbreviation ends in an ellipsis, with the full name in `title` and the accessible name;
  - the **date never truncates or wraps** (`white-space:nowrap; flex:none`) `[break-ui #4]`.
- **Meta row at narrow widths:** at ≤340px CSS width (including 200% zoom), the meta row wraps: monogram + abbreviation on line 1, date + dot on line 2. Share/save stay top-right and never shrink `[break-ui #4]`.
- **Data rules:**
  - the **abbreviation comes from `journals.abbreviation`** (ISO 4), never the full name `[break-ui #9]`;
  - a citation count of 0 shows "0 citations" in muted; counts never abbreviate (12,483, not 12.5k).
- **A11y:**
  - an `<article>` with the title as the link text; share and save are separate buttons with labels;
  - the register is `role="img"` with an `aria-label` listing every topic name.
- **Used on:** S02, S07, S08.

## TopicRegister (from Gauge, D024)
- **Layout:** 13 fixed slots in topic-id order, `slot` 12px, `gap` 2px.
  - A tagged slot shows the topic glyph (10px) in `topic-N`; an empty slot shows a 3px `border-strong` dot.
  - Then the top 2 topic names by confidence, `meta` `text-muted`, plus "+N".
- **Rules:**
  - colour is never the only code: shape + fixed position + the names next to it + `aria-label`;
  - all 13 tagged is a valid state (holds);
  - the names wrap under the slots on narrow widths, and that's intended.
- **Used on:** PaperCard, ToolCard (v1.5, the tool's topics).

## PaperSheet
- **Topology:**
  - **Phone:** bottom sheet at 92dvh, detents 60% / 100%, `sheet` background, `radius.sheet` top corners, `elev.float`, scrim at `scrim-opacity`.
  - **≥1024px:** a right panel `min(560px, 44vw)`, the feed stays visible, the scrim is lighter.
  - The route is `/paper/[doi]` (a full page when reached directly or shared).
- **Content order:**
  1. header (close · share · save);
  2. **retraction banner** when `retraction_status ≠ none` (danger-tint panel, plain words + notice link), above everything else `[break-ui #1]`;
  3. preprint ↔ published banner when linked;
  4. venue (`small` muted, wraps);
  5. title (`sheet-title`, balanced);
  6. **date row**;
  7. **DOI row** (DOILine);
  8. AuthorList;
  9. badges;
  10. topic chips (max 4, then "+N more"; expands in place) `[break-ui #3]`;
  11. region chips;
  12. Abstract (`abstract`, `prose-abstract`, 6-line collapse with "Show full abstract");
  13. ConnectionsList;
  14. v1.5 Code & data;
  15. source line.
- **Sticky action bar:** primary "Open article ↗" ("Open free article ↗" when OA).
  - It counter-translates by the detent offset, so it always sits on the visible bottom edge (fixed in the prototype; must carry into the build).
  - Bookmark and share are duplicated in the header.
- **Gestures (phone):**
  - drag from the handle, header, or content when scrolled to top;
  - 8px threshold; 1:1 tracking; rubber-band past the top;
  - release projects with deceleration 0.998, snaps to the nearest detent or dismisses;
  - velocity handoff; a flick > 600px/s uses `sheet-flick`;
  - interruptible (grab mid-flight); pointer capture; multi-touch ignored after the first pointer.
- **States:**
  - opening/closing;
  - loading connections (counts as skeleton bars, the sheet never blocks);
  - no abstract (honest sentence + source link; holds);
  - connections unavailable (budget cap: "Connections are cached; try again later");
  - offline (saved papers fully readable, connections hidden with a one-line note);
  - error (fetch failed: the inline message keeps the cached view).
- **A11y:**
  - `role="dialog"` `aria-modal` labelled by the title;
  - focus moves to close on open and returns to the card on close;
  - Esc closes; the focus trap is inside the sheet.
- **Used on:** S03.

## AuthorList
- **Collapsed:** the first 8 names, then a "Show all N authors" button on its own line.
  - **No trailing comma before it**: separators are drawn between names, never after the last visible one `[break-ui #5]`.
- **Expanded:** all names in place; a "Show fewer" button returns focus to it.
- **Names:**
  - each in `<bdi>`; Arabic, Devanagari, CJK and Vietnamese render in place (holds);
  - each name links to the author page when an OpenAlex author ID exists; otherwise plain text;
  - 1 author: no "et al.", no list chrome (holds).
- **Card variant:** "A, B, C and N others", with correct pluralisation ("and 1 other").

## DOILine
- **Layout:** its own row, `doi` in `font-mono` `small`.
  - `overflow-wrap:anywhere` (`min-width:0`), with the copy button (32px, `flex:none`) **on the same row, top-aligned** `[break-ui #2]`.
  - The date lives on the row above, so no orphaned "·" separators `[break-ui #2]`.
- **Copy:** writes `https://doi.org/<doi>`; Sonner toast "DOI copied"; `aria-live` polite.
- **Long and odd DOIs** (SICI with `<>;`) are escaped once at render (holds) and stay fully copyable.

## ConnectionsList
- **Rows:** References · Cited by · Similar papers. Each row is 48px: label, count (tabular, right-aligned), chevron. Rows sit on a `raised` well with `border-strong` rules.
- **Tap:** opens a nested sheet (or a pushed panel on desktop) listing papers as compact PaperCards (no register). Papers outside our corpus show title · journal · year + a DOI link.
- **States:**
  - count loading (bar skeleton);
  - zero ("0" printed; the row is tappable only when > 0);
  - capped by budget (row disabled with the reason in words);
  - error per row (Retry text button).

## FilterChip · NewSinceChip · SortMenu · BottomSheetSelect
- **FilterChip:** 36px tall, `radius.chip`, `surface` + 1px `border`; label + chevron.
  - Active value is shown in the label ("Region: South Asia") with an ink border; pressed scale 0.97.
  - Lives in the sticky ChipRow: horizontal scroll, snap, no visible scrollbar, 16px trailing pad.
  - The last chip is deliberately cut at the edge as the scroll cue (defended in taste inspect).
- **NewSinceChip:**
  - the first chip in the row; the count is in `accent` 700, then "new since <weekday date>";
  - toggles `aria-pressed`, filtering to new only;
  - **at 0 the count is muted, not accent, and the chip reads "Nothing new since …"** `[break-ui #7]`.
- **SortMenu:** Newest / Oldest / Most cited / Trending (all free), plus a "How sorting works" disclosure written in our words. A popover on desktop, BottomSheetSelect on phone.
- **BottomSheetSelect:**
  - **Phone:** the same sheet engine at a single fitted detent, radio rows 48px, hierarchy indented 16px per level, counts tabular and right-aligned, zero counts printed in muted (holds), "Done" closes.
  - **Desktop:** a popover anchored to the chip (origin top-left, scale 0.98 → 1, 150ms `ease.out`), Esc and outside click close.
  - Roving focus with arrow keys; `role="radiogroup"`.

## TabBar (5 slots, Tools hidden until v1.5)
- **Phone:**
  - fixed bottom, 56px + safe-area inset, 4 visible tabs (Feed, Explore, News, Saved) evenly spaced;
  - the Tools slot is rendered with `hidden` behind flag `nav.tools`;
  - icon 20px outline 1.5 + `meta` label; active = ink, inactive = `text-muted`.
- **Desktop:** the left sidebar (232px) with labelled rows of 34px; active = `selected` fill, radius 8.
- **Behaviour:** re-tapping the active tab scrolls to top; a second re-tap on Explore focuses search (the one-handed route, shape brief).
- **A11y:** `<nav aria-label="Main">`; `aria-current="page"`.

## Header (with avatar)
- **Layout:**
  - 56px, `bg`, sticky; wordmark left;
  - **wordmark `min-width:0` with ellipsis, avatar 44px `flex:none`** `[break-ui #8]`;
  - the avatar opens Settings (sheet on phone, page on desktop).
- **Title row:**
  - h1 + freshness line ("Updated 14:05 IST · 1,204 papers", `small` muted);
  - Papers | Journals SegmentedControl on the right;
  - **the row wraps: below 360px the segmented control moves under the title** `[break-ui #8]`.
- **Signed out:** the avatar is a person glyph labelled "Account and settings".
- **Offline:** a one-line `info` banner under the header: "Offline · showing saved and cached papers".

## SearchField
- 44px phone / 36px desktop, `raised` fill, leading search icon, 16px input text.
- **Placeholder "Search papers"**: short enough to never clip mid-word at 320px or 200% zoom `[break-ui #10]`. The full scope ("titles, abstracts, authors") goes in `aria-describedby`.
- **States:** focus (ring), typing (clear button appears), no results (EmptyState echoing the query), loading (inline progress text, no spinner).

## Toggle
- 32×20 (hit area 44), on = ink fill (not the accent), off = `border-input` track.
- The label is on the left. Disabled stays legible and says why.

## TopicChip · OA badge · Preprint badge · Retracted badge
- **TopicChip:** 24px tall, `radius.chip`, `topic-N-tint` fill + `topic-N` text + glyph. `nowrap`, `flex:none`. Max 4 shown in the sheet, then "+N more".
- **OA badge:** `badge-oa-*`, "Open access" (+ " · CC BY" when the licence is known).
- **Preprint badge:** `badge-preprint-*`, "Preprint".
- **Retracted badge:**
  - `badge-retracted-*`, "Retracted" / "Corrected" / "Expression of concern";
  - always the first badge;
  - the sheet adds the banner `[break-ui #1]`.

## Toast (Sonner)
- **Placement:** bottom-centre above the tab bar on phone, bottom-right on desktop. `surface` + 1px border + `elev.pop`, `radius.pop`.
- **Uses:** "Saved" (with Undo), "DOI copied", "Update available · Reload", "You're offline". Max 3 visible.
- **Behaviour:** reduced motion fades only; `aria-live` polite.

## EmptyState
- **Layout:** keeps the block's frame. A 1px dashed `border-strong` box, `radius.card`, a title (`body` 600) + one sentence (`small` muted) + at most one action.
- **Copy names the actual filters** (holds). It never shows an illustration or emoji.
- **Variants:**
  - no results;
  - Saved empty ("Tap the bookmark on any paper to keep it here", our wording);
  - Feed signed out (topic preview + sign-in row);
  - offline with nothing cached.

## Skeleton
- The final layout with flat `raised` bars at real sizes: title 2 lines × 18px, authors 13px, register 12px. No shimmer, no layout shift when data lands.
- Infinite scroll appends 3 skeleton cards.

## ToolCard (v1.5)
- **Layout:** same card frame as PaperCard.
  1. **Meta row:** category · language · licence (SPDX) · maintenance dot (active `success`, slowing `warning`, stale `text-muted`) with the word.
  2. **Name:** sans `body` 600 (tools aren't papers, so no serif).
  3. Our own one-line description (`small`, 2-line clamp).
  4. TopicRegister.
  5. **Stats row (tabular):** "★ 1,204 · updated 3 weeks ago · v2.4.1".
  6. "Used in N papers".
- **States:** default, hover, focus, unverified (neutral badge), archived (muted + badge), skeleton.

## ToolPage (v1.5)
- **Layout:**
  - header: name, description, category;
  - actions: Repo ↗ · Docs ↗;
  - **install snippets** in a tabbed code block (pip / conda / docker; shiki, `font-mono`, copy button);
  - facts table: licence, language, stars, forks, last commit, release, DOI;
  - "Papers that use this tool" (PaperCards with evidence: "DOI cited in abstract", "GitHub link in Crossref relation");
  - Compare toggle (max 3).
- **States:** loading, stale stats ("Stats from 12 Oct"), no linked papers yet (EmptyState), repo gone (archived banner).

---

## break-ui report (2026-10-21)

- **Target:** the Ledger + register prototype (`replica/design/directions/proto/?v=3`).
- **Toggle:** dev-only, bottom-centre: **Demo data / Worst case / Empty / One** (`?data=`). It never ships.
- **Worst-case fixture** (`scripts/research/build_design_fixtures.py`):
  - a 40-word title; 33 authors incl. 李明华, प्रिया देशमुख, مریم احمدی, Ngô Thị Hồng, Ólafur Þórsson;
  - a real-pattern Wiley SICI DOI `10.1002/(sici)1099-1085(199910)13:14/15<2343::aid-hyp904>3.0.co;2-l`;
  - the longest journal name in our list; a one-word title; 1 author; 12,483 citations; all 13 topics; retracted; no abstract.
- **Checked at:**
  - 390px, 320px, 1280px, and 200% zoom (195px CSS at 4×);
  - light and dark;
  - an automated overflow probe (0 elements past the viewport at every size).
- **Captures:** `replica/design/reviews/break-ui/`.

### What broke
| # | Severity | Field | Worst-case value | What happens | Fix (spec above) |
|---|---|---|---|---|---|
| 1 | **Broken** | `retraction_status` | retracted paper | The card shows "Retracted", but **the sheet shows nothing**: a retracted paper reads as normal at the moment someone decides to cite it | Retraction banner first in PaperSheet, danger-tint, with notice link |
| 2 | Ugly | `doi` | SICI DOI | The date row ends on an orphaned "·"; the DOI wraps and pushes the copy button onto a line of its own | Date and DOI on separate rows; DOI `min-width:0; overflow-wrap:anywhere`, copy `flex:none` on the same row |
| 3 | Ugly | `topics` | all 13 | 13 chips (+ region) push the abstract below the first screen of the sheet | Max 4 chips + "+N more" (expands in place); the register already shows all 13 |
| 4 | Ugly | meta row | 200% zoom | Abbreviation truncates to "E."; date wraps to "30 / Sep" | Date `nowrap; flex:none`; meta row wraps to two lines at ≤340px |
| 5 | Ugly | AuthorList | 33 authors | "Author 8," leaves a trailing comma before "Show all 33 authors" | Separators drawn between names only; "Show all" on its own line |
| 6 | Ugly | `title` (card) | 40 words | 10 lines at 320px, one card fills the screen | Clamp card titles at 4 lines (full in sheet + `title`) |
| 7 | Ugly | NewSinceChip | 0 new | "0" set in the accent hue: a zero styled as a signal | Muted zero, "Nothing new since …" |
| 8 | Ugly | header / title row | 200% zoom | The avatar is pushed past the edge; Papers/Journals is clipped at the right | Wordmark `min-width:0` + ellipsis, avatar `flex:none`; title row wraps |
| 9 | Fragile | `journal.abbr` | journal without an abbreviation | The full journal name fills the abbreviation slot; at narrow widths the date gets squeezed | Add `abbreviation` (ISO 4) to every row of `data/journals.json`; the `journals` table already requires it |
| 10 | Ugly | SearchField | 320px | Placeholder clipped mid-word ("…autho") | Placeholder "Search papers"; full scope in `aria-describedby` |
| 11 | Fragile | counts | header 23 vs rail 20 | The same fact computed in two places disagrees (the prototype's rail excluded fixtures) | One variable per fact: feed count, new count and rail totals come from the same query result |

### Decisions for you (my recommendation first)
- **Card title:** clamp at 4 lines *(recommended: keeps scanning speed; the sheet shows it all)*, or always wrap fully.
- **Sheet topic chips:** 4 + "+N more" *(recommended)*, or show all.
- **Long feed:** Virtuoso virtualisation *(recommended, D008)*, or numbered pages. It's infinite scroll either way for the user.

### What held up
- No horizontal overflow anywhere: 320px, 200% zoom, desktop.
- Non-Latin and RTL names render correctly and keep their own direction in lists.
- A 12,483 citation count is formatted with a separator; plurals are right for 1 (one author, "and 1 other", "1 paper").
- The no-abstract state is honest, with a source link.
- All 13 topics in the register stay readable; the shape code works in dark.
- The empty feed keeps its frame and names the filters.
- Zero region counts are printed, not hidden.
- A one-word title, a single author, and a 37-character preprint DOI render fine.
