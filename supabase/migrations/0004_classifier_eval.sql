-- 0004: classifier evaluation (step 2, C2). A fixed eval set with text snapshots (so rejected works, which have no
-- papers row, can be judged too) and labels from people and from the reference pass.

create table classifier_eval_items (
  id              uuid primary key default gen_random_uuid(),
  stratum         text not null,                         -- e.g. 'journal:broad', 'journal:core', 'preprint:ssrn', 'rejected:broad'
  source_key      text not null unique,                  -- openalex id, or '<server>:<source_id>' for preprints
  paper_id        uuid references papers(id) on delete set null,
  doi             text,
  title           text not null,
  abstract        text,
  venue           text not null,                         -- journal abbreviation or preprint server
  predicted_topic_ids smallint[] not null default '{}',  -- what the classifier said when the set was drawn
  classifier_version smallint not null,
  review_order    int not null,                          -- fixed random order; the first 50 are the human review queue
  created_at      timestamptz not null default now()
);
create index classifier_eval_items_order_idx on classifier_eval_items (review_order);

create table classifier_labels (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references classifier_eval_items(id) on delete cascade,
  labeller        text not null check (labeller in ('ali', 'reference')),
  in_scope        boolean not null,                      -- false: not our field (off-topic)
  topic_ids       smallint[] not null default '{}',      -- the right topics when in scope
  note            text check (note is null or length(note) <= 500),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (item_id, labeller),
  constraint in_scope_has_topics check (not in_scope or cardinality(topic_ids) > 0)
);
create trigger classifier_labels_updated before update on classifier_labels for each row execute function set_updated_at();

alter table classifier_eval_items enable row level security;   -- internal: service role only
alter table classifier_labels enable row level security;
revoke all on classifier_eval_items, classifier_labels from anon, authenticated;
