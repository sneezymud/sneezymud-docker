#!/bin/sh

set -e

cd `dirname $0`
./recompile.sh
if [ "x$1" = "x-g" ]; then
    GDB="gdb -ex run"
else
    GDB=""
fi
CMD="/scripts/setup_mysql.sh && $GDB ./sneezy; killall mysqld"
docker rm sneezy || true  # nuke the previous run if needed
docker run --name sneezy --cap-add=SYS_PTRACE -it -p 7900:7900 -v `pwd`:/home/sneezy/sneezymud-docker -v `pwd`/mysql:/var/lib/mysql -v /tmp/cores:/tmp/cores sneezy /bin/sh -c "$CMD"
