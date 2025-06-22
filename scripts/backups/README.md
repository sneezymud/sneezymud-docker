# SneezyMUD Backup Setup

Automatically sets up daily backups for your SneezyMUD server.

## Do I Need This?

**Theoretically, No** - The game will work fine without backups.

**Practically, Though, Yes** - You should treat this as a requirement, not an option. It's *very* likely you'll wish you had backups at some point, and not having them risks losing all of your players' progress and any custom content you've created if anything goes wrong with the server. It also means you won't have the ability to restore characters, the contents of a room, etc. from a previous state if something gets messed up or corrupted.

## Benefits

This script gives you:

- **Automatic daily backups** of your database and game files at 8 AM UTC (midnight US Pacific)
- **Space management** by removing old backups automatically after 30 days

## What Gets Backed Up

- **Database**: A full mysqldump of the game's databases
- **Game files**: The `lib/mutable` directory, which contains all the mutable data files used to persist game state (pfiles, roomdata, rentfiles, etc.)

## Requirements

- Ubuntu or Debian server
- Root access (sudo)
- Docker running with SneezyMUD containers

## How To Use

1. **Run the script**:

   ```bash
   cd /path/to/sneezymud-docker/scripts/backups
   sudo ./init-backups.sh
   ```

   The script automatically uses SneezyMUD's default database credentials (`sneezy`/`password`). If you've changed them, set them via environment variables before running the script:

   ```bash
   sudo DB_USER=<username> DB_PASSWORD=<password> ./init-backups.sh
   ```

### Options

```bash
sudo ./init-backups.sh          # Set up backups
sudo ./init-backups.sh --undo   # Remove setup
sudo ./init-backups.sh --help   # Show help
```

## Restoring from Backups

The `restore-backup.sh` script allows you to restore your game data from any backup created by the backup system.

### When You Might Need This

- **Server corruption**: Hardware failure, filesystem corruption, or other system issues
- **Data recovery**: Restoring a character, room contents, or other game state from a previous point in time
- **Migration**: Moving your game to a new server
- **Testing**: Creating a copy of your game state for testing purposes

### How to Restore

**⚠️ WARNING**: Restoring will completely replace all current game data with the backup contents. Make sure you have a current backup before proceeding!

1. **Restore from latest backup**:

   ```bash
   cd /path/to/sneezymud-docker/scripts/backups
   sudo ./restore-backup.sh
   ```

2. **Restore from specific backup**:

   ```bash
   sudo ./restore-backup.sh /opt/backups/sneezy/sneezy-backup-20240101-120000.tar.xz
   ```

3. **Restore from local backup file**:

   ```bash
   sudo ./restore-backup.sh ./my-backup.tar.xz
   ```

### What the Restore Process Does

1. **Validates** the backup file and extracts contents for verification
2. **Prompts** for user confirmation and optional safety backup
3. **Safely stops** the game to prevent data corruption
4. **Creates safety backup** (if requested) to capture exact state before restore
5. **Restores database** by dropping existing tables and importing the backup
6. **Restores game files** by replacing the mutable directory with backup contents
7. **Restarts** the game with the latest Docker image

The entire process can take several minutes (longer if creating safety backup).

### Restore Options

```bash
sudo ./restore-backup.sh                              # Restore from latest backup
sudo ./restore-backup.sh [BACKUP_FILE]                # Restore from specific backup
sudo ./restore-backup.sh --help                       # Show help
```

### Safety Features

**Safety Backup**: The script will ask if it should create a safety backup before proceeding with the restore. If you choose yes, the game will be stopped and a new backup will be created (using the `/usr/local/bin/sneezy-backup.sh` script created by the `init-backups.sh` script) before any restore operations begin.

If you choose to create the safety backup and the process fails for any reason, the script will exit before modifying any existing game data. At that point you can simply restart the containers as normal to bring the game back up.

### Recovery Procedures

If the restore script fails partway through, here are recovery options:

**Script failed during database or file restore**:

```bash
# Run the script again with the same backup file
# The script will start fresh and redo all operations
sudo ./restore-backup.sh [SAME_BACKUP_FILE]
```

**Backup file was corrupted or incomplete**:

```bash
# Try with a different backup file
sudo ./restore-backup.sh [DIFFERENT_BACKUP_FILE]
```

**Recovery after safety backup was created**:

```bash
# If you created a safety backup and need to restore it
# Check the backup directory for the most recent backup
ls -la /opt/backups/sneezy/
sudo ./restore-backup.sh /opt/backups/sneezy/[SAFETY_BACKUP_FILE]
```

**Manual recovery options**:

```bash
# Check all available backups
ls -la /opt/backups/sneezy/

# Restore from any available backup
sudo ./restore-backup.sh /opt/backups/sneezy/[BACKUP_FILE]

# If you have backups elsewhere, you can restore from those too
sudo ./restore-backup.sh /path/to/your/backup.tar.xz
```

## Troubleshooting

**Permission errors**: Make sure you're using `sudo` to run the script

**Check backup logs**:

```bash
journalctl -u sneezy-backup.service
```

**Create backup manually**:

```bash
sudo -u sneezy-backups /usr/local/bin/sneezy-backup.sh
```
