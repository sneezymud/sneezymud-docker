# syntax=docker/dockerfile:1
FROM nginx:1.25-alpine3.19

# Copy static files
COPY ./connectificator /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Metadata labels
LABEL org.opencontainers.image.title="SneezyMUD Web Client" \
  org.opencontainers.image.description="Nginx serving Connectificator web MUD client"

# Run nginx
CMD ["nginx", "-g", "daemon off;"]
