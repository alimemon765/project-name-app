# PROGRESS: PROJECT_NAME

> **Resume here (2026-10-22): design pass on step 2 half done (usage limit).** Read replica/design/reviews/2026-10-22-step2-design-pass.md: A/B reports are collected there (Nielsen 27/40, perf FCP 1.14 s); review break-ui shots in .localdb/scratch/breakui/, apply the fix list, ask Ali to run /review-animations and answer 3 questions. arXiv backfill and the recent-months redo are done. Then eval:build → reference labels → C2 stop.
>
> **Earlier note (2026-10-22, session 3, step 2):**
> - **Done (step 2 so far):**
>   - C1 ingest: all 127 journals in 4 volume-balanced batches; resumable month-window backfill (8 of 24 months in, stopped at the keyless $0.10/day cap, $0.087 spent); preprints from arXiv, ESSOAr + SSRN (Crossref, D032), EarthArXiv (OAI-PMH); strict gate; published-version linking; security review fixes.
>   - C3 Explore: search (FTS, highlights, DOI paste), Topic/Journal/Region sheets with live counts, OA + hide-preprints toggles, 4 sorts + Best match, URL state, desktop rail + side panel, Virtuoso keyset paging, empty/end states, new-since under filters, onboarding (D030), Settings defaults (7/14/30, preprints, your topics). D034–D037.
>   - C2 tooling: eval plan (200 items), `npm run eval:build`, local review page `/admin/labels` (server `coastal-admin`, port 3200, 127.0.0.1 only; 404 elsewhere via src/proxy.ts).
> - **Tests:** vitest 308, playwright 60 (+2 desktop-only skips on phone). Integration tests use the `coastal_test` database.
> - **Running / next:**
>   1. preprint backfill (`.localdb/logs/preprints-1.log`), then `npm run ingest:preprints -- --servers arxiv --months 24` and `-- --months 2` (the old test cleanup wiped some Oct preprints).
>   2. `npm run eval:build`, write the reference labels, then **STOP: Ali reviews 50 at http://localhost:3200/admin/labels**.
>   3. journal backfill: rerun `npm run backfill:papers` daily until all 24 months are done, or once with a free OpenAlex key (needed for Part D anyway: the 3-hourly ingest costs about $0.13/day).
> - **Known:** classifier precision is poor (feed ~9.6k papers/30 days vs CoastFolio ~216; SSRN 48k kept); fixing it is C2. Filter sheets have no drag until B5 (D034). B5 still waiting on Ali's phone results.
> - **Rules (D027):** commit only after green tests, gated on the test command's own exit code; update this note every step.

Pipeline: recon → architect → design → build → backend → test → diff → entrepreneur → brand → launch → deploy

| stage | status | output |
| --- | --- | --- |
| inventory (ECC + design skills) | done 2026-10-21 | decisions.md D001 |
| /replica-recon | done; CHECKPOINT (a) approved 2026-10-21 | recon.md, features.csv (99 rows), screens/ |
| /replica-architect | done; CHECKPOINT (b) approved | architecture.md, schema.sql (36 tables, tested), data-sources.md, data/journals.json, PRODUCT.md (draft), design/shape-brief.md |
| /replica-design | done (Ledger + register): tokens, contrast clean, components, break-ui, DESIGN.md | design/directions/ (index.html gallery, proto/, 36 screenshots) |
| /replica-build | steps 0–1 done (audit 16/20, tests green) | build-log.md, clone-screens/ |
| /replica-backend | not started | |
| /replica-test | not started | |
| /replica-diff | not started | |
| /replica-entrepreneur | not started | |
| /replica-brand | not started | |
| /replica-launch | not started | |
| /replica-deploy | not started | |
