#!/bin/sh

cd `dirname $0`
docker run -it -v `pwd`/sneezymud:/home/sneezy/sneezymud -v `pwd`/mysql:/var/lib/mysql sneezy
