# syntax=docker/dockerfile:1

# Stage 1: Install dependencies and build frontend
FROM oven/bun:1-debian AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Stage 2: Production image
FROM oven/bun:1-debian

# libcrypt is needed for DES password verification via FFI
RUN apt-get update && apt-get install -y --no-install-recommends libcrypt1 \
    && rm -rf /var/lib/apt/lists/*

ARG UID=1000
RUN useradd -r -u $UID -ms /bin/bash sneezy

WORKDIR /app

# Copy only production dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy server source (needed at runtime since Bun runs TS directly)
COPY src/server/ src/server/
COPY src/shared/ src/shared/
COPY tsconfig.json ./

# Copy built frontend assets from build stage
COPY --from=build /app/.artifacts/build .artifacts/build/

USER sneezy

ENV NODE_ENV=production
ENV API_PORT=5000

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD bun -e "const r = await fetch('http://localhost:5000/api/health'); if (!r.ok) process.exit(1);" || exit 1

LABEL org.opencontainers.image.title="SneezyMUD Builder Tools" \
    org.opencontainers.image.description="React/Hono web interface for area, mob, and object editing"

CMD ["bun", "run", "start"]
