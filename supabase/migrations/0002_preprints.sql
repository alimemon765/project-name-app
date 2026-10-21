-- 0002: preprint servers as journals rows + a ledger for records without an OpenAlex id (step 2, C1).

-- ESSOAr has no OpenAlex source, so openalex_id is only required for journals ingested from OpenAlex.
alter table journals alter column openalex_id drop not null;
alter table journals add constraint journals_openalex_source_has_id
  check (ingest_source not in ('openalex', 'openalex_search') or openalex_id is not null);
create unique index journals_preprint_server_abbr_uniq on journals (abbreviation) where is_preprint_server;

insert into journals (openalex_id, name, abbreviation, publisher_group, publisher, is_oa, is_preprint_server, ingest_source, ingest_config, verified, sort_order)
values
  ('S4306400194', 'arXiv', 'arXiv', 'Preprints', 'Cornell University', true, true, 'arxiv',
   '{"categories": ["physics.ao-ph", "physics.geo-ph"]}', true, 1000),
  (null, 'ESS Open Archive', 'ESSOAr', 'Preprints', 'AGU, via Authorea', true, true, 'crossref_prefix',
   '{"prefix": "10.22541", "doi_pattern": "^10\\.22541/essoar\\."}', true, 1001),
  ('S4306402614', 'EarthArXiv', 'EarthArXiv', 'Preprints', 'California Digital Library', true, true, 'oai_pmh',
   '{"endpoint": "https://eartharxiv.org/api/oai/"}', true, 1002),
  ('S4210172589', 'SSRN', 'SSRN', 'Preprints', 'Elsevier', true, true, 'crossref_prefix', '{"prefix": "10.2139", "date": "created"}', true, 1003)
on conflict do nothing;

-- Every preprint we looked at (gated in or out), keyed by the server's own id: dedupe, counts, re-classification.
create table preprint_ledger (
  server        text not null check (server in ('arxiv', 'essoar', 'eartharxiv', 'ssrn')),
  source_id     text not null,
  doi           text check (doi is null or doi = lower(doi)),
  journal_id    uuid not null references journals(id) on delete restrict,
  pub_date      date not null,
  first_seen_at timestamptz not null default now(),
  classified    boolean not null,                                -- true => row exists in papers
  classifier_version smallint not null,
  primary key (server, source_id)
);
create index preprint_ledger_journal_date_idx on preprint_ledger (journal_id, pub_date);
alter table preprint_ledger enable row level security;            -- internal: service role only

-- Linking a preprint to its journal version matches on a normalised title.
create index papers_title_norm_idx on papers ((lower(regexp_replace(title, '[^[:alnum:]]+', '', 'g'))));
