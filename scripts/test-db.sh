#!/usr/bin/env bash
# Runs the migration, seed and RLS checks against a throwaway local Postgres.
# Needs a running Postgres you can connect to. Usage:
#   PGHOST=localhost PGPORT=5432 PGUSER=postgres scripts/test-db.sh
# Read the output: every "must fail" line should be followed by an ERROR,
# and every "(expect 0)" count should be 0.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=tutoring_rls_test
psql -q -v ON_ERROR_STOP=1 -c "drop database if exists $DB" -c "create database $DB"
psql -q -v ON_ERROR_STOP=1 -d $DB -f supabase/tests/supabase-shim.sql
for f in supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d $DB -f "$f"; done
psql -q -v ON_ERROR_STOP=1 -d $DB -f supabase/seed.sql
psql -q -d $DB -f supabase/tests/rls.sql
