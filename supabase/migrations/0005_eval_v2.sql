-- 0005: classifier eval v2 (C2, Ali's brief 2026-10-23). Items record how they were drawn; labels carry Ali's verdict
-- on the reference labels, plus regions, a one-line reason and an unsure flag.

alter table classifier_eval_items
  add column near_miss_term text,                       -- the keyword trap that drew a near-miss item
  add column pub_date date,
  add column in_review_queue boolean not null default false;   -- Ali's 50: every unsure item plus a seeded fill

alter table classifier_labels
  add column verdict text check (verdict in ('correct', 'wrong_topic', 'off_topic', 'skip')),
  add column region_ids smallint[] not null default '{}',
  add column reason text check (reason is null or length(reason) <= 300),
  add column unsure boolean not null default false,
  alter column in_scope drop not null,
  add constraint verdict_is_ali_only check (verdict is null or labeller = 'ali'),
  add constraint reference_has_reason check (labeller <> 'reference' or (reason is not null and in_scope is not null)),
  add constraint skip_or_answer check (in_scope is not null or verdict = 'skip');
create index classifier_eval_items_queue_idx on classifier_eval_items (review_order) where in_review_queue;
