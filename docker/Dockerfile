FROM ubuntu:latest
LABEL maintainer Elmo Todurov <elmo.todurov@eesti.ee>

RUN apt update && apt-get install --yes --no-install-recommends build-essential libboost-dev libboost-program-options-dev libboost-regex-dev libboost-filesystem-dev libboost-system-dev mariadb-client libmariadbclient-dev libmariadbclient18 scons libcurl4-openssl-dev gdb sudo git
ARG UID=1000
RUN useradd -m -u $UID sneezy
RUN echo "sneezy ALL=NOPASSWD: ALL" >> /etc/sudoers
# RUN mkdir /tmp/cores

COPY setup_mysql.sh /scripts/setup_mysql.sh

EXPOSE 7900

USER sneezy
VOLUME /home/sneezy/sneezymud-docker
WORKDIR /home/sneezy/sneezymud-docker/sneezymud/code
CMD [ -f sneezy.cfg ] || cp sneezy_docker_compose.cfg sneezy.cfg; \
    /scripts/setup_mysql.sh && \
    scons -j`grep -c ^processor /proc/cpuinfo` -Q debug=1 -Q sanitize=1 -Q olevel=1 && \
    LD_PRELOAD=/usr/lib/gcc/x86_64-linux-gnu/7/libasan.so ./sneezy
