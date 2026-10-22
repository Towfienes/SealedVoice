#!/usr/bin/env bash
# scripts/reset-demo.sh: wipe the local app database (reports, pending and committed policies) before a take.
# Does not touch TideCloak. Re-commit the three policies at /admin/policies afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${DATABASE_PATH:-db/database.sqlite}"
rm -f "$DB" "$DB-wal" "$DB-shm"
echo "removed $DB. Restart the app, then commit the 3 policies at /admin/policies."
