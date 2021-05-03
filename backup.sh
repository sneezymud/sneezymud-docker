#!/bin/sh
set -ex

# Important locations
TEMPLOCATION="/tmp"
SNEEZYLIB="/home/sneezy"
BACKUPDIR="/mnt/www/sneezybackups"

# Setting the backup filename
# FNAME="$BACKUPDIR/sneezy-backup-`date +%s`.tar" <- the Google Drive client is dumb and wants me to store authorization in the same place as pushable files
BASENAME="sneezy-backup-`date +%s`.tar"
FNAME="/home/elmo/sneezymud-docker/$BASENAME"
CFNAME="$FNAME".xz
NICE="ionice -c idle nice -n19"

# Perform the backup
$NICE docker exec -i sneezy-db $NICE mysqldump --single-transaction -h sneezy-db -u root -p111111 --databases sneezy immortal > "$TEMPLOCATION/dbdump.sql"
($NICE docker exec -i sneezy $NICE tar -c --exclude='core' -C "$SNEEZYLIB" lib || true ) > "$FNAME"
$NICE tar --owner=sneezy:1000 --group=sneezy:1000 -rf "$FNAME" -C "$TEMPLOCATION" dbdump.sql

# Remove our temps
rm "$TEMPLOCATION/dbdump.sql"

$NICE xz "$FNAME"

# Push the backup to any online repositories.
drive push -no-prompt -quiet -destination backups/sneezy-backups "$CFNAME"
mv "$CFNAME" "$BACKUPDIR"/
ln -sf $BASENAME.xz "$BACKUPDIR"/latest.tar.xz
echo Backed up to "$BASENAME.xz"
