#!/bin/sh
# fix warnings in mysql.  might want to back up mysql data first
docker-compose build
docker start sneezydb
docker exec sneezydb /bin/sh -c "mysql_upgrade"
docker-compose down

