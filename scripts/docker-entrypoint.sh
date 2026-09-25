#!/bin/sh
set -e
# Migrations run on connect for PGlite; for Postgres run them explicitly.
if [ -n "$DATABASE_URL" ]; then
  # Moving to Supabase (docs/25-supabase.md): copy the embedded database once,
  # then the uploaded files once the Storage keys are there. If a copy fails,
  # keep serving from what still works so the site stays up; the deploy warns.
  DATA_DIR="$(dirname "${PGLITE_DIR:-/data/pglite}")"
  if [ -f "${PGLITE_DIR:-/data/pglite}/PG_VERSION" ] && { [ ! -f "$DATA_DIR/.moved-to-supabase" ] || { [ "$STORAGE_PROVIDER" = "supabase" ] && [ ! -f "$DATA_DIR/.files-moved-to-supabase" ]; }; }; then
    set +e
    npm run --silent db:move-to-supabase
    code=$?
    set -e
    if [ "$code" = "3" ]; then
      echo "[move] files not moved yet: serving them from the volume."
      unset STORAGE_PROVIDER
    elif [ "$code" != "0" ] && [ ! -f "$DATA_DIR/.moved-to-supabase" ]; then
      echo "[move] failed: staying on the embedded database until the next deploy."
      unset DATABASE_URL STORAGE_PROVIDER
    fi
  fi
  # Files still on the volume (keys missing, or not copied yet) are served from it.
  if [ "$STORAGE_PROVIDER" = "supabase" ] && [ -d "${UPLOADS_DIR:-/data/uploads}" ] && [ ! -f "$DATA_DIR/.files-moved-to-supabase" ]; then
    unset STORAGE_PROVIDER
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
