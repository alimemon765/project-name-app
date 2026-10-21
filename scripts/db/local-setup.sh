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
  for m in supabase/migrations/*.sql; do echo "applying $m"; $P -d coastal -f "$m"; done
fi
npx tsx workers/seed.ts
echo "local db ready: postgres://postgres@localhost:$PORT/coastal"
