-- PROJECT_NAME: full schema (design for v1 + v1.5 + v2)
-- Postgres 15+ on Supabase. Extensions: pgcrypto (gen_random_uuid), vector (pgvector >= 0.7, halfvec), pg_trgm.
-- Release tags: every table is marked [v1] / [v1.5] / [v2]. Migrations ship v1 first; later tables are already designed
-- so they add columns/tables only (no rewrites of v1 tables).
-- Conventions: uuid PKs (except small lookup tables using smallint / text keys), timestamptz in UTC,
-- created_at/updated_at on mutable tables, explicit ON DELETE rules, RLS on every table.
-- Catalogue tables: public read (anon + authenticated), writes only via service role (workers), so no write policies.
-- User tables: owner-only via auth.uid().

create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pg_trgm;

-- shared trigger -----------------------------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ============================================================================================================
-- CATALOGUE [v1]
-- ============================================================================================================

-- [v1] publisher groups and journals / preprint servers (seed: data/journals.json)
create table journals (
  id              uuid primary key default gen_random_uuid(),
  openalex_id     text not null unique,                       -- e.g. S196734849
  name            text not null,
  abbreviation    text not null,                              -- card label, e.g. "Sci. Rep."
  publisher_group text not null,                              -- e.g. 'Copernicus', 'Preprints'
  publisher       text,
  issns           text[] not null default '{}',
  issn_l          text,
  is_oa           boolean not null default false,
  is_preprint_server boolean not null default false,
  ingest_source   text not null default 'openalex'
    check (ingest_source in ('openalex','arxiv','crossref_prefix','oai_pmh','openalex_search')),
  ingest_config   jsonb not null default '{}',                -- e.g. {"categories":["physics.ao-ph"]}
  enabled         boolean not null default true,
  verified        boolean not null default false,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index journals_group_idx on journals (publisher_group, sort_order);
create trigger journals_updated before update on journals for each row execute function set_updated_at();

-- [v1] the 13 topics
create table topics (
  id          smallint primary key,                           -- stable, small: used in papers.topic_ids
  slug        text not null unique,
  name        text not null,
  sort_order  smallint not null,
  default_on  boolean not null default true,
  created_at  timestamptz not null default now()
);

-- [v1] classifier layer 1: editable keyword rules (seed + moderated user-shared)
create table keywords (
  id          uuid primary key default gen_random_uuid(),
  topic_id    smallint not null references topics(id) on delete cascade,
  term        text not null,                                  -- phrase, matched case-insensitively on title+abstract
  weight      real not null default 1.0 check (weight > 0),
  kind        text not null default 'include' check (kind in ('include','exclude')),
  source      text not null default 'seed' check (source in ('seed','user_shared','admin')),
  status      text not null default 'active' check (status in ('active','pending','rejected')),
  created_at  timestamptz not null default now(),
  unique (topic_id, term, kind)
);
create index keywords_active_idx on keywords (topic_id) where status = 'active';

-- [v1] classifier layer 2: exemplar papers per topic (embedding centroids are computed from these)
create table topic_exemplars (
  topic_id    smallint not null references topics(id) on delete cascade,
  paper_id    uuid not null,                                  -- FK added after papers
  primary key (topic_id, paper_id)
);

-- [v1] region hierarchy + gazetteer (lat/lon for the paper map)
create table regions (
  id          smallint primary key,
  slug        text not null unique,
  name        text not null,
  parent_id   smallint references regions(id) on delete restrict,
  level       smallint not null check (level between 0 and 3), -- 0 macro (South & East Asia) … 3 city (Mumbai)
  lat         double precision,
  lon         double precision,
  aliases     text[] not null default '{}',                   -- gazetteer names incl. local spellings
  sort_order  smallint not null default 0
);
create index regions_parent_idx on regions (parent_id);

-- [v1] papers: full rows only for classified (>=1 topic) works
create table papers (
  id                 uuid primary key default gen_random_uuid(),
  doi                text unique check (doi is null or doi = lower(doi)),  -- normalised: lower, no https://doi.org/
  openalex_id        text unique,                                          -- W…
  arxiv_id           text unique,
  title              text not null,
  abstract           text,                                                  -- null when the source has none
  abstract_source    text check (abstract_source in ('openalex','crossref','arxiv','oai')),
  authors_display    text not null default '',                              -- "Cao, Li, …" denormalised for cards + FTS
  author_count       int not null default 0,
  journal_id         uuid not null references journals(id) on delete restrict,
  pub_date           date not null,
  first_seen_at      timestamptz not null default now(),                    -- drives "new since last visit"
  is_oa              boolean not null default false,
  oa_url             text,
  oa_status          text check (oa_status in ('gold','green','hybrid','bronze','diamond','closed')),
  licence            text,                                                  -- e.g. 'cc-by'
  cited_by_count     int not null default 0,
  citations_by_year  jsonb not null default '{}',                           -- {"2026": 4, "2025": 9}
  trending_score     real not null default 0,                               -- citations (this+last yr) / months since pub
  citations_refreshed_at timestamptz,
  topic_ids          smallint[] not null default '{}',
  topic_scores       jsonb not null default '{}',                           -- {"3":0.82,"11":0.41} confidence per topic
  region_ids         smallint[] not null default '{}',
  is_preprint        boolean not null default false,
  published_version_id uuid references papers(id) on delete set null,       -- preprint -> its published version
  retraction_status  text not null default 'none'
    check (retraction_status in ('none','retracted','corrected','expression_of_concern','withdrawn')),
  retraction_notice_doi text,
  has_code           boolean not null default false,                        -- [v1.5] badge, filled by link worker
  has_data           boolean not null default false,                        -- [v1.5]
  embedding          halfvec(384),                                          -- gte-small; null until embedded
  classifier_version smallint not null default 1,
  search_tsv         tsvector generated always as (
                       setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
                       setweight(to_tsvector('english', coalesce(left(abstract, 20000),'')), 'B') ||
                       setweight(to_tsvector('simple',  coalesce(authors_display,'')), 'C')
                     ) stored,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint paper_has_identifier check (doi is not null or openalex_id is not null or arxiv_id is not null),
  embed_model        text,                                                  -- e.g. 'Xenova/gte-small@<rev>:fp32'; re-embed on change
  constraint preprint_not_self check (published_version_id is null or published_version_id <> id),
  constraint preprint_link_only_from_preprint check (published_version_id is null or is_preprint),
  constraint doi_shape check (doi is null or doi ~ '^10\.\d{4,9}/\S+$')
) with (fillfactor = 85);                                                    -- room for HOT updates on daily citation refresh
create index papers_feed_date_idx     on papers (pub_date desc, id desc) where published_version_id is null;
create index papers_journal_date_idx  on papers (journal_id, pub_date desc);
create index papers_first_seen_idx    on papers (first_seen_at desc, id desc) where published_version_id is null;
create index papers_cited_idx         on papers (cited_by_count desc, id desc) where published_version_id is null;
create index papers_trending_idx      on papers (trending_score desc, id desc) where published_version_id is null;
create index papers_topics_gin        on papers using gin (topic_ids);
create index papers_regions_gin       on papers using gin (region_ids);
create index papers_search_gin        on papers using gin (search_tsv);
create index papers_published_ver_idx on papers (published_version_id) where published_version_id is not null;
create index papers_cite_refresh_idx  on papers (citations_refreshed_at nulls first);
create index papers_embedding_hnsw    on papers using hnsw (embedding halfvec_cosine_ops)
  with (m = 16, ef_construction = 128) where embedding is not null;   -- query: set local hnsw.ef_search = 60; iterative_scan = relaxed_order
create trigger papers_updated before update on papers for each row execute function set_updated_at();

alter table topic_exemplars add constraint topic_exemplars_paper_fk
  foreign key (paper_id) references papers(id) on delete cascade;

-- [v1] every fetched work (relevant or not): dedupe, journal counts, reclassification
create table paper_ledger (
  openalex_id   text primary key,
  doi           text check (doi is null or doi = lower(doi)),
  journal_id    uuid not null references journals(id) on delete restrict,   -- keep dedupe history
  pub_date      date not null,
  first_seen_at timestamptz not null default now(),
  classified    boolean not null,                              -- true => row exists in papers
  classifier_version smallint not null
);
create index paper_ledger_journal_date_idx on paper_ledger (journal_id, pub_date);
create index paper_ledger_doi_idx on paper_ledger (doi) where doi is not null;

-- [v1] authors (OpenAlex author IDs, ORCID)
create table authors (
  id           uuid primary key default gen_random_uuid(),
  openalex_id  text unique,
  orcid        text unique,
  display_name text not null,
  last_known_institution text,
  works_count  int,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index authors_name_trgm on authors using gin (display_name gin_trgm_ops);
create trigger authors_updated before update on authors for each row execute function set_updated_at();

create table paper_authors (                                   -- [v1]
  paper_id   uuid not null references papers(id) on delete cascade,
  author_id  uuid not null references authors(id) on delete cascade,
  position   smallint not null,
  is_corresponding boolean not null default false,
  primary key (paper_id, position)
);
create index paper_authors_author_idx on paper_authors (author_id, paper_id);

-- [v1] cached research connections (References / Cited by / Similar), refreshed lazily (7-day TTL)
create table paper_connections (
  paper_id     uuid not null references papers(id) on delete cascade,
  kind         text not null check (kind in ('references','cited_by','similar')),
  openalex_ids text[] not null default '{}',                   -- may point outside our corpus
  total_count  int not null default 0,
  fetched_at   timestamptz not null default now(),
  primary key (paper_id, kind)
);

-- [v1] news
create table news_sources (
  id           smallint primary key,
  slug         text not null unique,
  name         text not null,
  feed_url     text not null,
  filter_mode  text not null default 'none' check (filter_mode in ('none','keyword','nature_news_keyword')),
  enabled      boolean not null default true,
  etag         text,
  last_modified text,
  last_fetched_at timestamptz
);
create table news_items (
  id           uuid primary key default gen_random_uuid(),
  source_id    smallint not null references news_sources(id) on delete cascade,
  url          text not null unique,
  title        text not null,
  snippet      text,                                           -- plain text, <= 400 chars, never the full article
  published_at timestamptz not null,
  created_at   timestamptz not null default now()
);
create index news_items_published_idx on news_items (published_at desc);
create index news_items_source_idx on news_items (source_id, published_at desc);

-- ============================================================================================================
-- USERS [v1]
-- ============================================================================================================

-- [v1] profile row per Supabase auth user
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  orcid         text,
  timezone      text not null default 'UTC',                   -- IANA, e.g. 'Asia/Kolkata'
  plan          text not null default 'free' check (plan in ('free','trial','premium')),  -- read model; truth in entitlements [v2]
  last_visit_at timestamptz,                                    -- account-level "new since last visit"
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

-- [v1] preferences (mirrors the local-only shape so merge is a straight upsert)
create table user_prefs (
  user_id         uuid primary key references profiles(id) on delete cascade,
  topics_on       smallint[] not null default '{1,2,3,4,5,6,7,8,9,10,11,12,13}',
  journals_off    uuid[] not null default '{}',                 -- store the exceptions, not the 131 defaults
  user_keywords   jsonb not null default '{}',                  -- {"3": ["king tide","nuisance flooding"]}
  share_keywords  boolean not null default false,
  feed_window_days   smallint not null default 30 check (feed_window_days in (7,14,30,60,90,365,730,1825)),
  search_window_days smallint not null default 30 check (search_window_days in (7,14,30,60,90,365,730,1825)),
  theme           text not null default 'system' check (theme in ('light','dark','system')),
  onboarded_at    timestamptz,
  updated_at      timestamptz not null default now()
);
create trigger user_prefs_updated before update on user_prefs for each row execute function set_updated_at();

-- [v1] follows: topic | journal | author | region
create table follows (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  kind        text not null check (kind in ('topic','journal','author','region')),
  topic_id    smallint references topics(id) on delete cascade,
  journal_id  uuid references journals(id) on delete cascade,
  author_id   uuid references authors(id) on delete cascade,
  region_id   smallint references regions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint follows_one_target check (
    num_nonnulls(topic_id, journal_id, author_id, region_id) = 1 and
    ((kind = 'topic'   and topic_id   is not null) or
     (kind = 'journal' and journal_id is not null) or
     (kind = 'author'  and author_id  is not null) or
     (kind = 'region'  and region_id  is not null)))
);
create unique index follows_unique on follows (user_id, kind, topic_id, journal_id, author_id, region_id) nulls not distinct;
create index follows_topic_idx on follows (topic_id) where topic_id is not null;
create index follows_region_idx on follows (region_id) where region_id is not null;
create index follows_author_idx on follows (author_id) where author_id is not null;
create index follows_journal_idx on follows (journal_id) where journal_id is not null;

-- [v1] saves (bookmarks)
create table saves (
  user_id    uuid not null references profiles(id) on delete cascade,
  paper_id   uuid not null references papers(id) on delete cascade,
  saved_at   timestamptz not null default now(),               -- kept from the device on merge
  primary key (user_id, paper_id)
);
create index saves_user_time_idx on saves (user_id, saved_at desc);

-- [v1] Web Push subscriptions
create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  failures    smallint not null default 0,                     -- delete on 404/410 or failures >= 5
  created_at  timestamptz not null default now(),
  last_ok_at  timestamptz
);
create index push_subscriptions_user_idx on push_subscriptions (user_id);

-- [v1] alert rules (push now; email digests in v2). Free limit enforced in the server action.
create table alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  channel      text not null check (channel in ('push','email')),
  cadence      text not null check (cadence in ('daily','weekly')),
  scope        text not null default 'my_feed' check (scope in ('my_feed','saved_search')),
  saved_search_id uuid,                                         -- [v2] FK added below
  send_dow     smallint check (send_dow between 0 and 6),       -- weekly only
  send_hour    smallint not null default 8 check (send_hour between 0 and 23),  -- in profiles.timezone
  enabled      boolean not null default true,
  last_sent_at timestamptz,
  created_at   timestamptz not null default now()
);
create index alerts_due_idx on alerts (enabled, cadence, send_hour);
create index alerts_user_idx on alerts (user_id);

