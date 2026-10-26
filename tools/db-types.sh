#!/usr/bin/env bash
# Regenerate packages/db types from the migrations alone.
#
# Not `supabase gen types --local`, for two reasons. The local stack pulls from
# public.ecr.aws and is rate-limited and slow to become healthy, and — the one
# that actually matters — it has the pgTAP extension installed, so the generated
# types carry fifty-odd pgTAP functions as if they were application API.
#
# This spins the same throwaway container tools/db-verify.sh uses, applies only
# the migrations, and reads the schema from that. Seeds and test helpers never
# touch it.
#
# Usage: tools/db-types.sh
set -euo pipefail

IMAGE="supabase/postgres:17.6.1.121"
NAME="tenaville-db-types"
PORT="${TENAVILLE_TYPES_PORT:-55498}"
OUT="packages/db/src/generated/database.types.ts"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker rm -f "$NAME" >/dev/null 2>&1 || true
echo "starting $IMAGE"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=postgres -p "$PORT:5432" "$IMAGE" >/dev/null

# TCP, not the Unix socket: the entrypoint's init server listens on the socket
# only, so a socket probe reports ready against a server about to be discarded.
# tools/db-verify.sh has the long version of this note.
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

docker exec "$NAME" psql -h 127.0.0.1 -U postgres -q \
  -c 'create extension if not exists pg_graphql;' >/dev/null 2>&1 || true

echo "== migrations"
shopt -s nullglob
for f in supabase/migrations/*.sql; do
  echo "   $f"
  docker exec -i "$NAME" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -q -f - < "$f"
done

echo "== generating $OUT"
pnpm exec supabase gen types typescript \
  --db-url "postgresql://postgres:postgres@127.0.0.1:$PORT/postgres?sslmode=disable" \
  > "$OUT.tmp"

# A failed generation can still exit 0 with a near-empty file; replacing the
# real one with that would turn every typed query into `never`.
if [ "$(wc -l < "$OUT.tmp")" -lt 100 ]; then
  echo "generated file looks truncated ($(wc -l < "$OUT.tmp") lines); keeping the old one"
  head -5 "$OUT.tmp"
  rm -f "$OUT.tmp"
  exit 1
fi

mv "$OUT.tmp" "$OUT"
pnpm exec prettier --write "$OUT" >/dev/null
echo "OK — $(wc -l < "$OUT") lines"
