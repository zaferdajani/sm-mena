#!/bin/sh
set -e
# Migrations run on connect for PGlite; for Postgres run them explicitly.
if [ -n "$DATABASE_URL" ]; then
  npm run --silent db:migrate
fi
# Ensure the admin account (SEED_ADMIN_*), plus optional demo content for
# pilots (removable in Admin → Agencies).
if [ "$SEED_DEMO" = "true" ]; then
  npm run --silent db:seed || echo "seed skipped"
else
  npm run --silent db:seed -- --admin-only || echo "admin seed skipped"
fi
exec npx next start -p "${PORT:-3000}"
