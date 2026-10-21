#!/bin/sh
# Local Postgres 17 + pgvector for development (Supabase local needs Docker, which this machine lacks).
# Creates ./.localdb (gitignored) on port 55433, database "coastal", applies the auth stub + migrations, then seeds.
set -eu
export LC_ALL=en_US.UTF-8
DIR="$(pwd)/.localdb"; PORT=55433
if [ ! -d "$DIR" ]; then initdb -D "$DIR" -U postgres -A trust >/dev/null; fi
pg_ctl -D "$DIR" -o "-p $PORT -k $DIR" -l "$DIR/log" status >/dev/null 2>&1 || pg_ctl -D "$DIR" -o "-p $PORT -k $DIR" -l "$DIR/log" start >/dev/null
sleep 1
P="psql -h localhost -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$P -tc "select 1 from pg_database where datname='coastal'" | grep -q 1 || $P -c "create database coastal"
if [ "$($P -d coastal -tAc "select to_regclass('public.papers') is not null")" = "f" ]; then
  $P -d coastal -f scripts/db/auth_stub.sql
fi
# Local-only migration ledger (Supabase keeps its own in production). A database created before this
# ledger existed already has 0001 applied.
$P -d coastal -c "create schema if not exists local_dev; create table if not exists local_dev.migrations (name text primary key, applied_at timestamptz not null default now())"
if [ "$($P -d coastal -tAc "select to_regclass('public.papers') is not null")" = "t" ]; then
  $P -d coastal -c "insert into local_dev.migrations (name) values ('0001_init.sql') on conflict do nothing"
fi
for m in supabase/migrations/*.sql; do
  name=$(basename "$m")
  if [ -z "$($P -d coastal -tAc "select 1 from local_dev.migrations where name = '$name'")" ]; then
    echo "applying $m"
    $P -d coastal -1 -f "$m"
    $P -d coastal -c "insert into local_dev.migrations (name) values ('$name')"
  fi
done
npx tsx workers/seed.ts
echo "local db ready: postgres://postgres@localhost:$PORT/coastal"
