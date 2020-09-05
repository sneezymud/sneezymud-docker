#!/bin/sh
set -e

# Important locations
TEMPLOCATION="/tmp"
SNEEZYLIB="/home/sneezy/sneezymud"
BACKUPDIR="/var/www/html/sneezybackups"

# Setting the backup filename
if [ -z "$1" ] 
then
        FNAME="$BACKUPDIR/sneezy-backup-`date +%s`.tar.xz"
else
        FNAME="$1"
fi

# Dump the database (this takes a bit of time)
mysqldump -u root -p<yourpassword> --databases sneezy immortal > "$TEMPLOCATION/dbdump.sql"

# Perform the backup
tar -cJf "$FNAME" --exclude='core' -C "$TEMPLOCATION" dbdump.sql -C "$SNEEZYLIB" lib || true  # tends to fail with "file changed" or "file deleted" -- proper LVM snapshotting would be better

# Remove our temps
rm "$TEMPLOCATION/dbdump.sql"

# Push the backup to any online repositories.
#drive push -no-prompt -quiet -destination backups "$FNAME"

