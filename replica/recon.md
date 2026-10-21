# Recon map: CoastFolio (web PWA, mobile-first)

Scope: the whole public reader experience (Explore feed, paper detail, Journals, News, Saved, My Feed, Settings, Premium gating), plus our additions: Tools Hub, Lab, workflow features (see `features.csv`).
For: Ali's own product, "PROJECT_NAME": a free, open research + code + data hub for coastal and flood scientists, with a South Asia lens (hypothesis, to be tested in `/replica-entrepreneur`).
Date: 2026-10-20 (user walkthrough on 20 Oct 2026, re-verified live the same day in the built-in browser at about 800x600, signed out, public pages only).

Method: read-only, human-paced, signed out. No login, no bundle or network inspection, no scraping. Reference screenshots are kept **outside the repo** (local folder `~/coastal-hub-private/reference-screens/`, gitignored path `replica/screens/`) and are never committed or shipped (D015).

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | live public app, signed out | https://coastfolio.org | verified 2026-10-20; every screen below except onboarding |
| 2 | user's own walkthrough notes | (conversation, 2026-10-20) | screen list, topic list, journal list, Premium bundle |
| 3 | in-app sort explainer (info icon) | https://coastfolio.org | how sorts work; why there's no "views" sort |
| 4 | in-app Settings > Premium card | https://coastfolio.org | Premium bundle and price ($3.49/mo, 7-day trial, no card) |
| 5 | help centre / changelog / app-store listing | none found | it's a PWA, so there's no store listing; no public docs seen |
| 6 | public scholarly APIs (OpenAlex, Crossref, Unpaywall, Semantic Scholar) | see `data-sources.md` (architect stage) | our data source; we never call CoastFolio endpoints |

## Core loop

