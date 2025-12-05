# syntax=docker/dockerfile:1

# Stage 1: Clone SneezyMUD data
FROM alpine:3.19 AS git

# Install git with cache mount
RUN --mount=type=cache,target=/var/cache/apk \
  apk add --no-cache git

# Create user and clone
RUN adduser -Du 1000 sneezy
USER sneezy
WORKDIR /home/sneezy

# Shallow clone for minimal download
RUN --mount=type=cache,target=/home/sneezy/.cache/git \
  git clone \
  --depth 1 \
  --shallow-submodules \
  --no-tags \
  --single-branch \
  https://github.com/sneezymud/sneezymud

# Stage 2: MariaDB runtime
FROM mariadb:12

# Database credentials (should rotate for production)
ENV MYSQL_ROOT_PASSWORD="111111"
ENV MYSQL_USER=sneezy
ENV MYSQL_PASSWORD=password

# Copy configuration and initialization scripts
COPY --chmod=600 ./my.cnf /etc/mysql/my.cnf
COPY ./init.sql ./setup_mysql.sh /docker-entrypoint-initdb.d/

# Copy database setup data from git stage
COPY --from=git /home/sneezy/sneezymud/_Setup-data /home/sneezy/_Setup-data

# Metadata labels
LABEL org.opencontainers.image.title="SneezyMUD Database" \
  org.opencontainers.image.description="MariaDB with immortal and sneezy databases"
