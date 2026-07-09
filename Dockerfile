# ─── Stage 1: Dependencies ─────────────────────────────────────
# FIX (CFG-03): use Bun (the repo's package manager) with --frozen-lockfile.
# Previously used `npm install --frozen-lockfile` which is a Yarn flag that
# npm silently ignores, producing non-reproducible installs.
FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ─── Stage 2: Build ────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN bunx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
# FIX (CFG-02): build requires a DATABASE_URL for Prisma generate; provide a
# placeholder. The real URL is injected at runtime via env.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"

# Build with standalone output (next.config.ts now has output: 'standalone')
RUN bunx next build

# ─── Stage 3: Production Runner ────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# FIX (CFG-02): no more SQLite default. DATABASE_URL must be provided at
# runtime pointing to a real PostgreSQL instance. The schema.prisma provider
# is postgresql and database.ts rejects file: URLs.
# DATABASE_URL is intentionally NOT set here; it must come from `docker run -e`
# or docker-compose environment.

RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 appuser

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# FIX (CFG-07): use `prisma migrate deploy` (non-destructive) instead of `db push`.
# Need the prisma CLI at runtime.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Ensure /app/data exists for local backups (mode 0700)
RUN mkdir -p /app/data && chown -R appuser:appuser /app/data

# Startup script: apply pending migrations, then start server.
# FIX (CFG-07): `prisma migrate deploy` only applies pending migrations and is
# safe for production (unlike `db push` which can be destructive).
RUN printf '#!/bin/sh\nset -e\nnpx prisma migrate deploy\nexec node server.js\n' > /app/start.sh && \
    chmod +x /app/start.sh && \
    chown appuser:appuser /app/start.sh

USER appuser

EXPOSE 3000

# FIX (CFG-09): healthcheck against /api/health (which checks the DB) instead
# of the static / page that returns 200 even with a dead DB.
# NOTE: /api/health doesn't exist yet — see the roadmap. Until then we keep /.
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["/app/start.sh"]
