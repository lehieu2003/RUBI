#!/usr/bin/env bash
# Runs the mobile app on an Android emulator against a real server: the web
# app built from this tree on a throwaway Postgres in Docker. Nothing here
# touches the database of .env.
#
#   bash scripts/mobile-e2e-local.sh
#
# Needs Docker, Flutter and a running Android emulator (start one first, e.g.
# `flutter emulators --launch <id>`). The app reaches the server through the
# emulator's alias for this machine, http://10.0.2.2:3001 (the app's default
# API_BASE_URL), so port 3001 must be free.
#
# It builds into .next, the folder `npm run dev` also uses: stop the dev
# server first.
set -euo pipefail

DB_PORT="${E2E_DB_PORT:-55436}"
APP_PORT=3001
CONTAINER="iceflow-mobile-e2e-pg"
LOCAL_DB="postgresql://postgres:postgres@localhost:${DB_PORT}/iceflow_mobile_e2e?schema=public"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1 && [ "${E2E_FORCE:-}" != "1" ]; then
  echo "✖ Something is listening on port 3000 (npm run dev?). Stop it first: this script rebuilds .next." >&2
  echo "  Set E2E_FORCE=1 to run anyway." >&2
  exit 1
fi
if lsof -nP -iTCP:${APP_PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✖ Port ${APP_PORT} is in use; the app on the emulator expects the server there." >&2
  exit 1
fi
DEVICE="$(adb devices | awk '$2 == "device" && $1 ~ /^emulator-/ { print $1; exit }')"
if [ -z "$DEVICE" ]; then
  echo "✖ No running Android emulator. Start one first: flutter emulators --launch <id>" >&2
  exit 1
fi

cleanup() {
  [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true
  docker stop "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker stop "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --rm --name "$CONTAINER" -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=iceflow_mobile_e2e -p "${DB_PORT}:5432" postgres:16-alpine >/dev/null
for _ in $(seq 1 30); do
  docker exec "$CONTAINER" pg_isready -U postgres -d iceflow_mobile_e2e >/dev/null 2>&1 && break
  sleep 1
done
sleep 1

# Every command below gets the throwaway database explicitly; .env is never used.
export DATABASE_URL="$LOCAL_DB" DIRECT_URL="$LOCAL_DB"
export NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=e2e-anon-key
export JWT_SECRET=mobile-e2e-jwt-secret-for-local-runs-only REDIS_URL=

npx prisma migrate deploy
npm run db:seed
npm run build
rm -rf .next/standalone/.next/static && cp -R .next/static .next/standalone/.next/static
[ -d public ] && cp -R public .next/standalone/

# 0.0.0.0: the emulator comes in through 10.0.2.2, not through localhost.
HOSTNAME=0.0.0.0 PORT="$APP_PORT" node .next/standalone/server.js > mobile-e2e-server.log 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 60); do
  curl -sf "http://localhost:${APP_PORT}/api/health" >/dev/null && break
  sleep 1
done

# The server decides "today" in Vietnam time; the device must agree.
adb -s "$DEVICE" shell cmd alarm set-timezone Asia/Ho_Chi_Minh >/dev/null

# A driver account as the manager hands it out, with one order out for delivery.
PREPARED="$(BASE_URL="http://localhost:${APP_PORT}" node scripts/mobile-e2e-prepare.mjs prepare)"
value() { printf '%s\n' "$PREPARED" | sed -n "s/^$1=//p"; }

(
  cd mobile
  flutter test integration_test/app_e2e_test.dart -d "$DEVICE" \
    --dart-define="E2E_EMAIL=$(value E2E_EMAIL)" \
    --dart-define="E2E_PASSWORD=$(value E2E_PASSWORD)" \
    --dart-define="E2E_NEW_PASSWORD=$(value E2E_NEW_PASSWORD)" \
    --dart-define="E2E_CUSTOMER=$(value E2E_CUSTOMER)" \
    --dart-define="E2E_ORDER_ID=$(value E2E_ORDER_ID)"
)

# What the app did must be on the server.
BASE_URL="http://localhost:${APP_PORT}" node scripts/mobile-e2e-prepare.mjs verify \
  "$(value E2E_USER_ID)" "$(value E2E_ORDER_ID)" "$(value E2E_USER_NAME)"
