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
CONTAINER="sneezy-`whoami`"
docker rm "$CONTAINER" || true  # nuke the previous run if needed

PORT=7900
while (netstat -lptn | grep -q $PORT); do
  PORT=$(($PORT+1))
done
echo "Sneezy will listen on port $PORT"
docker run --name "$CONTAINER" --cap-add=SYS_PTRACE -it -p $PORT:7900 -v `pwd`:/home/sneezy/sneezymud-docker -v `pwd`/mysql:/var/lib/mysql -v /tmp/cores:/tmp/cores sneezy /bin/sh -c "$CMD"
