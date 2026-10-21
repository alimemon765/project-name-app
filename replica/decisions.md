# Decisions log

## D001, 2026-10-21: tool inventory and stage mapping
Present in this session: ECC agents planner, architect, code-architect, tdd-guide, code-reviewer, typescript-reviewer, react-reviewer, database-reviewer, security-reviewer, e2e-runner, build-error-resolver, react-build-resolver, refactor-cleaner, doc-updater, a11y-architect, performance-optimizer, seo-specialist. ECC commands: ecc:plan, ecc:code-review, ecc:build-fix, ecc:refactor-clean, ecc:update-docs, ecc:quality-gate, ecc:security-scan. Skills: ecc:tdd-workflow, ecc:e2e-testing, ecc:postgres-patterns, ecc:nextjs-turbopack.
Not present under the requested names: `/tdd` → use the ecc:tdd-workflow skill + tdd-guide agent. `/e2e` → use the ecc:e2e-testing skill + e2e-runner agent.
ECC hooks active: GateGuard fact-forcing (PreToolUse Bash/Edit/Write), plus SessionStart, PostToolUse(Edit|Write) and Stop hooks from ~/.claude/settings.json. Left enabled.
Design: taste-skill, impeccable, emil-design-eng, animate, apple-design, mobile-native, break-ui, ask-sonner, find-animation-opportunities, improve-animations, animation-performance are all listed. Impeccable agents finish-reviewer, documenter and asset-producer are present.
Not listed in this session, though the folders exist in ~/.claude/skills: pick-ui-library, prototype, review-animations. Plan: read their SKILL.md files directly when their stage comes.

## D002, 2026-10-21: project location
Created /Users/ali/coastal-hub with its own git repo, because the home directory is itself a git repo and must not hold this project.

## D003, 2026-10-21: recon findings that change the brief
- My Feed is a Premium feature on CoastFolio (not just sign-in). Open question for entrepreneur: free on ours?
- Journal counts show they ingest every paper per venue, then topic-filter. We'll do the same.
- They have a "New N since last visit" chip + new-dot, which wasn't in the notes. Added as a must.
- The onboarding modal didn't appear in the re-check. Kept as a must from the user's notes.
- Region tagging covers only about 50 of 216 papers on theirs. Our gazetteer tagging is an opportunity.

## D004, 2026-10-21: CHECKPOINT (a) approved; scope and free tier (user)
- v1 = CoastFolio parity + free citations / References / Cited by / Similar + "New since last visit" chip and dots + better region tagging, including South Asia / India sub-regions (Mumbai, Bay of Bengal, Ganges–Brahmaputra delta, monsoon floods).
- v1.5 = Tools Hub. v2 = Lab, workflow features, AI.
- The architect stage designs the FULL schema now and marks each table v1 / v1.5 / v2. Migrations may create only v1 tables first.
- FREE after sign-in: My Feed, following topics/journals/authors, sync, the "New since last visit" view.
- Premium: push/email alerts beyond a small free limit, time windows over 90 days, the AI agent. Entrepreneur may revise this with evidence.
- Release tags are written as a `[v1]`/`[v1.5]`/`[v2]` prefix in the features.csv notes column, so the column set replica-diff expects stays the same.

## D005, 2026-10-21: navigation (user)
- Tab bar: Feed · Explore · News · Tools · Saved. Settings moves to the header avatar/profile button.
- Explore keeps Papers | Journals. Tools gets Catalogue | Lab.
- Our call on the v1 Tools tab: **hide it until v1.5.** Why: a "coming soon" tab is a dead tap on the most valuable strip of the screen and works against the calm, trustworthy principle. Four tabs also give bigger thumb targets in v1. The bar is designed and built for 5 slots (a config flag), so v1.5 only flips the flag. No layout rework, and we announce the change in the changelog.
- One-handed check goes through /impeccable shape.

## D006, 2026-10-21: onboarding (user)
Shows on first visit (must). Reopen from Settings → "Change my topics".

## D007, 2026-10-21: unlisted Emil skills (user)
pick-ui-library, prototype and review-animations: read their SKILL.md directly when their stage comes.

## D008, 2026-10-21: UI libraries (pick-ui-library, Emil's curated list)
On the list:
- **base-ui** for accessible unstyled primitives (Dialog, Popover, Menu, Select, Tabs, Toggle, Switch, RadioGroup). We use it **instead of shadcn/Radix**, because the curated list picks base-ui and we want our own styling, not shadcn's default look.
- **motion** for bottom-sheet drag/springs, layout transitions, enter/exit. Plain CSS transitions for hovers and fades.
- **Sonner** for toasts (PWA update, saved/undo, offline). Follow ask-sonner.
- **Virtuoso** for the infinite feed (1,000+ variable-height cards).
- **zustand** for client state (local saves, prefs, last visit), persisted to IndexedDB.
- **clsx + cva** for styling variants. **next-themes** for light/dark/system without a flash.
- **Satori** (via next/og) for OG images. **shiki** for install snippets (v1.5). **recharts** for topic trends (v2). **cmdk** (could): desktop ⌘K search.

