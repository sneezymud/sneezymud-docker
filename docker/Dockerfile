FROM ubuntu:groovy as build
LABEL maintainer Elmo Todurov <elmo.todurov@eesti.ee>

RUN apt-get update && apt-get install --yes --no-install-recommends build-essential libboost-dev libboost-program-options-dev libboost-regex-dev libboost-filesystem-dev libboost-system-dev libmariadbclient-dev scons libcurl4-openssl-dev git ca-certificates
ARG UID=1000
ARG BRANCH="master"
RUN useradd -m -u $UID sneezy
USER sneezy

WORKDIR /home/sneezy
RUN echo cloning $BRANCH; git clone --depth 1 --shallow-submodules --recurse-submodules --single-branch --branch $BRANCH --no-tags https://github.com/sneezymud/sneezymud
WORKDIR /home/sneezy/sneezymud/code
RUN scons -j`grep -c ^processor /proc/cpuinfo` -Q debug=1 -Q sanitize=1 -Q olevel=0 pretty=0 check sneezy

FROM ubuntu:groovy as run
RUN apt-get update && apt-get install --yes --no-install-recommends libboost-program-options1.71.0 libboost-regex1.71.0 libboost-filesystem1.71.0 libboost-system1.71.0 libmariadb3 libcurl4 gdb
ARG UID=1000
RUN useradd -m -u $UID sneezy
RUN mkdir -p /home/sneezy/code/objs/
RUN mkdir -p /home/sneezy/lib
WORKDIR /home/sneezy/code
COPY --from=build /home/sneezy/sneezymud/code/sneezy /home/sneezy/code/sneezy
COPY --from=build /home/sneezy/sneezymud/lib /home/sneezy/lib
COPY --from=build /home/sneezy/sneezymud/code/sneezy_k8s.cfg /home/sneezy/code/sneezy.cfg 
RUN chown -R sneezy:sneezy /home/sneezy
USER sneezy
EXPOSE 7900
CMD ./sneezy
