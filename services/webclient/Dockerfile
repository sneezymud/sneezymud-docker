# syntax=docker/dockerfile:1
FROM nginx:1.25-alpine3.19

# Remove default nginx content and copy connectificator files
RUN rm -rf /usr/share/nginx/html/*
COPY ./connectificator /usr/share/nginx/html

# Create index.html symlink (connectificator's main file is connectificator.html)
# Create static/ symlink (HTML references static/*.js and static/*.css but files are in root)
RUN ln -s connectificator.html /usr/share/nginx/html/index.html && \
    ln -s . /usr/share/nginx/html/static

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
