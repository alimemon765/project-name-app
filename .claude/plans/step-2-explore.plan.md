# Plan: build step 2, Explore for real (Part C)

**Source:** Ali's session-3 brief (Part C), architecture.md build order row 2, features.csv `[v1]` rows, D028–D030.
**Complexity:** Large. About 4 working sessions.
**Stops:**
- **after C2:** Ali reviews 50 labels on the local admin page
- **after C4:** screenshots, tests, audit and critique scores, perf numbers, classifier-eval.md

**Not touched until B5 results arrive:** the sheet gesture code (`src/lib/motion/spring.ts`, `PaperSheet.tsx` drag handlers). The desktop side panel reuses the sheet's open/close state, not its gestures.

## Summary
Fill the database with 24 months of papers from all 127 journals and four preprint servers. Tune the classifier against a labelled eval set until P ≥ 0.85 and R ≥ 0.70. Then turn Explore into a searchable, filterable, sortable, infinitely scrolling feed whose whole state lives in the URL, plus the onboarding topic picker (D030). Finish with a perf, accessibility and design quality bar on the full dataset.

## Scope decisions
| Item | Decision | Why |
|---|---|---|
| Hot topics view | **Deferred to v2** | features.csv marks it `should`, not `must`. Ali's rule: build v1 musts, defer the rest and say so |
| Time window | **7 / 14 / 30 days free** in Settings (Ali's brief); the server allows up to 90 | features.csv says "up to 90 free". **Open question 1** |
| EarthArXiv source | **OAI-PMH directly**, not OpenAlex | Ali's brief says OpenAlex, but data-sources.md measured only 384 EarthArXiv works in OpenAlex. **Open question 2** |
| Embedding layer | gte-small 384-d via transformers.js in the worker (architecture.md). Query-time vector search is **not** in step 2: search is FTS only | Keeps step 2 free of an Edge Function; RRF fusion comes with Supabase in Part D or later |
| Pull-to-refresh | Not built. The "new since" chip and the 3 h ingest cover it | The native browser pull-to-refresh already reloads; a custom one fights the sheet |

## Patterns to mirror
| Category | Source | Pattern |
|---|---|---|
| Queries | `src/lib/papers/queries.ts:25-48` | Kysely `baseSelect()`, `"use cache"` + `cacheLife` + `cacheTag("feed")`, `Promise.all` for rows + count |
| Keyset paging | `src/lib/papers/queries.ts:67`, `src/lib/feed/cursor.ts` | `(pub_date, id) < cursor`, base64url cursor; extend the cursor to carry the sort key |
| Ingest | `src/lib/ingest/papers.ts:100` | ledger first, per-work isolation, `job_runs` attempt + lock, retry with Retry-After clamp, budget stop from the limit header |
| Errors | `src/lib/ingest/papers.ts` (fetchWithRetry), `src/app/error.tsx` | throw with context in workers; error boundary + retry in UI |
| URL state | `src/components/paper/useSheetParam.ts` | native `history.pushState`/`replaceState`, read with `useSearchParams` |
| Unit tests | `tests/unit/*.test.ts` | Vitest, AAA, fixtures in `tests/unit/fixtures/` |
| Integration | `tests/integration/ingest.test.ts` | local DB on :55433, skip when unreachable, stubbed fetch |
| E2E | `tests/e2e/critique-fixes.spec.ts` | Playwright phone + desktop projects, `:visible` locators (Activity) |
| Schema | `supabase/migrations/0001_init.sql:98-147` | `search_tsv` (title A, abstract B, authors C) and the GIN, cited, trending and topic/region indexes **already exist** |

## C1: full ingest (TDD; security-reviewer after)
1. **Journals:** batch all 127 OpenAlex source IDs in OR-groups of ≤ 50; keep the publication-date window. Worker flags `--all`, `--backfill-months 24`. Spend reported per run.
2. **arXiv** (`src/lib/arxiv/`): Atom client for physics.ao-ph / geo-ph plus a strict keyword gate on cross-lists; 1 request per 3 s.
3. **ESSOAr via Crossref** (`src/lib/crossref/`): polite pool, `mailto`, prefix filter, strict gate.
4. **EarthArXiv** via OAI-PMH; **SSRN** via one OpenAlex strict search per day.
5. **Preprints:** OpenAlex singleton DOI lookup to enrich; `is_preprint = true`; link a preprint to its published version (`published_version_id`) on a DOI relation or exact title match.
6. **UI:** "Preprint" badge on card and sheet; Settings toggle "Show preprints" (default on), persisted locally and carried in the URL filter.
7. **Backfill:** run 24 months, then report spend (target about $0.27) and papers vs `paper_ledger` counts, per source.
- **Tests:** unit tests for each mapper and gate (fixtures); integration tests for preprint linking and the backfill resume.

## C2: classifier tuning (STOP for Ali)
1. Build an eval set of 200 papers, stratified by journal (about 20% Sci Rep / Nat Commun, the noisiest broad journals), by preprint vs journal, and by predicted topic.
2. Add a local-only admin page `/admin/labels`, compiled only when `ADMIN_LABELS=1` and refusing non-localhost hosts. It shows 50 random papers with their predicted topics; for each, Ali marks **correct / wrong topic (pick right ones) / off-topic**. Saved to `classifier_labels` (new migration).
3. **STOP and wait for 50 reviews.**
4. Tune:
   - per-topic thresholds (data/keywords.seed.json gains `thresholds`)
   - include/exclude keyword edits
   - the embedding layer: topic centroids from labelled positives, cosine gate for keyword-borderline papers
5. Write `replica/classifier-eval.md`:
   - per-topic P/R/F1 before and after, confusion notes
   - feed share vs CoastFolio's about 216 papers per 30 days (aim: comparable breadth, not 10×)

## C3: Explore UI (TDD; /impeccable onboard for empty and end states; taste-skill + Emil for sheets)
1. **Search:** `src/lib/papers/search.ts`. `websearch_to_tsquery`, ranked by `ts_rank_cd` and then recency; `ts_headline` highlighting (escaped, `<mark>` only). If the query parses as a DOI, `normalizeDoi` opens that paper directly. Search field at the top of Explore; the tab re-tap focuses it.
2. **Filters:** one query builder `src/lib/feed/filters.ts` (zod-validated, shared by the server and the URL), with facet counts in one grouped query. Each sheet shows live counts:
   - Topic: multi-select, 13 slots, register colours
   - Journals: grouped by publisher, with search
   - Region: hierarchy incl. South Asia sub-regions
   - Open access only; Preprints
3. **Sorts:** Newest / Oldest / Most cited / Trending, each with its own keyset cursor. A sort info sheet explains each one in our own words.
4. **URL state:** `src/lib/feed/url.ts` covers `q, topics, journals, regions, oa, pre, sort, days`, with round-trip tests. The back button walks filter changes.
5. **Time window:** Settings offers 7/14/30; the status line reads e.g. "Updated 9:40 am IST · 312 papers in 14 days" (fixes the GMT+5:30 P3).
6. **Feed:** Virtuoso + TanStack Query `useInfiniteQuery` over `/api/feed` (zod-validated params, 400 on bad input). Skeletons, end line, empty states (no results, filters too narrow, with a one-tap "clear filters"). The "new since" chip respects the active filters.
7. **Desktop (≥ 1024px):**
   - 300 px topic rail on the left
   - feed column capped
   - filter sheet as a right side panel
   - 2-line abstract snippet on cards
8. **Onboarding (D030):** a first-visit topic picker (pick 1+ of 13 topics, skippable) that seeds the Topic filter and My Feed. Reopen it from Settings.
9. **Folded P2s:**
   - legend + method link
   - unsave undo toast
   - retry on load errors
   - chip hit areas 44 px
   - abstracts out of the feed payload (snippet only)
   - revalidate route for the worker
   - font subsetting
   - data-sources.md cost table update

## C4: quality bar
- **Perf:**
  - < 1.5 s first feed render on Fast 4G + 4× CPU with the full 24-month DB
  - EXPLAIN ANALYZE for each sort × common filter combo, plus search
  - p95 from 200 runs; add indexes only where EXPLAIN shows a seq scan
- **Design review:**
  - break-ui on the full dataset (long titles, 0 results, 10k facet counts)
  - mobile-native pass on sheets and search
  - /animate for filter sheets (reduced-motion respected)
- **Tests:**
  - unit: query builder, URL codec, cursor per sort, DOI detection, highlight escaping
  - integration (local DB): each filter, each sort, combined filters, search ranking, facet counts, preprint toggle, new-since with filters
  - e2e (phone + desktop): search, each filter sheet, each sort, URL round-trip and reload, DOI paste, preprint toggle, onboarding, desktop side panel
- **Reviews:** code-reviewer, database-reviewer (queries + indexes), security-reviewer (admin page, API params, `ts_headline` output), then /impeccable audit + critique. Fix all P0/P1/HIGH.
- **Screenshots:** phone + desktop, light + dark, covering Explore with filters, search results, empty state, desktop side panel.

## Files (main)
| File | Action |
|---|---|
| `src/lib/{arxiv,crossref,oai}/*`, `src/lib/ingest/preprints.ts`, `workers/ingest-preprints.ts` | CREATE |
| `src/lib/ingest/papers.ts`, `workers/ingest-papers.ts` | UPDATE (all journals, backfill) |
| `supabase/migrations/0002_step2.sql` | CREATE (`classifier_labels`, any indexes EXPLAIN demands) |
| `src/lib/classify/{keywords,embedding}.ts`, `data/keywords.seed.json` | UPDATE / CREATE |
| `src/app/admin/labels/*` | CREATE (local only) |
| `src/lib/feed/{filters,url,cursor}.ts`, `src/lib/papers/{queries,search}.ts`, `src/app/api/feed/route.ts` | CREATE / UPDATE |
| `src/components/explore/*` (SearchField, FilterSheet, TopicRail, SortSheet, StatusLine, Onboarding) | CREATE |
| `src/components/feed/FeedList.tsx` | UPDATE (Virtuoso) |
| `replica/classifier-eval.md`, `replica/decisions.md` (D031+), `replica/build-log.md`, `features.csv` | UPDATE |

## Dependencies to add
`react-virtuoso`, `@tanstack/react-query`, `@huggingface/transformers` (worker only), `fast-xml-parser` (arXiv Atom + OAI). Each pinned exactly.

## Validation
```bash
npm run typecheck
npm run lint
npx vitest run
npm run build
npx playwright test
```
Commit only after a green run, using `&&` (D027).

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Backfill spend or rate limits exceed the estimate | Med | per-run budget stop already exists; resumable by month; report actual spend |
| Broad journals (Sci Rep, Nat Commun) flood the feed with noise | High | C2 stratifies the eval set toward them; per-journal strict gate if needed |
| Embedding model download is slow or large on CI | Med | worker-only; cached; keyword layer still works without it |
| Facet counts slow on the full DB | Med | one grouped query, EXPLAIN in C4, cache by filter key |
| Keyset cursor wrong for non-date sorts (ties, null citations) | Med | cursor carries (sortKey, id); unit tests per sort with ties |
| `ts_headline` XSS | Low | escape the input, allow only `<mark>`, security review |
| Admin page exposed in production | Low | env-gated build + host check + not in Part D deploy |

## Open questions for Ali
1. **Time window:** free tier 7/14/30 (your brief) or up to 90 (features.csv)? I'll build 7/14/30 unless you say otherwise.
2. **EarthArXiv:** OAI-PMH directly (OpenAlex only has about 384 of its works) instead of via OpenAlex? I'll use OAI-PMH unless you say otherwise.

## Acceptance
- [ ] C1 counts and spend reported
- [ ] C2 stop honoured; P ≥ 0.85, R ≥ 0.70 in classifier-eval.md
- [ ] every C3 control works, with its state in the URL
- [ ] C4 perf < 1.5 s, all reviews clean of P0/P1/HIGH
- [ ] features.csv, build-log, PROGRESS updated
