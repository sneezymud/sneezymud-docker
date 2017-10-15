#!/bin/sh

cd `dirname $0`
docker build -t sneezy docker
docker rm sneezy  # nuke the previous run if needed
docker run --name sneezy --cap-add=SYS_PTRACE -it -p 7900:7900 -v `pwd`/sneezymud:/home/sneezy/sneezymud -v `pwd`/mysql:/var/lib/mysql sneezy
