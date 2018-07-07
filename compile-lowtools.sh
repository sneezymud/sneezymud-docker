#!/bin/sh
set -e
cd `dirname $0`

if [ ! -d sneezymud/code ]; then
    echo "Please run git submodule update --init"
    exit 1
fi

echo 'gitdir: ../.git/modules/sneezymud' > sneezymud/.git
docker build --build-arg UID=`id -u` -t sneezy docker
docker run -it --rm -v `pwd`:/home/sneezy/sneezymud-docker sneezy scons -j`grep -c ^processor /proc/cpuinfo` -Q debug=1 -Q sanitize=0 -Q olevel=0  lowtools
