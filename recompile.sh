#!/bin/sh
set -e
cd `dirname $0`
docker build -t sneezy docker
docker run -it --rm -v `pwd`:/home/sneezy/sneezymud-docker sneezy
