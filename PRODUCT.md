# Product

<!-- impeccable:product-schema 1 -->

> Status: **draft for Ali's approval at CHECKPOINT (b)**. Written from `replica/recon.md`, `replica/decisions.md` (D004–D006) and Ali's brief, at Ali's request instead of a fresh interview. Facts marked *(inferred)* are not yet confirmed. Working name "PROJECT_NAME" until `/replica-brand`.

## Platform

web

(Mobile-first installable PWA; also used on laptops and desktops.)

## Stack

Ali's stated preference: Next.js (App Router) + TypeScript + Tailwind, PWA (service worker, manifest, Web Push); Supabase Postgres (pgvector, tsvector) + Supabase Auth (Google); Vercel hosting. Final choice and reasons live in `replica/architecture.md`.

## Users

- **PhD students and early-career researchers** in coastal flooding, sea level, subsidence, hydrology and flood GeoAI. They're often on a phone, often in South Asia (Ali is in Mumbai), and they need to keep up with a fast literature without institutional tools.
- **Coastal and water engineers** on a laptop. They want new methods, data and code they can actually use.
- **Professors and senior researchers** who just want this week's relevant papers, quickly, without curating feeds.

Their job: *stay current with a narrow, fast-moving field in a few minutes a day, and find the paper, code or dataset they need when they need it.*

## Product Purpose

A research-discovery app for coastal, flood and hydrology science. It gathers new peer-reviewed papers and preprints from about 130 journals and 4 preprint servers, tags each by topic and region with a transparent classifier, and lets people scan, search, filter, save and follow.

Success means a researcher opens it, sees what's new in their corner of the field, and reaches a paper's abstract in two taps. Later it also connects papers to the code and data behind them.

Releases (D004): v1 reader + free citations, research connections, "new since last visit" and strong region tagging. v1.5 Tools, Code & Data Hub. v2 Lab calculators, workflow features, AI agent.

## Positioning

The free, open research + code + data hub for coastal and flood scientists, with a South Asia lens (hypothesis, to be tested in `/replica-entrepreneur`).

What a neighbouring feed app can't truthfully copy:
- citations, References / Cited by / Similar and My Feed are free;
- methods are open: how topics, regions, trends and recommendations work is published;
- papers are linked both ways to the open-source tools and datasets they use (v1.5);
- regions are fine-grained, including Indian and South Asian coastal places.

## Operating Context

- A quick daily or weekly check on a phone, often on 4G and sometimes offline. A longer laptop session for searching and following.
- Papers open at the publisher or source; the app never hosts full text.
- Researchers export to reference managers (BibTeX/RIS/Zotero: v2).
- Time zones matter (IST for Ali; a global audience).

## Capabilities and Constraints

- Paper metadata comes only from open scholarly APIs (OpenAlex, Crossref, Unpaywall; arXiv, ESSOAr, EarthArXiv, SSRN). Abstracts are shown only where the source provides them, always with attribution and a DOI link.
- Free after sign-in: My Feed, following topics/journals/authors, sync, "new since last visit". Premium: alerts beyond a small free limit, time windows over 90 days, the AI agent.
- Navigation (D005): Feed · Explore · News · Tools · Saved, with Settings behind the header avatar. Tools is hidden until v1.5.
- Onboarding topic picker on first visit, reopened from Settings → "Change my topics" (D006).
- Works signed out (local saves), merging into the account on sign-in.
- Every Lab tool (v2) shows its method, assumptions and a "screening only, not for design or safety decisions" note.
- AI (v2) says when it only had the abstract, never fabricates numbers, and summarises full text only for OA works whose licence permits it.
- Clean-room: nothing from CoastFolio's brand, copy, mascot, colours or data.
- Undecided: product name, pricing level, payment provider (architect/brand stages).

## Brand Commitments

None yet. The name and identity come from `/replica-brand`. Binding: it must not resemble CoastFolio (no crab, nothing similar in name, colour or wording).

## Evidence on Hand

- `data/journals.json`: 127 journals with verified ISSNs and OpenAlex IDs, plus measured 12-month volumes.
- `replica/recon.md`, `replica/features.csv`, `replica/data-sources.md`.
- No users, testimonials, metrics or press exist. Never fabricate any.

## Product Principles

1. **Calm.** It's a place to think, not a stream to chase: no streaks, badges or urgency. Motion only where it explains.
2. **Dense but readable.** Show many papers at once, and keep every title and abstract effortless to scan.
3. **Trustworthy.** Show the source, the method and the uncertainty. Mark preprints, retractions and AI output plainly. Never make up numbers.
4. **Fast.** The feed loads in under 1.5 s on 4G and works offline for saved papers. Two taps to an abstract.
5. **Open by default.** Research features are free. Paid features cost us real money (alerts at scale, long windows, AI).

## Accessibility & Inclusion

WCAG 2.2 AA contrast in light and dark, full keyboard navigation, screen-reader labels, `prefers-reduced-motion` respected, and correct rendering of non-Latin author names and long titles. *(inferred)* Make it usable on mid-range Android phones and slow networks common in South Asia.
