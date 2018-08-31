#!/bin/sh
# Copied with modifications from https://github.com/wangxian/alpine-mysql/blob/master/startup.sh

set -e

for db in immortal sneezy; do
	for phase in tables views data; do
		[ -d "/home/sneezy/sneezymud-docker/sneezymud/_Setup-data/sql_$phase/$db" ] || continue
		for sql in /home/sneezy/sneezymud-docker/sneezymud/_Setup-data/sql_$phase/$db/*.sql; do
			echo "loading '$sql'"
			mysql -u sneezy --password=password $db < $sql
		done
	done
done
