#!/usr/bin/env bash
# ============================================================================
# Nova — one-command staging setup + verification.
#
#   Applies the base schema (optional), all migrations in order, then runs the
#   verification smoke test (which asserts triggers / RLS helpers / plan limits
#   and rolls itself back, leaving staging clean).
#
# Usage:
#   SUPABASE_DB_URL="postgresql://postgres:PW@HOST:5432/postgres" \
#     ./scripts/verify-staging.sh [--fresh] [--no-migrate] [--seed-demo]
#
#   # or pass the connection string as the first argument:
#   ./scripts/verify-staging.sh "postgresql://..." --fresh
#
# Flags:
#   --fresh       also apply supabase/schema.sql first (brand-new project)
#   --no-migrate  skip applying schema/migrations, just run verification
#   --seed-demo   insert a PERSISTENT demo workspace for manual QA (not rolled back)
#
# Get the connection string from Supabase: Project Settings → Database →
# Connection string → URI (use the direct connection, not the pooler, for DDL).
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT/supabase/migrations"
SCHEMA="$ROOT/supabase/schema.sql"
VERIFY="$ROOT/supabase/verify/verify.sql"
SEED_DEMO="$ROOT/supabase/verify/seed_demo.sql"

DB_URL=""; FRESH=0; NO_MIGRATE=0; SEED_DEMO_FLAG=0
for arg in "$@"; do
  case "$arg" in
    --fresh) FRESH=1 ;;
    --no-migrate) NO_MIGRATE=1 ;;
    --seed-demo) SEED_DEMO_FLAG=1 ;;
    postgres://*|postgresql://*) DB_URL="$arg" ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done
DB_URL="${DB_URL:-${SUPABASE_DB_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  echo "error: no database connection string." >&2
  echo "  set SUPABASE_DB_URL or pass it as the first argument." >&2
  exit 2
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "error: psql not found on PATH." >&2; exit 2
fi

PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -q)

blue()  { printf '\033[0;34m%s\033[0m\n' "$1"; }
green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
red()   { printf '\033[0;31m%s\033[0m\n' "$1"; }

blue "▶ Nova staging verification"
"${PSQL[@]}" -tc "select 'connected to ' || current_database();" | sed 's/^ */  /'

if [[ "$NO_MIGRATE" -eq 0 ]]; then
  # Quiet the idempotent "drop … if exists, skipping" NOTICEs while applying DDL.
  export PGOPTIONS="-c client_min_messages=warning"
  if [[ "$FRESH" -eq 1 ]]; then
    blue "▶ Applying base schema (schema.sql)"
    "${PSQL[@]}" -f "$SCHEMA"
  fi
  blue "▶ Applying migrations"
  for f in "$MIGRATIONS_DIR"/*.sql; do
    printf '  • %s\n' "$(basename "$f")"
    "${PSQL[@]}" -f "$f"
  done
  unset PGOPTIONS
  green "✓ migrations applied"
fi

if [[ "$SEED_DEMO_FLAG" -eq 1 && -f "$SEED_DEMO" ]]; then
  blue "▶ Seeding persistent demo data"
  "${PSQL[@]}" -f "$SEED_DEMO"
  green "✓ demo data seeded"
fi

blue "▶ Running verification (isolated, auto-rolled-back)"
if "${PSQL[@]}" -f "$VERIFY"; then
  green "✓ ALL STAGING CHECKS PASSED"
else
  red "✗ verification failed — see error above"; exit 1
fi
