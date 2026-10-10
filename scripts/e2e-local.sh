#!/usr/bin/env bash
# Runs the browser tests (e2e/) against a freshly built app on a throwaway
# Postgres in Docker. Nothing here touches the database of .env.
#
#   npm run e2e:local            run everything
#   npm run e2e:local -- staff   run the specs whose file name contains "staff"
#
# It builds into .next, the folder `npm run dev` also uses: stop the dev
# server first. Set E2E_BROWSER_CHANNEL=chrome to use the installed Chrome
# instead of downloading Playwright's Chromium.
set -euo pipefail

DB_PORT="${E2E_DB_PORT:-55433}"
APP_PORT="${E2E_APP_PORT:-3100}"
CONTAINER="iceflow-e2e-pg"
LOCAL_DB="postgresql://postgres:postgres@localhost:${DB_PORT}/iceflow_e2e?schema=public"

if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1 && [ "${E2E_FORCE:-}" != "1" ]; then
  echo "✖ Something is listening on port 3000 (npm run dev?). Stop it first: this script rebuilds .next." >&2
  echo "  Set E2E_FORCE=1 to run anyway." >&2
  exit 1
fi

cleanup() {
  [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true
  docker stop "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker stop "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --rm --name "$CONTAINER" -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=iceflow_e2e -p "${DB_PORT}:5432" postgres:16-alpine >/dev/null
for _ in $(seq 1 30); do
  docker exec "$CONTAINER" pg_isready -U postgres -d iceflow_e2e >/dev/null 2>&1 && break
  sleep 1
done
sleep 1

# Every command below gets the throwaway database explicitly; .env is never used.
export DATABASE_URL="$LOCAL_DB" DIRECT_URL="$LOCAL_DB"
export NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=e2e-anon-key
export JWT_SECRET=e2e-jwt-secret-for-local-runs-only REDIS_URL=

npx prisma migrate deploy
npm run db:seed
npm run build
rm -rf .next/standalone/.next/static && cp -R .next/static .next/standalone/.next/static
[ -d public ] && cp -R public .next/standalone/

# HOSTNAME=localhost: the app builds its redirects from it, and the session cookie is per host.
HOSTNAME=localhost PORT="$APP_PORT" node .next/standalone/server.js > e2e-server.log 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 60); do
  curl -sf "http://localhost:${APP_PORT}/api/health" >/dev/null && break
  sleep 1
done

E2E_BASE_URL="http://localhost:${APP_PORT}" E2E_DATABASE_URL="$LOCAL_DB" npx playwright test "$@"
