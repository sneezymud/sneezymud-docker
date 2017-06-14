FROM alpine:latest
LABEL maintainer Elmo Todurov <elmo.todurov@eesti.ee>

RUN apk --update add mariadb mariadb-client mariadb-dev
RUN apk add boost-dev
RUN apk add build-base
RUN apk add scons
RUN apk add curl-dev
RUN rm -f /var/cache/apk/*
RUN adduser -D sneezy
RUN mkdir -p /run/mysqld && chmod 1777 /run/mysqld

COPY setup_mysql.sh /scripts/setup_mysql.sh
COPY my.cnf /etc/mysql/my.cnf

VOLUME /var/lib/mysql
VOLUME /home/sneezy/sneezymud

EXPOSE 7900

USER sneezy
WORKDIR /home/sneezy/sneezymud/code
# Alpine uses Busybox shell by default, otherwise we could use {a..z}
CMD "/scripts/setup_mysql.sh" && scons -j`grep -c ^processor /proc/cpuinfo` && (for i in a b c d e f g h i j k l m n o p q r s t u v w x y z; do mkdir -p /home/sneezy/sneezymud/lib/rent/$i /home/sneezy/sneezymud/lib/account/$i /home/sneezy/sneezymud/lib/player/$i;done) && ./sneezy; killall mysqld
