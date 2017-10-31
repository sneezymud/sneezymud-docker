FROM alpine:latest
LABEL maintainer Elmo Todurov <elmo.todurov@eesti.ee>

RUN apk update && apk add build-base boost-dev mariadb mariadb-client mariadb-dev scons curl-dev gdb sudo
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
