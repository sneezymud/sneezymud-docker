FROM ubuntu:bionic as build
LABEL maintainer Elmo Todurov <elmo.todurov@eesti.ee>

RUN apt-get update && apt-get install --yes --no-install-recommends build-essential libboost1.65-dev libboost-program-options1.65-dev libboost-regex1.65-dev libboost-filesystem1.65-dev libboost-system1.65-dev libmariadbclient-dev libmariadbclient18 scons libcurl4-openssl-dev git ca-certificates
ARG UID=1000
RUN useradd -m -u $UID sneezy
USER sneezy

WORKDIR /home/sneezy
RUN git clone --depth 1 --shallow-submodules --recurse-submodules https://github.com/sneezymud/sneezymud
WORKDIR /home/sneezy/sneezymud/code
RUN scons -j`grep -c ^processor /proc/cpuinfo` -Q debug=1 -Q sanitize=0 -Q olevel=1 sneezy

FROM ubuntu:bionic as run
RUN apt-get update && apt-get install --yes --no-install-recommends libboost-program-options1.65.1 libboost-regex1.65.1 libboost-filesystem1.65.1 libboost-system1.65.1 libmariadbclient18 libcurl4 gdb
ARG UID=1000
RUN useradd -m -u $UID sneezy
RUN mkdir -p /home/sneezy/code/objs/
RUN mkdir -p /home/sneezy/lib
WORKDIR /home/sneezy/code
COPY --from=build /home/sneezy/sneezymud/code/sneezy /home/sneezy/code/sneezy
COPY --from=build /home/sneezy/sneezymud/lib /home/sneezy/lib
COPY --from=build /home/sneezy/sneezymud/code/sneezy_docker_compose.cfg /home/sneezy/code/sneezy.cfg 
RUN chown -R sneezy:sneezy /home/sneezy
USER sneezy
EXPOSE 7900
CMD ./sneezy
