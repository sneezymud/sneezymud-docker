FROM alpine:latest
LABEL maintainer Elmo Todurov <elmo.todurov@eesti.ee>

RUN apk update
RUN apk add build-base
RUN apk add boost-dev
RUN apk add mariadb mariadb-client mariadb-dev
RUN apk add scons
RUN apk add curl-dev
RUN apk add gdb
RUN apk add sudo
RUN rm -f /var/cache/apk/*
RUN adduser -D sneezy
RUN mkdir -p /run/mysqld && chmod 1777 /run/mysqld
RUN echo "sneezy ALL=NOPASSWD: ALL" >> /etc/sudoers

COPY setup_mysql.sh /scripts/setup_mysql.sh
COPY my.cnf /etc/mysql/my.cnf

VOLUME /var/lib/mysql
VOLUME /home/sneezy/sneezymud

EXPOSE 7900

USER sneezy
WORKDIR /home/sneezy/sneezymud/code
# Alpine uses Busybox shell by default, otherwise we could use {a..z}
CMD "/scripts/setup_mysql.sh" && scons -j`grep -c ^processor /proc/cpuinfo` && mkdir -p ../lib/roomdata/saved ../lib/immortals ../lib/corpses/corrupt ../lib/rent/corrupt ../lib/player/corrupt && (for i in a b c d e f g h i j k l m n o p q r s t u v w x y z; do mkdir -p ../lib/rent/$i ../lib/account/$i ../lib/player/$i;done) && cp sneezy_prod.cfg sneezy.cfg && ./sneezy; killall mysqld
