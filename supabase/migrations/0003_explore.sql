-- 0003: Explore (step 2, C3) — journal URL slugs; defence-in-depth URL check (security review, 2026-10-21).

-- Readable, stable filter URLs: ?j=nhess,sci-rep. Generated from the abbreviation, so seeds never set it.
alter table journals add column slug text generated always as
  (trim(both '-' from lower(regexp_replace(abbreviation, '[^A-Za-z0-9]+', '-', 'g')))) stored;
create unique index journals_slug_uniq on journals (slug);

-- Stored links are only ever http(s); app code already checks, the database now refuses anything else.
alter table papers add constraint papers_oa_url_http check (oa_url is null or oa_url ~* '^https?://');

-- Internal ledgers: RLS with no policies already denies anon/authenticated; revoke grants as well.
revoke all on preprint_ledger from anon, authenticated;
revoke all on paper_ledger from anon, authenticated;
