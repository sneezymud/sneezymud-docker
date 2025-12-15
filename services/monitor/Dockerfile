# syntax=docker/dockerfile:1
FROM alpine:latest

# Install dependencies with cache mount
RUN --mount=type=cache,target=/var/cache/apk \
  apk add --no-cache \
  bash \
  curl \
  docker-cli \
  docker-cli-compose \
  ca-certificates \
  shadow && \
  addgroup -g 1000 monitor && \
  adduser -D -u 1000 -G monitor -s /bin/bash monitor

# Copy scripts with proper permissions
COPY --chmod=755 entrypoint.sh /entrypoint.sh
COPY --chown=monitor:monitor --chmod=755 monitor.sh /usr/local/bin/monitor.sh

WORKDIR /workspace

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD exec pgrep -f monitor.sh

# Metadata labels
LABEL org.opencontainers.image.title="SneezyMUD Monitor" \
  org.opencontainers.image.description="Docker-in-Docker monitoring service for SneezyMUD"

# Run as root initially so entrypoint can modify groups
ENTRYPOINT ["/entrypoint.sh"]
