FROM alpine:latest

RUN apk add --no-cache \
  bash \
  curl \
  docker-cli \
  docker-cli-compose \
  ca-certificates \
  shadow  # For groupmod command

RUN addgroup -g 1000 monitor && \
  adduser -D -u 1000 -G monitor -s /bin/bash monitor

COPY --chmod=755 entrypoint.sh /entrypoint.sh
COPY --chown=monitor:monitor --chmod=755 monitor.sh /usr/local/bin/monitor.sh
WORKDIR /workspace

# Basic health check for reliability
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD exec pgrep -f monitor.sh

# Run as root initially so we can modify groups
ENTRYPOINT ["/entrypoint.sh"]
