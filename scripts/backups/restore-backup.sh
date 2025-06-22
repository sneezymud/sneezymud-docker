#!/bin/bash
set -e

info() { echo -e "\033[36m[INFO]\033[0m $1"; }
success() { echo -e "\033[32m[SUCCESS]\033[0m $1"; }
warning() { echo -e "\033[33m[WARNING]\033[0m $1"; }
error() { echo -e "\033[31m[ERROR]\033[0m $1" >&2; exit 1; }

DEFAULT_BACKUP_DIR="/opt/backups/sneezy"
DB_USER="sneezy"
DB_PASSWORD="password"
TEMP_DIR=""
SAFETY_BACKUP_SCRIPT="/usr/local/bin/sneezy-backup.sh"

cleanup() {
    if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
        info "Cleaning up temporary files"
        rm -rf "$TEMP_DIR"
    fi
}

# Ensure cleanup happens even if script fails
trap cleanup EXIT

show_help() {
    cat << EOF
SneezyMUD Backup Restore Script

USAGE:
    sudo ./restore-backup.sh [BACKUP_FILE]

ARGUMENTS:
    BACKUP_FILE    Path to backup file to restore (optional)
                   Defaults to latest backup if not specified

EXAMPLES:
    sudo ./restore-backup.sh                                    # Restore from latest backup
    sudo ./restore-backup.sh /opt/backups/sneezy/latest.tar.xz  # Restore specific backup
    sudo ./restore-backup.sh ./my-backup.tar.xz                 # Restore from local file

REQUIREMENTS:
    - Must run with sudo
    - Docker must be running
    - SneezyMUD containers must exist

SAFETY:
    - Script will prompt to create a safety backup before restore
    - Keep multiple backup files for recovery options

WARNING:
    This will completely replace all game data with the backup contents.
    Make sure you have a current backup before proceeding!

EOF
}

validate_requirements() {
    info "Validating requirements"

    [[ $EUID -eq 0 ]] || error "Must run with sudo"
    command -v docker &> /dev/null || error "Requires Docker"
    systemctl is-active --quiet docker || error "Docker not running"

    [[ -f "compose.yaml" ]] || error "compose.yaml not found - run from sneezymud-docker directory"
    [[ -f "compose.prod.yaml" ]] || error "compose.prod.yaml not found - run from sneezymud-docker directory"

    success "Requirements validated"
}

