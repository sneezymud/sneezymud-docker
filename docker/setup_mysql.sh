#!/bin/sh
# Copied with modifications from https://github.com/wangxian/alpine-mysql/blob/master/startup.sh

set -ex

if [ "$MYSQL_ROOT_PASSWORD" = "" ]; then
    MYSQL_ROOT_PASSWORD=yadablarg
    echo "[i] MySQL root Password: $MYSQL_ROOT_PASSWORD"
fi

tfile=`mktemp`
if [ ! -f "$tfile" ]; then
    return 1
fi

cat << EOF > $tfile
drop user if exists 'sneezy';
FLUSH PRIVILEGES;
USE mysql;
CREATE USER 'sneezy' IDENTIFIED BY 'password';
EOF

for MYSQL_DATABASE in sneezy immortal; do
    echo "[i] Creating database: $MYSQL_DATABASE"
    echo "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DATABASE\` CHARACTER SET utf8 COLLATE utf8_general_ci;" >> $tfile
    echo "GRANT ALL ON \`$MYSQL_DATABASE\`.* to 'sneezy';" >> $tfile
    echo "FLUSH PRIVILEGES;" >> $tfile
done
for i in `seq 1 50`; do
    /usr/bin/mysql -h db -u root --password="$MYSQL_ROOT_PASSWORD" < $tfile && break || sleep 0.5
done
echo "[i] Created databases"

if [ ! -f /home/sneezy/sneezymud-docker/sneezymud/_Setup-data/loaded ]; then
    for db in immortal sneezy; do
        for phase in tables views data; do
            [ -d "/home/sneezy/sneezymud-docker/sneezymud/_Setup-data/sql_$phase/$db" ] || continue
            for sql in /home/sneezy/sneezymud-docker/sneezymud/_Setup-data/sql_$phase/$db/*.sql; do
                echo "loading '$sql'"
                /usr/bin/mysql -h db -u sneezy --password=password $db < "$sql"
            done
        done
    done
    touch /home/sneezy/sneezymud-docker/sneezymud/_Setup-data/loaded
fi
