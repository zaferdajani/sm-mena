#!/bin/sh
set -e
# Migrations run on connect for PGlite; for Postgres run them explicitly.
if [ -n "$DATABASE_URL" ]; then
  # First boot on Postgres (Supabase): copy the embedded database and the
  # uploaded files across once (docs/25-supabase.md). If the copy fails, stay
  # on the embedded database so the site keeps working; the deploy warns.
  if [ -f "${PGLITE_DIR:-/data/pglite}/PG_VERSION" ] && [ ! -f "$(dirname "${PGLITE_DIR:-/data/pglite}")/.moved-to-supabase" ]; then
    if ! npm run --silent db:move-to-supabase; then
      echo "[move] failed: staying on the embedded database until the next deploy."
      unset DATABASE_URL STORAGE_PROVIDER
    fi
  fi
fi
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