-- [v1] idempotent send log for push + email
create table digests_sent (
  id          uuid primary key default gen_random_uuid(),
  alert_id    uuid not null references alerts(id) on delete cascade,
  period_key  text not null,                                   -- e.g. '2026-W43' or '2026-10-21' (user TZ)
  paper_count int not null,
  sent_at     timestamptz not null default now(),
  provider_id text,
  unique (alert_id, period_key)                                -- a retry can never double-send
);

-- [v1] moderation queue: shared keywords now; tools, conference suggestions later
create table submissions (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('keyword','tool','conference','correction')),
  submitted_by uuid references profiles(id) on delete set null,  -- null = anonymous keyword share
  payload      jsonb not null,
  dedupe_key   text,                                           -- e.g. normalised repo URL or topic:term
  status       text not null default 'pending' check (status in ('pending','approved','rejected','duplicate')),
  reviewer_note text,
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);
create index submissions_queue_idx on submissions (status, kind, created_at);
create unique index submissions_dedupe_pending on submissions (kind, dedupe_key) where status = 'pending' and dedupe_key is not null;

-- [v1] worker runs + API spend
create table job_runs (
  id           uuid primary key default gen_random_uuid(),
  job          text not null,                                  -- 'ingest_papers','refresh_citations','ingest_news',…
  run_key      text not null,                                  -- idempotency, e.g. 'ingest_papers:2026-10-21T09'
  status       text not null check (status in ('running','succeeded','failed','skipped')),
  attempt      smallint not null default 1,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  items_in     int not null default 0,
  items_out    int not null default 0,
  spend_usd    numeric(10,5) not null default 0,               -- OpenAlex / Claude cost reported by headers
  error        text,
  meta         jsonb not null default '{}',
  unique (job, run_key, attempt)
);
create index job_runs_recent_idx on job_runs (job, started_at desc);

