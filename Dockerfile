# ============================================================
# 🌒 OpenVesper Dockerfile (multi-stage)
#
# Builds the gateway + CLI and ships a minimal production image.
# Usage:
#   docker build -t openvesper:latest .
#   docker run -d \
#     --name openvesper \
#     -p 127.0.0.1:18789:18789 \
#     -v "$HOME/.openvesper:/home/vesper/.openvesper" \
#     -e ANTHROPIC_API_KEY \
#     openvesper:latest
# ============================================================

# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /build

# Install pnpm + git (some plugin builds need it)
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@9

# Copy workspace structure first (better Docker layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig*.json ./
COPY scripts ./scripts

# Copy all packages and apps
COPY packages ./packages
COPY apps ./apps

# Install all deps (skip optional native deps that don't build cleanly in slim image)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build every package (tsc + fix-esm-imports)
RUN pnpm -r build

# Strip dev deps to slim down final image
RUN pnpm install --prod --frozen-lockfile --ignore-scripts


# ── Stage 2: Runtime ────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

# Add a non-root user
RUN groupadd -r vesper && useradd -r -u 1000 -g vesper -m -d /home/vesper vesper

WORKDIR /app

# Copy the built workspace + only production node_modules
COPY --from=builder --chown=vesper:vesper /build/package.json ./
COPY --from=builder --chown=vesper:vesper /build/pnpm-workspace.yaml ./
COPY --from=builder --chown=vesper:vesper /build/scripts ./scripts
COPY --from=builder --chown=vesper:vesper /build/packages ./packages
COPY --from=builder --chown=vesper:vesper /build/apps ./apps
COPY --from=builder --chown=vesper:vesper /build/node_modules ./node_modules

# Bundled agents go to the runtime image too
COPY --from=builder --chown=vesper:vesper /build/.agents ./.agents

# Workspace dir (where ~/.openvesper lives — mounted as a volume in prod)
RUN mkdir -p /home/vesper/.openvesper && \
    chown -R vesper:vesper /home/vesper/.openvesper && \
    chmod 700 /home/vesper/.openvesper

USER vesper

ENV NODE_ENV=production
ENV OPENVESPER_GATEWAY_HOST=0.0.0.0
ENV HOME=/home/vesper

# Healthcheck — gateway /health every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:18789/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))" \
    || exit 1

EXPOSE 18789

# Default: start the gateway. Override with `docker run ... openvesper:latest <cmd>`
CMD ["node", "apps/gateway/dist/index.js"]
