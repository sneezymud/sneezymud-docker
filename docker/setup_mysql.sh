#!/bin/sh
# Copied with modifications from https://github.com/wangxian/alpine-mysql/blob/master/startup.sh

set -e


if [ -d /var/lib/mysql/mysql ]; then
	echo "[i] MySQL directory already present, skipping creation"
	NEW=0
else
	NEW=1
	echo "[i] MySQL data directory not found, creating initial DBs"

	mysql_install_db > /dev/null

	if [ "$MYSQL_ROOT_PASSWORD" = "" ]; then
		MYSQL_ROOT_PASSWORD=111111
		echo "[i] MySQL root Password: $MYSQL_ROOT_PASSWORD"
	fi

	tfile=`mktemp`
	if [ ! -f "$tfile" ]; then
		return 1
	fi

	cat << EOF > $tfile
USE mysql;
FLUSH PRIVILEGES;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY "$MYSQL_ROOT_PASSWORD" WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
UPDATE user SET password=PASSWORD("") WHERE user='root' AND host='localhost';
CREATE USER 'sneezy'@'localhost' IDENTIFIED BY 'password';
EOF

	for MYSQL_DATABASE in sneezy immortal; do
		echo "[i] Creating database: $MYSQL_DATABASE"
		echo "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DATABASE\` CHARACTER SET utf8 COLLATE utf8_general_ci;" >> $tfile
		echo "GRANT ALL ON \`$MYSQL_DATABASE\`.* to 'sneezy'@'localhost';" >> $tfile
	done
	
	/usr/bin/mysqld --bootstrap --verbose=0 < $tfile
	# rm -f $tfile
fi

/usr/bin/mysqld &
echo Started MySQL
sleep 2

if [ $NEW -eq 1 ]; then
	sleep 1

	for db in immortal sneezy; do
		for phase in tables views data; do
			[ -d "/home/sneezy/sneezymud/_Setup-data/sql_$phase/$db" ] || continue
			for sql in /home/sneezy/sneezymud/_Setup-data/sql_$phase/$db/*.sql; do
				echo "loading '$sql'"
				mysql -u sneezy --password=password $db < $sql
			done
		done
	done
fi
