#!/usr/bin/env bash
# Apply migrations and run the pgTAP suite against a throwaway Postgres.
#
# Mirrors what the CI isolation job does, so a schema change can be checked
# locally without the full Supabase stack (`supabase start` pulls from
# public.ecr.aws, which rate-limits anonymous pulls).
#
# Usage: tools/db-verify.sh [--keep]
set -euo pipefail

IMAGE="supabase/postgres:17.6.1.121"
NAME="tenaville-db-verify"
PORT="${TENAVILLE_VERIFY_PORT:-55499}"
KEEP=0
[ "${1:-}" = "--keep" ] && KEEP=1

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

psql_in() { docker exec -i "$NAME" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 "$@"; }

cleanup() {
  if [ "$KEEP" -eq 0 ]; then docker rm -f "$NAME" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

docker rm -f "$NAME" >/dev/null 2>&1 || true
echo "starting $IMAGE"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=postgres -p "$PORT:5432" "$IMAGE" >/dev/null

# Readiness must be probed over TCP, not the Unix socket.
#
# The Postgres entrypoint runs its init scripts against a temporary server that
# listens on the local socket only, then shuts it down and starts the real one.
# `pg_isready` over the socket therefore reports ready *during* init, and
# anything applied then lands on a server that is about to be discarded —
# which surfaces later as stale relation OIDs, "tuple concurrently updated",
# and "the database system is shutting down". The init server never listens on
# TCP, so a TCP probe cannot see it.
echo -n "waiting for the real server on tcp"
ready=0
for _ in $(seq 1 90); do
  if docker exec "$NAME" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then
    ready=1
    break
  fi
  echo -n "."
done
if [ "$ready" -ne 1 ]; then
  echo " timed out"
  docker logs "$NAME" 2>&1 | tail -20
  exit 1
fi
echo " ready"

# The image creates pg_graphql's event triggers during init but may not install
# the extension, leaving them referencing graphql.increment_schema_version()
# and graphql.seq_schema_version. DDL then fails with "could not open relation
# with OID". Installing it repairs the dependency and matches hosted Supabase.
docker exec "$NAME" psql -h 127.0.0.1 -U postgres -q \
  -c 'create extension if not exists pg_graphql;' >/dev/null 2>&1 || true

echo "== migrations"
shopt -s nullglob
for f in supabase/migrations/*.sql; do
  echo "   $f"
  psql_in -q -f - < "$f"
done

# Lint before pgTAP is installed, and only the schemas we own. `db lint` checks
# every function in the database, and pgTAP's own functions carry dozens of
# warnings and errors of their own — linting after installing it would fail on
# third-party code. CI runs these steps in the same order for the same reason.
echo "== schema lint (public, app)"
if ! pnpm exec supabase db lint \
      --db-url "postgresql://postgres:postgres@127.0.0.1:$PORT/postgres?sslmode=disable" \
      --schema public,app --level warning --fail-on warning 2>&1 \
      | grep -vE '^WARN: config|^A new version|^We recommend'; then
  echo "schema lint failed"
  exit 1
fi

echo "== seed"
if [ -f supabase/seed.sql ]; then
  # psql \ir resolves relative to the script's directory, so run it from there.
  docker exec -i "$NAME" mkdir -p /tmp/seed >/dev/null 2>&1 || true
  docker cp supabase/seed.sql "$NAME:/tmp/seed/seed.sql" >/dev/null
  docker cp supabase/seed "$NAME:/tmp/seed/seed" >/dev/null
  docker exec -i "$NAME" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f /tmp/seed/seed.sql
fi

echo "== pgtap + helpers"
psql_in -q -c 'create extension if not exists pgtap;'
for f in supabase/tests/*helpers*.sql; do
  psql_in -q -f - < "$f"
done

echo "== tests"
failed=0
for f in supabase/tests/*_test.sql; do
  echo "-- $(basename "$f")"
  out=""
  # ON_ERROR_STOP so a SQL error fails the file instead of cascading into
  # "current transaction is aborted" noise that still looks like a pass.
  if ! out="$(docker exec -i "$NAME" psql -h 127.0.0.1 -U postgres -t -v ON_ERROR_STOP=1 -f - < "$f" 2>&1)"; then
    failed=1
  fi
  echo "$out" | grep -E '^\s*(ok |not ok|# |1\.\.)' || true
  # A pgTAP file can exit 0 while individual assertions fail.
  if echo "$out" | grep -qE 'not ok|Looks like you failed|Looks like you planned'; then
    failed=1
  fi
  if echo "$out" | grep -qE '^psql:|ERROR:'; then
    echo "$out" | grep -E '^psql:|ERROR:' | head -5
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "FAILED"
  exit 1
fi
echo "OK"
