# Shape brief: feed, paper sheet, navigation

Status: **for Ali's confirmation at CHECKPOINT (b)**. Built from PRODUCT.md, recon.md and D004–D006. No visual direction here: palette, type and motion come from `/replica-design` (taste-skill app-screens mode + prototypes). Assumptions are marked (A).

Mode for all three surfaces: **Operate** (the visitor completes a task). Ambition shows as precision and restraint. The familiar patterns (tab bar, bottom sheet, chips) stay.

## 1. Navigation

- **Job:** get between "what's new for me", "browse everything", "field news", "code & data" and "my saved papers" with one thumb.
- **Structure:** a bottom tab bar with 5 slots, **Feed · Explore · News · Tools · Saved**. In v1 Tools is hidden (D005), so 4 visible tabs. The flag `nav.tools` flips at v1.5 with no layout change.
- **Header:** product mark (left), status line in our own format, e.g. "Updated 14:05 IST · 1,204 papers this month", in the user's own time zone, avatar/profile button (right) → Settings sheet/page. Signed out, the avatar shows a neutral person glyph with the accessible name "Account and settings".
- **Within tabs:** Explore = segmented Papers | Journals. Tools = segmented Catalogue | Lab (Lab arrives v2; before that the segment is hidden, not disabled).
- **Re-tap behaviour (A):** re-tapping the active tab scrolls to top; a second re-tap on Explore focuses search. This is the one-handed route to search.
- **States:** signed in/out (avatar), offline (a quiet banner under the header: "Offline · showing saved and cached papers"), update available (PWA toast via Sonner, non-blocking).

### One-handed check (375×812 and 430×932 portraits, right and left thumb)

| element | zone | verdict | action |
| --- | --- | --- | --- |
| Tab bar (4–5 items, ≥64 pt wide each, 49 pt + safe area tall) | natural | pass | — |
| Paper cards (tap to open) | natural → stretch | pass | whole card is the hit target; share/bookmark ≥44 pt |
| Bookmark on card (top-right of card) | stretch at the top of the screen | pass with care | duplicate in the sheet's bottom action bar |
| Search field (top) | hard | **fix** | re-tap Explore focuses search; when the field is focused, the keyboard brings results into the natural zone |
| Sort / filter chips (top, horizontally scrolling) | hard | **fix** | the chip row is sticky and collapses on scroll down / reappears on scroll up; each chip opens a **bottom** sheet with all its choices in the lower half |
| Avatar → Settings (top-right) | hard | accept | low-frequency action; a standard pattern Ali asked for |
| Paper sheet primary action | natural | pass | "Open article" is pinned in a bottom action bar inside the sheet |
| Sheet dismiss | natural | pass | drag down anywhere on the handle/header; a close button for non-gesture users; Esc on desktop |

Result: it works one-handed once the two fixes are in. Both are written into the component specs for `/replica-design`.

## 2. Explore feed (Papers)

- **Job:** in under a minute, see what's new in my topics and decide what to open. Success = 2 taps to an abstract (beat or match the reference).
- **Hierarchy (top → bottom):** header + status line → segmented Papers | Journals → search → sticky control row [Sort ▾ · Topic · Journal · Region · "New 12" toggle chip] → card list.
- **PaperCard content, in reading order:** venue abbreviation with a venue-group colour mark · date · new-dot → **title (the dominant element, full, never truncated below 3 lines on phone; clamp at 4 with a fade)** → authors ("Cao, Li & 28 others"; empty is fine) → badges row: OA · Preprint · Retracted/Corrected (v1 if Crossref gives it) · up to 3 topic chips + "+2". Card actions: share, bookmark (≥44 pt).
- **Density:** one column on phone, 2 at ≥768 px, 3 at ≥1280 px, max line length about 70ch. Phone target: 2.5–3 cards per viewport.
- **Sort:** Newest (default), Oldest, Most cited, Trending, all free. An info disclosure explains each sort in our own words, including why there's no views sort.
- **"New since last visit":** a dot on cards first seen after the last visit plus a toggle chip with the count. Last visit is stored per device and, when signed in, per account.
- **States:** first-run (onboarding sheet over a skeleton feed) · loading (skeleton cards, no spinners) · filled · infinite-scroll loading (inline skeletons) · end of window ("That's everything from the last 30 days · widen the window", which goes to Settings) · zero results (names the active filters with one-tap removal) · offline (cached feed + banner) · error (retry; keeps the stale list visible) · pull-to-refresh.
- **Ranges for break-ui:** title 4–40 words, authors 0–300, topics 0–13, venue name 3–90 chars, DOIs with long suffixes, non-Latin names, citation counts 0–100k.
- **Anti-goals:** endless engagement mechanics, streaks, unread-count anxiety (the count is opt-in visibility, not a badge on the tab), heavy motion, decorative imagery in the feed.

## 3. Paper sheet

- **Job:** decide whether this paper is worth reading, then act: read at source, save, share, follow, or follow a connection.
- **Topology:** a bottom sheet on phone (detents: about 60% → full; drag to dismiss; background scale-down only if it holds 60fps). A right-side panel on ≥1024 px (the feed stays visible and scroll position is kept). Each paper also has a full page at `/paper/[doi]` for SEO and sharing; the sheet is that route intercepted.
- **Content order:** venue full name (small caps) · title · date · DOI (copyable, mono) · authors (expandable; each links to the author page, follow button) · badges (OA + licence, preprint ↔ published link, retraction notice in plain words at the top when present) · topic + region chips · **Abstract** (full if short; otherwise expandable in place; "Abstract continues at the publisher ↗" when the source truncates it) · **Research connections** (free): References (n) · Cited by (n) · Similar (n), each opening a nested list sheet · v1.5: **Code & data for this paper** · v2: AI section (Premium; says "from abstract only" when relevant).
- **Bottom action bar (sticky):** primary "Open article ↗" (or "Open free PDF ↗" when OA) · bookmark · share.
- **States:** loading connections (counts as skeletons; the sheet never blocks on them) · no abstract ("The publisher didn't share an abstract with open metadata services" + link) · connections unavailable (budget cap: "Connections are temporarily cached; try later") · retracted · preprint with published version (banner linking to it) · offline (saved papers fully readable; connections hidden).
- **Anti-goals:** a modal that traps focus without Esc; a hidden primary action; AI content above the abstract.

## Constraints and open decisions

- Platform: web PWA, iOS Safari + Android Chrome first-class. Respect safe areas and the 100vh issue; 16 px inputs to stop zoom on focus.
- WCAG 2.2 AA; full keyboard path (tab order: header → controls → cards; the sheet traps focus while open and returns it to the card on close).
- Reusable components: TabBar, AppHeader, SegmentedControl, SearchField, ChipRow, BottomSheet (shared by filters, sort and the paper sheet), PaperCard, Badge, Skeleton, EmptyState, Banner, Toast.
- Open (for `/replica-design`): the venue-colour system (group colours must pass contrast and not rely on colour alone), the serif/sans pairing, the sheet background treatment.
- Open (A): should the Feed tab, signed out, show a sign-in explainer or a topic-based preview? **Proposed:** preview of the onboarding topics with a "Sign in to follow authors and journals" row, so the tab is never empty.
