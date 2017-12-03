call recompile.cmd || exit /b 1
docker rm sneezy
docker run --name sneezy --cap-add=SYS_PTRACE -it -p 7900:7900 -v %cd%:/home/sneezy/sneezymud-docker -v %cd%/mysql:/var/lib/mysql sneezy /bin/sh -c "/scripts/setup_mysql.sh && gdb -ex run ./sneezy; killall mysqld"
