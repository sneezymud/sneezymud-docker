#!/bin/sh
# Copied with modifications from https://github.com/wangxian/alpine-mysql/blob/master/startup.sh

set -e

for db in immortal sneezy; do
	[ -d "/home/sneezy/db/$db" ] || continue
	for sql in /home/sneezy/db/$db/*.sql; do
		echo "loading '$sql'"
		mariadb -u sneezy --password=password $db < $sql
	done
done

echo Db setup done
exit 0
