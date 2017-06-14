FROM alpine:latest
LABEL maintainer Elmo Todurov <elmo.todurov@eesti.ee>

RUN apk --update add mariadb mariadb-client mariadb-dev
RUN apk add boost-dev
RUN apk add build-base
RUN apk add scons
RUN rm -f /var/cache/apk/*
RUN adduser -D sneezy

COPY setup_mysql.sh /scripts/setup_mysql.sh
COPY my.cnf /etc/mysql/my.cnf

VOLUME /var/lib/mysql
VOLUME /home/sneezy/sneezymud

RUN ["/scripts/setup_mysql.sh"]

USER sneezy
WORKDIR /home/sneezy/sneezymud/code
# CMD scons -j`grep -c ^processor /proc/cpuinfo`
