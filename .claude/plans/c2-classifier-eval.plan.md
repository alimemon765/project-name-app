# Plan: C2 — classifier evaluation set, reference labels, review page

**Source:** Ali's brief, 2026-10-23, sections 4–5 (the spec, including the stop point). D041 (B5 pending, PaperSheet frozen).
**Complexity:** Medium–Large. **Stops:** after 4d (Ali reviews 50). Section 5 is planned here and runs only on "reviews done".

## Summary
Draw a reproducible 200-paper evaluation set, label every paper myself (in domain, topics, regions, reason, unsure), and give Ali a fast local review page for 50 of them (every unsure one plus a random fill). His answers measure how far my labels can be trusted; tuning waits for them.

## Why the set includes rejected works
Ali's brief stratifies classified papers. Recall (≥ 0.70) can only be measured if some works the classifier *rejected* are in the set, so 30 of the 200 are rejected works (their text comes from free OpenAlex lookups). Recorded as a decision.

## Composition (200)
| Stratum | n | How drawn |
|---|---|---|
| broad: Sci. Rep. / Nat. Commun., classified | 30 | seeded random, spread over months |
| broad: Sci. Rep. / Nat. Commun., rejected | 10 | from `paper_ledger` (classified = false) |
| preprints, classified | 20 | 5 each from arXiv, ESSOAr, EarthArXiv, SSRN |
| near-misses (classified, keyword traps) | 20 | title/abstract match: lightning, microplastic, seismic wave, plasma wave, financial/bank "flood", mathematical "delta"; ≤ 4 per trap |
| core journals, classified, stratified by topic | 100 | ≈ 8 per primary topic (13), then filled; ≤ 3 per journal; spread over the 24 months |
| core journals, rejected | 20 | from `paper_ledger` |
Broad share 40/200 = 20%; preprints 20 (10%); near-misses 20 (10%); rejected 30 (15%).

## Patterns to mirror
| Category | Source | Pattern |
|---|---|---|
| Worker CLI | `workers/build-eval-set.ts`, `workers/backfill-papers.ts` | env check, `arg()`, `Pool`, stderr log, exit 1 on failure |
| Pure planning + tests | `src/lib/eval/plan.ts`, `tests/unit/eval-plan.test.ts` | pure plan module, seeded `shuffleOrder` |
| Local-only admin | `src/proxy.ts`, `src/lib/admin/guard.ts`, `src/app/admin/labels/actions.ts` | proxy 404 + page guard + action guard, zod validation |
| DB tests | `tests/integration/db.ts` (`requireDb`) | coastal_test only; fail loudly without DB |

## Tasks
1. **Migration 0005:** `classifier_eval_items` gains `near_miss_term`, `pub_date`, `in_review_queue`; `classifier_labels` gains `verdict` (`correct | wrong_topic | off_topic | skip`, Ali only), `region_ids`, `reason`, `unsure`; `in_scope` nullable only for `skip`.
2. **Plan module (TDD):** `EVAL_PLAN` v2 above; near-miss terms; `pickReviewQueue(items, unsureKeys, n=50, seed)` = every unsure + seeded random fill; CSV writer for the export (quoting, newlines).
3. **Builder:** `npm run eval:build` draws the set and writes `replica/eval/eval-set.json` (seed, method, plan version, each item's source key + stratum + term). `--from-fixture` rebuilds exactly from that file. Refuses to redraw over existing labels.
4. **Reference labels:** I read all 200 (title + abstract) in batches and write `replica/eval/reference-labels.json` (in_domain, topics, regions, reason, unsure). `npm run eval:load-reference` validates (zod: known slugs) and loads them as labeller `reference`, then marks the review queue.
5. **Review page v2** (`/admin/labels`, local only): one paper at a time; left column paper (title, journal, year, full abstract), right column my labels + reason + unsure flag; Correct / Wrong topic (13 toggles, prefilled) / Off-topic / Skip + note; keys 1, 2, 3, S, ←, →; progress bar; autosave on every answer (server action); resume at the first unanswered; Export writes `replica/eval/ali-reviews.csv` (guarded server action). e2e against the admin server.
6. **code-reviewer** on the page + action; fix HIGH.
7. **Stop (4d):** URL, time estimate, counts per label for the 150 not in the queue, plus how often my labels disagree with the classifier.

## Section 5 (after "reviews done")
1. Accuracy of my labels on Ali's 50 (verdict correct = agree). If disagreement > 15%: re-label the other 150 with the lessons, list what changed.
2. Tune, TDD for every classifier change: per-topic thresholds; keyword include/exclude (trap terms as excludes); per-server preprint gate; embedding layer (gte-small topic centroids from in-domain labels, cosine gate for keyword-borderline papers).
3. Skipped answers (verdict skip, in_scope null) are excluded from every count, never treated as "not in domain"; tested.
4. Targets per topic P ≥ 0.85, R ≥ 0.70, evaluated on the 200 (Ali's label where present, mine otherwise); stratified 5-fold so the thresholds are not tuned to the test.
5. `replica/classifier-eval.md`: per-topic P/R/F1/n, the 10 worst errors and why, feed share vs CoastFolio's ~216 per 30 days.
6. Re-classify the whole DB (the ledger keeps every work), before/after counts per topic. code-reviewer after tuning.

## Validation
```bash
npm run typecheck
npx eslint src workers tests
npx vitest run
npm run build
npx playwright test
```

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| My labels are systematically wrong in a sub-field | Med | Ali's 50 measure it; >15% triggers a relabel |
| Tuning overfits 200 items | Med | stratified folds; report fold variance |
| Rejected works lack abstracts in OpenAlex | Med | judge on title, mark unsure |
| Admin export writes a file from a server action | Low | localhost-only guard, fixed path, no user-controlled path |

## Approval
Ali's 2026-10-23 brief specifies this work through the 4d stop; implementation starts on that basis.
