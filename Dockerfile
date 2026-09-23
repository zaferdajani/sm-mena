# Sawwiq production image (Fly.io or any Docker host).
#
# Default mode is a single machine with PGlite (embedded Postgres) and local
# uploads on a mounted volume at /data, so it needs no external services.
# Set DATABASE_URL (and STORAGE_PROVIDER=supabase) to use managed services.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim
# fontconfig + DejaVu let sharp render Arabic text in generated demo images.
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 sawwiq
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production PORT=3000 NEXT_TELEMETRY_DISABLED=1 \
    PGLITE_DIR=/data/pglite UPLOADS_DIR=/data/uploads
RUN mkdir -p /data && chown -R sawwiq:sawwiq /data /app && chmod +x /app/scripts/docker-entrypoint.sh
USER sawwiq
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