get_backup_file() {
    local backup_file="$1"

    if [[ -z "$backup_file" ]]; then
        backup_file="$DEFAULT_BACKUP_DIR/latest.tar.xz"
        info "No backup file specified, using latest: $backup_file"
    fi

    # Support both relative and absolute paths for user convenience
    if [[ ! "$backup_file" = /* ]]; then
        backup_file="$(pwd)/$backup_file"
    fi

    [[ -f "$backup_file" ]] || error "Backup file not found: $backup_file"
    [[ -r "$backup_file" ]] || error "Cannot read backup file: $backup_file"

    echo "$backup_file"
}

stop_game_safely() {
    info "Safely stopping the game"

    if docker ps --format "{{.Names}}" | grep -q "^sneezy$"; then
        # Must stop game process before database restore to prevent corruption
        info "Stopping sneezy container to prevent data corruption"
        docker compose -f compose.yaml -f compose.prod.yaml stop sneezy
    fi

    # Keep container alive without starting game to allow file operations
    info "Starting container in safe mode"
    docker compose -f compose.yaml -f compose.prod.yaml run -d --name sneezy-restore sneezy tail -f /dev/null

    success "Game safely stopped, container running in safe mode"
}

extract_backup() {
    local backup_file="$1"

    info "Extracting backup archive"

    TEMP_DIR=$(mktemp -d)
    info "Using temporary directory: $TEMP_DIR"

    tar -xf "$backup_file" -C "$TEMP_DIR" || error "Failed to extract backup archive"

    # Ensure backup contains expected structure before proceeding
    [[ -f "$TEMP_DIR/dbdump.sql" ]] || error "Database dump not found in backup"
    [[ -d "$TEMP_DIR/mutable" ]] || error "Mutable directory not found in backup"

    success "Backup extracted successfully"
}

restore_database() {
    info "Restoring database"

    if ! docker ps --format "{{.Names}}" | grep -q "^sneezy-db$"; then
        info "Starting database container"
        docker compose -f compose.yaml -f compose.prod.yaml up -d sneezy-db

        # Database needs time to initialize before accepting connections
        info "Waiting for database to be ready"
        for i in {1..30}; do
            if docker exec sneezy-db mysqladmin ping -u "$DB_USER" -p"$DB_PASSWORD" --silent; then
                break
            fi
            if [[ $i -eq 30 ]]; then
                error "Database failed to start within 30 seconds"
            fi
            sleep 1
        done
    fi

    # Must drop existing tables to avoid conflicts with backup data
    info "Dropping existing tables"
    for database in sneezy immortal; do
        info "Processing database: $database"

        tables=$(docker exec sneezy-db mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "SHOW TABLES" "$database" 2>/dev/null | tail -n +2 || true)

        if [[ -n "$tables" ]]; then
            while IFS= read -r table; do
                [[ -n "$table" ]] && docker exec sneezy-db mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "DROP TABLE \`$table\`" "$database"
            done <<< "$tables"
            info "Dropped tables from $database database"
        else
            info "No tables found in $database database"
        fi
    done

    info "Importing database dump"
    docker exec -i sneezy-db mysql -u "$DB_USER" -p"$DB_PASSWORD" < "$TEMP_DIR/dbdump.sql" || error "Failed to import database dump"

    success "Database restored successfully"
}

restore_game_files() {
    info "Restoring game files"

    info "Removing existing mutable directory"
    docker exec sneezy-restore rm -rf /home/sneezy/lib/mutable || error "Failed to remove existing mutable directory"

    info "Copying restored mutable directory"
    docker cp "$TEMP_DIR/mutable" sneezy-restore:/home/sneezy/lib/ || error "Failed to copy mutable directory"

    # Container processes run as sneezy user, so files must be owned correctly
    info "Setting proper ownership on restored files"
    docker exec sneezy-restore chown -R sneezy:sneezy /home/sneezy/lib/mutable || error "Failed to set ownership on restored files"

    success "Game files restored successfully"
}

restart_game() {
    info "Restarting the game"

    info "Stopping restore container"
    docker stop sneezy-restore && docker rm sneezy-restore

    # Always pull latest to ensure security updates and bug fixes
    info "Pulling latest SneezyMUD image"
    docker pull sneezymud/sneezymud:latest || warning "Failed to pull latest image, using existing"

    info "Starting game with latest configuration"
    docker compose -f compose.yaml -f compose.prod.yaml up -d --force-recreate --no-deps sneezy || error "Failed to restart game"

    success "Game restarted successfully"
}

create_safety_backup() {
    if [[ ! -f "$SAFETY_BACKUP_SCRIPT" ]]; then
        error "Safety backup script not found at $SAFETY_BACKUP_SCRIPT. Cannot create safety backup."
    fi

    info "Creating safety backup before restore (this may take a few minutes)..."
    if sudo -u sneezy-backups "$SAFETY_BACKUP_SCRIPT" 2>/dev/null; then
        success "Safety backup created successfully"
    else
        error "Safety backup failed. Aborting restore to prevent data loss."
    fi
}

main() {
    if [[ "$1" == "--help" || "$1" == "-h" ]]; then
        show_help
        exit 0
    fi

    info "Starting SneezyMUD backup restore"

    validate_requirements

    local backup_file
    backup_file=$(get_backup_file "$1")
    info "Using backup file: $backup_file"

    # Validate backup contents before stopping game to minimize downtime
    extract_backup "$backup_file"

    # Destructive operation requires explicit user confirmation
    echo
    warning "This will completely replace all current game data!"
    warning "Backup file: $backup_file"
    echo
    read -p "Would you like to create a safety backup before proceeding? (yes/no): " -r
    local create_backup=false
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        create_backup=true
    fi
    echo
    read -p "Are you sure you want to continue with the restore? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        info "Restore cancelled by user"
        exit 0
    fi

    # Stop game first to ensure data consistency for safety backup
    stop_game_safely

    if [[ "$create_backup" == true ]]; then
        create_safety_backup
    fi
    restore_database
    restore_game_files
    restart_game

    echo
    success "Backup restore completed successfully!"
    info "Game should be running with restored data"
}

main "$@"