Off the list (the task isn't covered):
- **Bottom sheet:** built in-house on base-ui Dialog (focus trap, Esc, aria) + motion drag with detents. Vaul is not used, because its maintenance status is uncertain and apple-design wants interruptible springs we control.
- **Server state / caching:** TanStack Query.
- **Maps (v2):** MapLibre GL.
- **Validation:** zod.

## D009, 2026-10-21: Impeccable workflow defaults
PRODUCT.md drafted from sources (Ali's request) and pending approval at CHECKPOINT (b). The comp-first vs code-first `buildPath` question only affects landing pages, so it is deferred to /replica-launch. Nothing written to .impeccable/config.json.

## D010, 2026-10-21: stack (pending CHECKPOINT (b))
- Next.js App Router + TS + Tailwind v4 on Vercel `bom1`: Hobby through v1 (no revenue), Pro when billing goes live.
- Supabase Pro in ap-south-1 at public launch (Free in dev).
- Workers: GitHub Actions (Node) + pg_cron/Edge for news and rollups. Vercel Cron not used.
- gte-small via transformers.js in both runtimes, with a parity test.
- Payments: Paddle, Lemon Squeezy as fallback.
Full reasons in architecture.md.

## D011, 2026-10-21: ingest everything per journal, classify ourselves
Measured: 132.6k works/yr from 127 journals. A search-filtered page costs 10× a list page, and our classifier must see every paper anyway. Every work goes to the ledger; classified works go to `papers`.

## D012, 2026-10-21: preprints stay separate rows
Linked by published_version_id. Feeds hide merged preprints; the merge job moves saves and links.

## D013, 2026-10-21: review fixes
Database-reviewer + architect findings applied (architecture.md Review log). The most important: users can no longer write profiles.plan.

## D014, 2026-10-21: CHECKPOINT (b) approved (user)
Stack, schema, ingestion plan, cost model and v1 build order approved as in architecture.md. PRODUCT.md approved as written.

## D015, 2026-10-21: open source (user)
- Public repo. **AGPL-3.0** for app code. **CC0-1.0** for `data/journals.json` and the topic/keyword seed lists.
- Before going public:
  (a) move `replica/screens/` (reference screenshots) to a local folder outside git, gitignore it, purge it from history with git filter-repo;
  (b) secret scan over the full history and rotate anything found;
  (c) remove any quoted wording from the reference app;
  (d) create the GitHub repo only after (a)–(c) pass and Ali has seen the result.

## D016, 2026-10-21: backfill (user)
24 months at launch.

## D017, 2026-10-21: classifier evaluation (user)
- Per-topic tunable thresholds.
- Claude drafts labels for a 200-paper evaluation set. Ali reviews a random 50 via a small CSV or admin page (right/wrong).
- Targets per topic: precision ≥ 0.85 and recall ≥ 0.70. Report the topics that miss.

## D018, 2026-10-21: data sources (user)
- Google Flood Forecasting stays off. The v2 flood-alert map uses GDACS.
- Semantic Scholar is not used. References / Cited by come from OpenAlex (`referenced_works`, `cited_by`); Similar comes from our gte-small embeddings.

## D019, 2026-10-21: approved (user)
Tools tab hidden until v1.5; Paddle + annual plan in v2 (Ali applies to Paddle and talks to a CA before v2); double-tap-to-search and the sticky filter row.

## D020, 2026-10-21: hosting tiers (user)
Supabase Free + Vercel Hobby for all development and any private beta. Supabase Pro only on public launch day. **Remind Ali at /replica-deploy.**

## D021, 2026-10-21: our own topic labels (pending Ali's veto)
The 13 topic labels in the brief are the reference app's exact wording. We keep the same 13 research areas but use our own labels (`data/topics.json`). For example, "Extreme value analysis" replaces the original's extremes label, and "Monitoring and forecasting" replaces its observations label.

## D022, 2026-10-21: public-repo preparation (D015 a–c)
- (a) 8 reference screenshots copied to `~/coastal-hub-private/reference-screens/`, purged from all history (git filter-repo), `replica/screens/` gitignored. Pre-purge mirror backup kept in the session scratchpad.
- (b) gitleaks over the full history + working tree: **no leaks**.
- (c) Quoted reference-app UI text paraphrased in recon.md; our own copy written for the shape brief ("Open article", our own status-line format).
- Earlier commits still contain the old quotes, so **squashing to one clean initial commit before the first push is proposed** (needs Ali's OK).
- Commits use Ali's git email; it will be public. Ali can switch to a GitHub noreply address first.

## D023, 2026-10-21: design part A, three directions (awaiting Ali's pick)
- Directions: **Folio** (editorial table of contents, light-first), **Gauge** (instrument readout with a 13-slot topic register), **Ledger** (taste-skill's achromatic-ledger pick: one data hue for "new" + a "you left off here" line).
- Taste dealt app styles: editorial-greeting (workspace), data-terminal (markets), achromatic-ledger (report).
- Redraws, with reasons:
  - editorial-greeting's deep-teal accent → tide-table blue (Ali: not dark-teal-first);
  - data-terminal's dark-only tokens → equal light + dark (Ali: both themes equal);
  - Gauge's inset-shadow selection lines → real 1px lines (inspector button-fx).
- **Brief over house rule:** three typefaces (serif titles / sans UI / mono DOIs), as Ali specified; taste-skill warns at three.
- **Topic colours:** 13 OKLCH pairs, all AA in both themes (minimum 6.1:1), violet/indigo skipped. Each topic also has a shape glyph, so colour never carries meaning alone (`scripts/design/topic_palette.py`).
- **Data:** 20 real papers (OpenAlex CC0 + Crossref). The real sample had no 40-word title and no non-Latin author scripts, so those are two labelled fixtures behind `?wc=1`.
- **Gates:** lint 0 FAIL; inspect --app 0 FAIL on all three in light and dark. Remaining WARNs are defended (three faces by brief; Ledger's sticky rail and long feed).
- Sheet physics checked with synthetic pointer events: 60% detent, settles to full, flick dismisses, rubber-band, Esc.
- Screenshots: about 10.6 MB of PNGs. The losing directions' captures get removed before the repo goes public.

## D024, 2026-10-21: direction chosen (user)
**Ledger**, with **Gauge's 13-slot topic register** on paper cards. Ledger's colour budget still holds: the register's glyphs are data marks in their topic hues, and the chrome stays ink. Named topic chips stay on the paper sheet; cards show the register plus the top 2 topic names.

## D025, 2026-10-21: design part B done
- `tokens.json` is the single source of truth (Ledger + register). Generated from it: `tokens.css` (runtime vars + Tailwind v4 `@theme inline`), `DESIGN.md` and `.impeccable/design.json`. Nothing is hand-copied.
- Contrast: 78 pairs per theme, 0 AA failures (light and dark).
- break-ui: 11 findings recorded as spec rules in components.md (the worst: no retraction banner in the paper sheet).
- **DESIGN.md qualitative language is proposed, not interviewed:** North Star "The Tide Ledger", colour names. Pending Ali's confirmation (Impeccable Step 3 substitution, disclosed).
- DESIGN.md gets regenerated from shipped code with /impeccable document before deploy (section 0.1).

## D026, 2026-10-21: build steps 0–1 decisions
- **OpenAlex date filters:** `from_created_date` / `from_updated_date` are paid "daily sync" (Member+). Ingest re-lists works by publication date over a 45-day window and the ledger dedupes. Estimated ≈ $0.07/day at 6-hourly. data-sources.md cost table to be updated.
- **Paging:** keyless runs use page numbers (cursor paging needs a key). With `OPENALEX_API_KEY` set, cursor paging is used.
- **Dev database:** local Postgres 17 + pgvector with Supabase auth stubs (`scripts/db/local-setup.sh`), because Supabase local needs Docker. The migration is the full tested schema (0001_init.sql).
- **Service worker:** hand-written `public/sw.js` for step 1 (shell + offline fallback). Serwist will be reconsidered when offline caching of paper JSON lands (step 3).
- **Sheet motion:** the in-house spring engine (ported from the tested prototype) instead of the motion library, to avoid a dependency for one component. motion stays an option.
- **Fonts:** self-hosted via next/font (`--nf-*` vars referenced by the tokens).
- **Impeccable detector:** flags Geist as an overused font. Deferred to /replica-brand (a more distinctive sans, e.g. Schibsted Grotesk or Hanken Grotesk, with the same metrics roles).

## D027, 2026-10-21: working rules for this session (user)
- Never chain a commit after tests with `;`. Use `&&`, or run tests and commit as separate steps (twice last session a commit went in with failing tests or stale files).
- At the end of every step, update the "Resume here" note at the top of PROGRESS.md: done, half-done, exact next command.
- Keep using ecc:plan before each step, tdd-guide + ecc:tdd-workflow for new logic, code-reviewer after each milestone, and the section 0.1 design-skill map.
- Correction: commit 4300f55's message says "audit report", but the report file was never written (the GateGuard hook blocked it). It is re-saved in Part B1.

## D028, 2026-10-21: final topic labels (user approved)
Plain terms researchers search, different from the reference app's wording: Compound flooding · Storm surge and waves · Sea-level rise and tides · Subsidence · Coastal erosion · Coastal geotechnics · Extreme value analysis · Climate variability · Flood risk · Climate adaptation · Modelling and machine learning · Remote sensing and forecasting · Hydrology. This supersedes D021. Coverage (keywords) is unchanged.

## D029, 2026-10-21: public repo (user approved)
https://github.com/alimemon765/project-name-app is public, AGPL-3.0 detected. History squashed to one commit (c18a1aa) authored by 229493490+alimemon765@users.noreply.github.com (set with `git config --local`). The full 27-commit history is backed up at ~/coastal-hub-private/history-backup/coastal-hub-full-history-2026-10-21.bundle (verified).
