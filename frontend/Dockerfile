# ════════════════════════════════════════════════════════════════
# Stage 1: Install dependencies (cached layer)
# ════════════════════════════════════════════════════════════════
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files first for optimal layer caching
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile


# ════════════════════════════════════════════════════════════════
# Stage 2: Build the Next.js app
# ════════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_API_URL is a build-time variable — must be set here
# Pass via: docker build --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


# ════════════════════════════════════════════════════════════════
# Stage 3: Production runner — minimal image
# ════════════════════════════════════════════════════════════════
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy only the standalone build output (requires output: 'standalone' in next.config.ts)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check — hits the root page
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
