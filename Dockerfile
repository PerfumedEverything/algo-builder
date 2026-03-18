FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npx prisma generate
RUN --mount=type=cache,target=/app/.next/cache npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tinkoff-invest-api ./node_modules/tinkoff-invest-api
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@grpc ./node_modules/@grpc
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/nice-grpc ./node_modules/nice-grpc
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/nice-grpc-common ./node_modules/nice-grpc-common
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/protobufjs ./node_modules/protobufjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/grammy ./node_modules/grammy
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
