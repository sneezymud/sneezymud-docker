#!/bin/sh

cd `dirname $0`
docker build -t sneezy-base docker/base
docker build -t sneezy-compile docker/compile
docker run -it --rm -v `pwd`/sneezymud:/home/sneezy/sneezymud sneezy-compile