Open the app → scan this week's new coastal/hydrology papers, already tagged by topic and region → tap one → read the abstract → open it at the publisher or bookmark it.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Onboarding topic picker | first visit (modal) | pick topics before the first feed | 13 topic toggles (all on), primary CTA, Skip | from user notes only; **not shown** in the 2026-10-20 re-check (probably already dismissed or viewport-dependent) |
| S02 | Explore: Papers | default tab, `/` | the feed | header (logo, Sign in, a status line (paper count, time window, last-updated time)), Papers/Journals segmented control, search, sort chips (Newest ▾, Most cited/Trending 🔒, Hot topics 🔒), sort info toggle, filter chips (Topic, Journals, Region), **a "new since last visit" count chip**, PaperCard grid | loading (skeleton cards), filled, sort-info expanded; 2-column grid at ≥800px |
| S03 | Paper detail sheet | tap a card | read and act on one paper | close chevron, share, bookmark, journal full name (caps), serif title, date · DOI (mono), topic chips, Abstract (truncated to about 3 lines) + an outbound link to the full abstract, AI agent block (locked) with an explainer line, a primary button that opens the article at the publisher, Research connections chips (References, Cited by, Similar; all locked) | filled; full-screen at desktop width; locked Premium states |
| S04 | Region filter sheet | tap "Region: All" | narrow by region | radio list with counts (All, United States 16, Gulf of Mexico 2, U.S. East Coast 3, U.S. West Coast 6, Major deltas 3, South & East Asia 4, Europe 5, Ocean basins 5), Close | open; a centred modal at desktop width (bottom sheet on mobile per user notes); Escape did not close it |
| S04b | Topic / Journals filter sheets | tap the chips | narrow by topic or journal | same sheet pattern | assumed from S04 pattern (medium confidence) |
| S05 | Explore: Journals | segmented "Journals" | browse by venue | publisher group headers (caps), journal rows: name, OA badge, 30-day paper count, chevron | filled. **Counts are all papers the venue published (Sci. Rep. 4003, Ocean Eng. 508), not only topic matches**, so it ingests every paper and filters by topic afterwards |
| S05b | Journal drill-down | tap a journal row | that journal's papers | (chevron implies a filtered feed) | not opened (Premium "journal browser"?); guess |
| S06 | News | tab bar | domain news from outlets | title, a one-line subtitle, source chips with counts (All 61, Eos 7, Hakai 20, NOAA 10, NASA EO 3, Carbon Brief 12, Nature News 8, Science News 1), news cards (SOURCE · relative time, share, serif headline, snippet, an outbound link to the outlet) | filled; 2-column at desktop |
| S07 | My Feed (signed out) | tab bar | personal feed | Premium upsell card: Follow authors, Follow journals and topics, Alerts (daily or weekly), a sign-in + trial button | signed-out/locked only. **My Feed is a Premium feature**, not just sign-in |
| S08 | Saved | tab bar | bookmarks | count of papers stored on the device, sign-in nudge, empty-state hint | empty |
| S09 | Settings | tab bar | preferences | A note that changes take effect on the next refresh. Sections: Account (Google), Install (PWA), Premium (plan card, trial copy, CTA), My Feed & alerts, Time window (7/14/30 free; 60/90/1y/2y/5y locked), Search window (all locked when signed out), Topics (13 toggles + keywords per topic), Share-keywords opt-in, Journals (toggle per journal grouped by publisher) | signed out |
| S10 | Sign-in | "Sign in" anywhere | Google OAuth | (not exercised; it's a real account) | not observed |
| S11 | Share sheet | share icon | native share / copy link | Web Share API | not exercised |

Global: bottom tab bar (My Feed · Explore · News · Saved · Settings), dark theme by default.

## Flows

```
F01 First visit → see relevant papers
    S01 toggle topics → CTA → S02
    happy path clicks: 1 (accept defaults)
    edge: Skip; user turns every topic off; returning visitor (no modal)

F02 Find a paper on a subject
    S02 type in search → results
    happy path clicks: 1 + typing
    edge: zero results; search window shorter than the paper's age; author-name search (Premium on theirs)

F03 Narrow the feed
    S02 → S04 pick region → feed refilters (repeat for Topic / Journals)
    happy path clicks: 2 per filter
    edge: filter combination with 0 results; counts going stale after a refresh

F04 Read and act on a paper
    S02 tap card → S03 → open at publisher | bookmark | share
    happy path clicks: 2
    edge: no abstract; paywalled paper; preprint; very long title or 30+ authors (cards show "X et al." or nothing)

F05 Save for later
    S02/S03 bookmark → S08
    happy path clicks: 2
    edge: signed out (device-only store); clearing storage; sign in later → merge

F06 Browse by journal
    S02 → Journals segment → S05 → S05b
    happy path clicks: 2
    edge: journal with 0 papers this window (Scientific Data showed 0)

F07 Catch up on field news
    tab News → S06 → source chip → card → outlet site
    happy path clicks: 2–3
    edge: feed down; pull-to-refresh; stale items

F08 Tune what I see
    tab Settings → S09 toggle topics / journals / window → next refresh
    happy path clicks: 2
    edge: all journals off; locked window tapped (upsell)

F09 Personal feed + alerts (Premium)
    S07 → S10 sign in → trial → follow authors/journals/topics → alerts (daily or weekly)
    happy path clicks: ~5
    edge: notification permission denied; iOS PWA push requires installing first

F10 Install the PWA
    S09 Install → browser prompt
    edge: iOS Safari has no prompt (needs instructions)
```

Number to beat: 2 taps from opening the app to reading a paper's abstract.

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| TabBar | 5 items, icon + label | active, inactive | all |
| AppHeader | logo + auth button + status line | signed in/out | S02 |
| SegmentedControl | 2 options | selected | S02, S05 |
| SearchField | with leading icon | empty, typing, results | S02 |
| SortChip / SortMenu | dropdown (Newest/Oldest), locked | active, locked, open | S02 |
| InfoDisclosure | inline expander | collapsed, open | S02 |
| FilterChip | "Label: Value ▾", count chip ("New 29") | default, active, open | S02 |
| BottomSheetSelect | radio list with counts, Close | open, closing; modal at desktop width | S04 |
| PaperCard | venue colour bar + abbreviation, date, new-dot, share, bookmark, serif title, authors (optional), OA badge, topic chips (wrap) | default, saved, new/unread, no-authors | S02, S07, S08 |
| PaperSheet | full detail | OA / closed, locked sections, no abstract | S03 |
| TagChip | topic, OA badge, OA mini-badge | static | S02, S03, S05 |
| LockedChip / LockedButton | lock glyph | locked → upsell | S02, S03, S09 |
| PrimaryButton | full-width, with external-link icon | default, pressed | S03, S07, S09 |
| ListRow | label, badge, count, chevron | default, pressed | S05 |
| SectionHeader | small caps label | — | S05, S09 |
| NewsCard | source · time, share, headline, snippet, outbound link | default | S06 |
| SettingsCard | title, body, CTA | — | S09 |
| ChoiceChips | option set with locked options | selected, locked | S09 |
| Toggle | on/off rows | on, off | S01, S09 |
| UpsellCard | feature bullet list + CTA | — | S07, S09 |
| EmptyState | message + action | — | S08 |
| Skeleton | card skeleton | loading | S02 |

## Inferred data model

```
Paper      id, doi (unique), title, abstract, authors[] (ordered), venue_id, pub_date,
           is_oa, oa_url, topics[] (multi), regions[] (multi), citation_count,
           citations_by_year, is_preprint, first_seen_at (drives "New" + new-dot)
           evidence: S02 cards, S03 sheet, sort explainer (recent-years citation rate)
           confidence: high (fields), medium (first_seen_at)

Venue      id, name, abbreviation, publisher_group, is_oa, issn[], is_preprint_server,
           paper_count(window)
           evidence: S05 rows and groups, card abbreviations
           confidence: high

Topic      id, name, order, default_on, keywords[] (seed + user-added)
           evidence: S01, S09 topic list and keyword copy
           confidence: high

Region     id, name, parent_id?, paper_count(window)
           evidence: S04 (flat list; "U.S. East Coast" reads like a child of "United States")
           confidence: medium (hierarchy is a guess)

NewsItem   id, source, title, snippet, url, published_at
           evidence: S06
           confidence: high

UserPrefs  topics_on[], journals_on[], keywords{topic: []}, share_keywords bool,
           time_window, search_window
           evidence: S09
           confidence: high (local-first; synced when signed in)

User       id, google_sub, plan (free | trial | premium), trial_started_at
           evidence: S09 Premium card
           confidence: medium

Save       user_or_device, paper_id, saved_at        evidence: S08  confidence: high
Follow     user_id, kind (author | journal | topic), target_id   evidence: S07  confidence: medium
Alert      user_id, cadence (daily | weekly), channel (push)     evidence: S07  confidence: medium
AISummary  paper_id, kind (fulltext | abstract), body, key_figure  evidence: S03 agent copy  confidence: guess
```

Relationships: Venue 1-n Paper; Paper n-n Topic; Paper n-n Region; User 1-n Save/Follow/Alert; Paper 1-1 AISummary (cached).

## How we'll do the inferred parts (our own methods, not theirs)

- **Topic + region tagging:** our own two-layer classifier. Layer 1 is an editable keyword rule set in the DB; layer 2 is embedding similarity to hand-picked examples. Multi-label with confidence. Regions come from a gazetteer over title and abstract, mapped to a real hierarchy with lat/lon. Their region counts are low (about 50 of 216 papers), so tagging coverage is a place we can win.
- **Citations:** OpenAlex `cited_by_count` + `counts_by_year` (this gives "Trending" directly), with Semantic Scholar as a fallback.
- **Open access:** OpenAlex `open_access` + Unpaywall for the best OA URL and licence.
- **Ingest cadence:** their last-updated timestamp suggests hourly or few-hourly runs. We'll ingest every 2–3 h per ISSN and refresh citations daily for papers under 2 years old.
- **"New" chip / dot:** papers whose `first_seen_at` is after the device's last visit (stored locally).
- **Ingest scope:** their journal counts show they pull *every* paper per venue and then filter. We'll do the same: ingest by ISSN, tag, then default-filter the feed to papers with ≥1 topic.

## Feature matrix

See `features.csv` (99 rows). Must: 60, should: 24, could: 10, skip: 5.

## Out of scope (cannot or should not be cloned)

- CoastFolio's name, crab mascot, logo, colours, wording, onboarding copy, tooltips and agent name: brand-owned.
- Their topic/keyword library contents and user-shared keywords: data they own. We build our own seed lists.
- Their AI summaries and key-figure picks: their generated content. We generate our own.
- Their user base and followers: the network.
- Full-text or abstract text the metadata sources don't provide, and article view counts: no free cross-publisher source (Altmetric is paid). We agree with them here and say so on our methodology page.
- Hosting news articles in full: we store title, snippet and link only.
- Google Flood Forecasting API data until access is approved (feature flag, off).

## Size

Parity: screens 11 (+2 sub-sheets), flows 10, entities 11.
With our additions (Tools Hub, Lab, workflow, platform): about 30 screens, 25 flows, 25+ entities.

Hard parts:
1. **Ingestion at scale within free API budgets.** About 130 ISSNs and 4 preprint servers, OpenAlex's paid-usage model, dedupe and preprint↔published merging.
2. **The classifier.** Topic and region tagging good enough to trust (precision/recall on 200 labelled papers).
3. **Tools Hub two-way linking.** Paper↔code evidence extraction plus a relevance-scored crawler with moderation.
4. Also hard: offline-first PWA with local→account merge and Web Push (iOS quirks); the EVA calculator's statistical correctness (GEV/GPD with CIs validated against pyextremes); payments for an India-based seller; AI cost caps.

Size: parity alone is **L** (a quarter part-time). Parity + every addition is **XL**, so it needs phasing: ship parity + free citations/connections first (v1), then Tools Hub (v1.5), then Lab + workflow + AI (v2).

## Summary

- **Core loop:** open → scan new tagged coastal/hydrology papers → tap → abstract → publisher or bookmark (2 taps).
- **Counts:** 11 parity screens, 10 flows, 11 entities; about 30 screens with our additions.
- **Hardest parts:** budget-safe multi-source ingestion with dedupe and merging; a trustworthy topic/region classifier; two-way tool↔paper linking.
- **Out of scope:** their brand, keyword library, AI outputs, user network; full text, view counts and full news articles.
- **Next:** CHECKPOINT (a), then `/replica-architect`.
