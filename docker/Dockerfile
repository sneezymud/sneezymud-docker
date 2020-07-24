FROM ubuntu:bionic as build
LABEL maintainer Elmo Todurov <elmo.todurov@eesti.ee>

RUN apt update && apt-get install --yes --no-install-recommends build-essential libboost1.65-dev libboost-program-options1.65-dev libboost-regex1.65-dev libboost-filesystem1.65-dev libboost-system1.65-dev libmariadbclient-dev libmariadbclient18 scons libcurl4-openssl-dev git ca-certificates
ARG UID=1000
RUN useradd -m -u $UID sneezy
USER sneezy

WORKDIR /home/sneezy
RUN git clone --recurse-submodules https://github.com/sneezymud/sneezymud
WORKDIR /home/sneezy/sneezymud/code
RUN scons -j`grep -c ^processor /proc/cpuinfo` -Q debug=1 -Q sanitize=0 -Q olevel=1 sneezy

FROM ubuntu:bionic as run
RUN apt update && apt-get install --yes --no-install-recommends libboost-program-options1.65.1 libboost-regex1.65.1 libboost-filesystem1.65.1 libboost-system1.65.1 libmariadbclient18 libcurl4 gdb
ARG UID=1000
RUN useradd -m -u $UID sneezy
USER sneezy
COPY --from=build /home/sneezy/sneezymud/code/objs/libsneezy.a /home/sneezy/code/objs/libsneezy.a
COPY --from=build /home/sneezy/sneezymud/code/sneezy /home/sneezy/code/sneezy
COPY --from=build /home/sneezy/sneezymud/lib /home/sneezy/
COPY --from=build /home/sneezy/sneezymud/code/sneezy_docker_compose.cfg /home/sneezy/code/sneezy.cfg
WORKDIR /home/sneezy/code
RUN mkdir -p ../lib/roomdata/saved ../lib/immortals ../lib/corpses/corrupt ../lib/rent/corrupt ../lib/player/corrupt
RUN for i in a b c d e f g h i j k l m n o p q r s t u v w x y z; do mkdir -p ../lib/rent/$i ../lib/account/$i ../lib/player/$i;done
EXPOSE 7900
CMD ./sneezy
