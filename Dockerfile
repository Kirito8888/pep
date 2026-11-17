# syntax=docker/dockerfile:1
# AthlosPro — imagen multi-stage (funciona igual en Linux y en Windows con Docker Desktop/WSL2)

# ── 1. Dependencias ──────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && apt-get clean
COPY package.json package-lock.json ./
COPY prisma ./prisma
# "postinstall" ejecuta "prisma generate", por eso el esquema se copia antes.
RUN npm ci

# ── 2. Compilación ───────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

# ── 3. Ejecución ─────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && apt-get clean

COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/next.config.mjs /app/tsconfig.json ./
# El seed reutiliza el motor generador y las fórmulas de src/lib.
COPY --from=builder --chown=node:node /app/src/lib ./src/lib
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
# Si Git en Windows convirtió los saltos de línea a CRLF, se normalizan aquí.
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

USER node
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
