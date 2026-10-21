#!/bin/sh
# Local Postgres 17 + pgvector for development (Supabase local needs Docker, which this machine lacks).
# Creates ./.localdb (gitignored) on port 55433, listening on localhost only, with two databases:
#   coastal       development data (ingest and backfills write here)
#   coastal_test  integration tests only, so tests never touch dev data or wait on a running job's lock
# Each gets the auth stub, every migration not yet applied (tracked in local_dev.migrations), then the seed.
set -eu
export LC_ALL=en_US.UTF-8
DIR="$(pwd)/.localdb"; PORT=55433
if [ ! -d "$DIR" ]; then initdb -D "$DIR" -U postgres -A trust >/dev/null; fi
pg_ctl -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=localhost" -l "$DIR/log" status >/dev/null 2>&1 \
  || pg_ctl -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=localhost" -l "$DIR/log" start >/dev/null
sleep 1
P="psql -h localhost -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"

setup_db() {
  db="$1"
  $P -tc "select 1 from pg_database where datname='$db'" | grep -q 1 || $P -c "create database $db"
  if [ "$($P -d "$db" -tAc "select to_regclass('public.papers') is not null")" = "f" ]; then
    $P -d "$db" -f scripts/db/auth_stub.sql
  fi
  # Local-only migration ledger (Supabase keeps its own in production). A database created before this
  # ledger existed already has 0001 applied.
  $P -d "$db" -c "create schema if not exists local_dev; create table if not exists local_dev.migrations (name text primary key, applied_at timestamptz not null default now())"
  if [ "$($P -d "$db" -tAc "select to_regclass('public.papers') is not null")" = "t" ]; then
    $P -d "$db" -c "insert into local_dev.migrations (name) values ('0001_init.sql') on conflict do nothing"
  fi
  for m in supabase/migrations/*.sql; do
    name=$(basename "$m")
    case "$name" in *[!A-Za-z0-9_.-]*) echo "skipping unexpected migration name: $name" >&2; continue ;; esac
    if [ -z "$($P -d "$db" -tAc "select 1 from local_dev.migrations where name = '$name'")" ]; then
      echo "[$db] applying $m"
      $P -d "$db" -1 -f "$m"
      $P -d "$db" -c "insert into local_dev.migrations (name) values ('$name')"
    fi
  done
  DATABASE_URL="postgres://postgres@localhost:$PORT/$db" npx tsx workers/seed.ts
}

setup_db coastal
setup_db coastal_test
echo "local db ready: postgres://postgres@localhost:$PORT/coastal (tests: .../coastal_test)"