-- [v1] admins (admin page access)
create table admins (
  user_id uuid primary key references profiles(id) on delete cascade
);

-- ============================================================================================================
-- TOOLS HUB [v1.5]
-- ============================================================================================================

create table tool_categories (                                 -- [v1.5] the 13 categories
  id         smallint primary key,
  slug       text not null unique,
  name       text not null,
  topic_ids  smallint[] not null default '{}',
  sort_order smallint not null
);

create table tools (                                           -- [v1.5] software, models, viewers, curated lists
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  kind           text not null check (kind in ('software','model','viewer','library','list')),
  description    text not null,                                -- our own one-liner, never the README
  repo_url       text unique check (repo_url is null or repo_url = lower(repo_url)),
  homepage_url   text,
  docs_url       text,
  source         text not null check (source in ('seed','github','ecosystems','pypi','conda','zenodo','hydroshare','csdms','deltares','submission')),
  category_id    smallint not null references tool_categories(id) on delete restrict,
  topic_ids      smallint[] not null default '{}',
  language       text,
  licence        text,                                         -- SPDX id
  stars          int, forks int,
  last_commit_at timestamptz,
  latest_release text,
  maintenance    text check (maintenance in ('active','slowing','stale','archived')),
  software_doi   text check (software_doi is null or software_doi = lower(software_doi)),
  install        jsonb not null default '{}',                  -- {"pip":"pip install pytmd","conda":"…"}
  has_notebooks  boolean not null default false,
  relevance_score real,
  status         text not null default 'unverified' check (status in ('unverified','verified','hidden')),
  embedding      halfvec(384),
  stats_refreshed_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index tools_category_idx on tools (category_id) where status <> 'hidden';
create index tools_topics_gin on tools using gin (topic_ids);
create index tools_name_trgm on tools using gin (name gin_trgm_ops);
create index tools_embedding_hnsw on tools using hnsw (embedding halfvec_cosine_ops)
  with (m = 16, ef_construction = 128) where embedding is not null;
create trigger tools_updated before update on tools for each row execute function set_updated_at();

create table datasets (                                        -- [v1.5]
  id          uuid primary key default gen_random_uuid(),
  doi         text unique check (doi is null or doi = lower(doi)),
  name        text not null,
  description text not null,
  repository  text check (repository in ('zenodo','pangaea','hydroshare','figshare','dryad','portal','other')),
  url         text not null,
  licence     text,
  topic_ids   smallint[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger datasets_updated before update on datasets for each row execute function set_updated_at();

create table tool_paper_links (                                -- [v1.5] two-way paper <-> tool/dataset
  id          uuid primary key default gen_random_uuid(),
  paper_id    uuid not null references papers(id) on delete cascade,
  tool_id     uuid references tools(id) on delete cascade,
  dataset_id  uuid references datasets(id) on delete cascade,
  link_type   text not null check (link_type in ('uses','introduces','cites_software_doi','code_for_paper','data_for_paper')),
  evidence    text not null check (evidence in ('abstract_url','crossref_relation','openalex_citation','readme_doi','zenodo_relation','manual')),
  evidence_detail text,                                        -- the URL / DOI string that matched
  confidence  real not null default 1.0 check (confidence between 0 and 1),
  created_at  timestamptz not null default now(),
  constraint tpl_one_target check (num_nonnulls(tool_id, dataset_id) = 1)
);
create unique index tpl_unique on tool_paper_links (paper_id, coalesce(tool_id, dataset_id), link_type);
create index tpl_tool_idx on tool_paper_links (tool_id) where tool_id is not null;
create index tpl_dataset_idx on tool_paper_links (dataset_id) where dataset_id is not null;

-- ============================================================================================================
-- WORKFLOW + AI + BILLING [v2]
-- ============================================================================================================

create table collections (                                     -- [v2]
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  name        text not null,
  description text,
  is_public   boolean not null default false,
  share_slug  text unique,                                     -- set when made public
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index collections_user_idx on collections (user_id);
create trigger collections_updated before update on collections for each row execute function set_updated_at();

create table collection_items (                                -- [v2]
  collection_id uuid not null references collections(id) on delete cascade,
  paper_id      uuid not null references papers(id) on delete cascade,
  note          text,
  reading_status text not null default 'to_read' check (reading_status in ('to_read','reading','done')),
  tags          text[] not null default '{}',
  added_at      timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (collection_id, paper_id)
);
create index collection_items_paper_idx on collection_items (paper_id);
create trigger collection_items_updated before update on collection_items for each row execute function set_updated_at();

create table ratings (                                         -- [v2] thumbs for recommendations
  user_id   uuid not null references profiles(id) on delete cascade,
  paper_id  uuid not null references papers(id) on delete cascade,
  value     smallint not null check (value in (-1, 1)),
  rated_at  timestamptz not null default now(),
  primary key (user_id, paper_id)
);
create index ratings_paper_idx on ratings (paper_id);

create table user_interest_vectors (                           -- [v2] per-user relevance model (centroid / logistic weights)
  user_id    uuid primary key references profiles(id) on delete cascade,
  positive   halfvec(384),
  negative   halfvec(384),
  n_ratings  int not null default 0,
  updated_at timestamptz not null default now()
);

create table saved_searches (                                  -- [v2]
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  name       text not null,
  query      jsonb not null,                                   -- {"q":"compound flooding","topics":[1],"regions":[42]}
  created_at timestamptz not null default now()
);
create index saved_searches_user_idx on saved_searches (user_id);
alter table alerts add constraint alerts_saved_search_fk
  foreign key (saved_search_id) references saved_searches(id) on delete cascade;
alter table alerts add constraint alerts_scope_target
  check ((scope = 'saved_search') = (saved_search_id is not null));

create table ai_summaries (                                    -- [v2] cache, one per paper per kind per model version
  id           uuid primary key default gen_random_uuid(),
  paper_id     uuid not null references papers(id) on delete cascade,
  kind         text not null check (kind in ('summary','student','key_findings','code_and_data')),
  input_basis  text not null check (input_basis in ('abstract','fulltext_oa')),
  model        text not null,
  prompt_version smallint not null,
  body         jsonb not null,                                 -- structured output incl. section-cited quotes
  input_tokens int not null, output_tokens int not null,
  cost_usd     numeric(10,5) not null,
  created_at   timestamptz not null default now(),
  unique (paper_id, kind, model, prompt_version)
);

create table ai_usage (                                        -- [v2] per-user caps
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  paper_ids  uuid[] not null,
  action     text not null check (action in ('summary','qa','compare','student','code_and_data')),
  cache_hit  boolean not null,
  cost_usd   numeric(10,5) not null default 0,
  created_at timestamptz not null default now()
);
create index ai_usage_user_time_idx on ai_usage (user_id, created_at desc);

create table entitlements (                                    -- [v2] provider-agnostic billing state (truth for plan)
  user_id         uuid primary key references profiles(id) on delete cascade,
  plan            text not null check (plan in ('free','trial','premium')),
  provider        text check (provider in ('paddle','lemonsqueezy','razorpay','stripe','manual')),
  provider_customer_id text,
  provider_subscription_id text unique,
  status          text not null check (status in ('trialing','active','past_due','canceled','expired')),
  trial_ends_at   timestamptz,
  current_period_end timestamptz,
  price_cents     int check (price_cents >= 0),
  currency        char(3),
  updated_at      timestamptz not null default now()
);
create trigger entitlements_updated before update on entitlements for each row execute function set_updated_at();

create table billing_events (                                  -- [v2] webhook idempotency
  provider     text not null,
  event_id     text not null,
  type         text not null,
  payload      jsonb not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  primary key (provider, event_id)
);

create table conferences (                                     -- [v2] curated calendar
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  url        text not null,
  starts_on  date not null,
  ends_on    date not null check (ends_on >= starts_on),
  location   text,
  abstract_deadline date,
  topic_ids  smallint[] not null default '{}',
  status     text not null default 'published' check (status in ('published','pending')),
  created_at timestamptz not null default now()
);
create index conferences_start_idx on conferences (starts_on);

-- ============================================================================================================
-- ROW LEVEL SECURITY
-- ============================================================================================================
-- Catalogue: read for everyone; no insert/update/delete policies => only the service role (workers) can write.
do $$ declare t text; begin
  foreach t in array array['journals','topics','keywords','topic_exemplars','regions','papers','authors',
    'paper_authors','paper_connections','news_sources','news_items','tool_categories','tools','datasets',
    'tool_paper_links','conferences'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select to anon, authenticated using (true)', t || '_read', t);
  end loop;
end $$;
-- Hide pending/rejected rows from the public on moderated catalogue tables.
drop policy keywords_read on keywords;
create policy keywords_read on keywords for select to anon, authenticated using (status = 'active');
drop policy tools_read on tools;
create policy tools_read on tools for select to anon, authenticated using (status <> 'hidden');
drop policy conferences_read on conferences;
create policy conferences_read on conferences for select to anon, authenticated using (status = 'published');

-- Internal tables: RLS on, no policies => service role only.
alter table paper_ledger enable row level security;
alter table job_runs enable row level security;
alter table admins enable row level security;
alter table billing_events enable row level security;
alter table ai_summaries enable row level security;   -- served through a server route that checks entitlement
alter table user_interest_vectors enable row level security;

-- Owner-only user tables.
do $$ declare t text; begin
  foreach t in array array['user_prefs','follows','saves','push_subscriptions','alerts','ratings',
    'saved_searches','collections','ai_usage','entitlements'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
alter table profiles enable row level security;
create policy profiles_read on profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update on profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Column-level lock: users may edit only these columns; `plan` is written by the service role (billing webhook).
revoke insert, update, delete on profiles from anon, authenticated;
grant update (display_name, orcid, timezone, last_visit_at) on profiles to authenticated;
create policy user_prefs_self on user_prefs for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy follows_self on follows for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy saves_self on saves for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_self on push_subscriptions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy alerts_self on alerts for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy ratings_self on ratings for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy saved_searches_self on saved_searches for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy collections_self on collections for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy collections_public_read on collections for select to anon, authenticated using (is_public);
alter table collection_items enable row level security;
create policy collection_items_owner on collection_items for all to authenticated
  using (exists (select 1 from collections c where c.id = collection_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from collections c where c.id = collection_id and c.user_id = (select auth.uid())));
create policy collection_items_public_read on collection_items for select to anon, authenticated
  using (exists (select 1 from collections c where c.id = collection_id and c.is_public));
create policy ai_usage_self_read on ai_usage for select to authenticated using (user_id = (select auth.uid()));
create policy entitlements_self_read on entitlements for select to authenticated using (user_id = (select auth.uid()));
alter table digests_sent enable row level security;  -- service role only
alter table submissions enable row level security;
create policy submissions_insert on submissions for insert to anon, authenticated
  with check (status = 'pending' and (submitted_by is null or submitted_by = (select auth.uid())));
create policy submissions_own_read on submissions for select to authenticated using (submitted_by = (select auth.uid()));

-- ============================================================================================================
-- FUNCTIONS
-- ============================================================================================================

-- Create profile + prefs on sign-up.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name) values (new.id, new.raw_user_meta_data->>'full_name') on conflict do nothing;
  insert into user_prefs (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Merge device-local state into the signed-in account. Idempotent: safe to call on every sign-in.
-- p_saves: [{"paper_id": "<uuid>", "saved_at": "<iso>"}] (max 2000; malformed entries skipped).
-- p_prefs: partial user_prefs object; applied only if this account has never onboarded (account wins after that).
create or replace function merge_local_state(p_saves jsonb, p_prefs jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare
  uid uuid := (select auth.uid());
  uuid_re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  max_saves constant int := 2000;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if jsonb_typeof(coalesce(p_saves, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_saves, '[]'::jsonb)) > max_saves then
    raise exception 'p_saves must be an array of at most % items', max_saves;
  end if;
  insert into saves (user_id, paper_id, saved_at)
    select uid, v.pid, v.at
    from (
      select (s->>'paper_id')::uuid as pid,
             case when (s->>'saved_at') ~ '^\d{4}-\d{2}-\d{2}' then least((s->>'saved_at')::timestamptz, now()) else now() end as at
      from jsonb_array_elements(coalesce(p_saves, '[]'::jsonb)) s
      where lower(s->>'paper_id') ~ uuid_re
    ) v
    where exists (select 1 from papers p where p.id = v.pid)
  on conflict (user_id, paper_id) do update set saved_at = least(saves.saved_at, excluded.saved_at);
  if p_prefs is null then return; end if;
  update user_prefs set
    topics_on          = coalesce((select array_agg(x::smallint) from jsonb_array_elements_text(p_prefs->'topics_on') x where x ~ '^\d{1,2}$'), topics_on),
    journals_off       = coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(p_prefs->'journals_off') x where lower(x) ~ uuid_re), journals_off),
    user_keywords      = case when jsonb_typeof(p_prefs->'user_keywords') = 'object' then p_prefs->'user_keywords' else user_keywords end,
    feed_window_days   = case when (p_prefs->>'feed_window_days') in ('7','14','30','60','90') then (p_prefs->>'feed_window_days')::smallint else feed_window_days end,
    search_window_days = case when (p_prefs->>'search_window_days') in ('7','14','30','60','90') then (p_prefs->>'search_window_days')::smallint else search_window_days end,
    theme              = case when (p_prefs->>'theme') in ('light','dark','system') then p_prefs->>'theme' else theme end,
    onboarded_at       = now()
  where user_id = uid and onboarded_at is null;
end $$;

-- Free-tier alert cap enforced in the database, not only in the server action. (v2: raise for premium via entitlements.)
create or replace function enforce_alert_limit() returns trigger language plpgsql security definer set search_path = public as $$
declare free_alert_limit constant int := 2;
begin
  if (select count(*) from alerts where user_id = new.user_id) >= free_alert_limit
     and not exists (select 1 from profiles where id = new.user_id and plan in ('trial','premium')) then
    raise exception 'free plan allows % alerts', free_alert_limit using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger alerts_limit before insert on alerts for each row execute function enforce_alert_limit();

-- Lock down function execution (Postgres grants EXECUTE to PUBLIC by default).
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function enforce_alert_limit() from public, anon, authenticated;
revoke execute on function set_updated_at() from public, anon, authenticated;
revoke execute on function merge_local_state(jsonb, jsonb) from public, anon;
grant execute on function merge_local_state(jsonb, jsonb) to authenticated;
