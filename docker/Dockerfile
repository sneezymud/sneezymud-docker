FROM ubuntu:bionic
LABEL maintainer Elmo Todurov <elmo.todurov@eesti.ee>

RUN apt update && apt-get install --yes --no-install-recommends build-essential libboost-dev libboost-program-options-dev libboost-regex-dev libboost-filesystem-dev libboost-system-dev mariadb-client libmariadbclient-dev libmariadbclient18 scons libcurl4-openssl-dev gdb sudo git
ARG UID=1000
RUN useradd -m -u $UID sneezy
RUN echo "sneezy ALL=NOPASSWD: ALL" >> /etc/sudoers

EXPOSE 7900

USER sneezy
WORKDIR /home/sneezy/sneezymud-docker/sneezymud/code
CMD /bin/bash -c "( [ -f sneezy.cfg ] || cp sneezy_docker_compose.cfg sneezy.cfg ) && \
    scons -j`grep -c ^processor /proc/cpuinfo` -Q debug=1 -Q sanitize=0 -Q olevel=1 sneezy && \
    mkdir -p ../lib/roomdata/saved ../lib/immortals ../lib/corpses/corrupt ../lib/rent/corrupt ../lib/player/corrupt && \
    (for i in a b c d e f g h i j k l m n o p q r s t u v w x y z; do mkdir -p ../lib/rent/$i ../lib/account/$i ../lib/player/$i;done) && \
    ./sneezy \
    "
