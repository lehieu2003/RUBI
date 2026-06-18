FROM node:20-alpine AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat openssl

FROM base AS dev
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public \
  && npm run db:generate \
  && NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=docker-build-anon-key \
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/iceflow?schema=public \
    DIRECT_URL=postgresql://postgres:postgres@localhost:5432/iceflow?schema=public \
    JWT_SECRET=docker-build-secret-for-image-builds-only \
    npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
