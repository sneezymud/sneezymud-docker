#!/bin/sh
set -e

# Important locations
TEMPLOCATION="/tmp"
SNEEZYLIB="/home/sneezy"
BACKUPDIR="."
POD=pod/sneezymud-0
NAMESPACE="-ndefault"

# Setting the backup filename
FNAME="$BACKUPDIR/sneezy-backup-`date +%s`.tar"

# Perform the backup
kubectl "$NAMESPACE" exec -t pod/sneezy-db-0 -- mysqldump -h sneezy-db -u root -p111111 --databases sneezy immortal > "$TEMPLOCATION/dbdump.sql"
(kubectl "$NAMESPACE" exec -t "$POD" -- tar -c --exclude='core' -C "$SNEEZYLIB" lib || true ) > "$FNAME"
tar --owner=sneezy:1000 --group=sneezy:1000 -rf "$FNAME" -C "$TEMPLOCATION" dbdump.sql
xz "$FNAME"

# Remove our temps
rm "$TEMPLOCATION/dbdump.sql"

# Push the backup to any online repositories.
#drive push -no-prompt -quiet -destination backups "$FNAME"

