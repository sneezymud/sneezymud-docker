FROM alpine:latest

RUN apk add --no-cache \
  bash \
  curl \
  docker-cli \
  docker-cli-compose \
  ca-certificates

# More explicit user creation with better defaults
RUN addgroup -g 1000 monitor && \
  adduser -D -u 1000 -G monitor -s /bin/bash monitor

COPY --chown=monitor:monitor --chmod=755 monitor.sh /usr/local/bin/monitor.sh
WORKDIR /workspace

# Basic health check for reliability
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD pgrep -f monitor.sh || exit 1

USER monitor
CMD ["/usr/local/bin/monitor.sh"]
