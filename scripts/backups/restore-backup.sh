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

# Docker and container configuration
COMPOSE_CMD="docker compose -f compose.yaml -f compose.prod.yaml"
CONTAINER_SNEEZY="sneezy"
CONTAINER_SNEEZY_DB="sneezy-db"
CONTAINER_SNEEZY_MONITOR="sneezy-monitor"
CONTAINER_SNEEZY_RESTORE="sneezy-restore"

# Timing configuration
DB_STARTUP_TIMEOUT=30
MONITOR_STARTUP_WAIT=10
DATABASES="sneezy immortal"

cleanup() {
    if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
        info "Cleaning up temporary files"
        rm -rf "$TEMP_DIR"
    fi

    # Clean up any leftover restore container from failed runs
    if docker ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_SNEEZY_RESTORE}$"; then
        info "Cleaning up leftover restore container"
        docker stop "$CONTAINER_SNEEZY_RESTORE" 2>/dev/null || true
        docker rm "$CONTAINER_SNEEZY_RESTORE" 2>/dev/null || true
    fi
}

# Ensure cleanup happens even if script fails
trap cleanup EXIT

# Helper functions
is_container_running() {
    local container_name="$1"
    docker ps --format "{{.Names}}" | grep -q "^${container_name}$"
}

mariadb_exec() {
    local cmd="$1"
    local database="${2:-}"
    if [[ -n "$database" ]]; then
        docker exec "$CONTAINER_SNEEZY_DB" mariadb -u "$DB_USER" -p"$DB_PASSWORD" -e "$cmd" "$database"
    else
        docker exec "$CONTAINER_SNEEZY_DB" mariadb -u "$DB_USER" -p"$DB_PASSWORD" -e "$cmd"
    fi
}

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

    if ! docker info &> /dev/null; then
        error "Docker is not installed, not running, or not accessible"
    fi

    [[ -f "compose.yaml" ]] || error "compose.yaml not found - run from sneezymud-docker directory"
    [[ -f "compose.prod.yaml" ]] || error "compose.prod.yaml not found - run from sneezymud-docker directory"

    success "Requirements validated"
}

get_backup_file() {
    local backup_file="$1"

    if [[ -z "$backup_file" ]]; then
        backup_file="$DEFAULT_BACKUP_DIR/latest.tar.xz"
        info "Using latest backup: $backup_file" >&2
    else
        info "Using specified backup: $backup_file" >&2
    fi

    # Support both relative and absolute paths for user convenience
    if [[ ! "$backup_file" = /* ]]; then
        backup_file="$(pwd)/$backup_file"
    fi

    [[ -f "$backup_file" ]] || error "Backup file not found: $backup_file"
    [[ -r "$backup_file" ]] || error "Cannot read backup file: $backup_file"

    echo "$backup_file"
}

stop_monitor_service() {
    if is_container_running "$CONTAINER_SNEEZY_MONITOR"; then
        info "Stopping sneezy-monitor service to prevent interference during restore"
        $COMPOSE_CMD stop "$CONTAINER_SNEEZY_MONITOR" || {
            error "Failed to stop sneezy-monitor service - cannot safely proceed with restore"
        }
        success "Monitor service stopped"
    else
        info "Monitor service not running, skipping stop"
    fi
}

start_monitor_service() {
    # Start monitor which will automatically detect the missing container and restart it
    # This leverages the monitor's built-in logic for image updates, volume permissions,
    # error handling, and Discord notifications
    info "Starting sneezy-monitor service - it will automatically restart the game container"
    $COMPOSE_CMD up -d "$CONTAINER_SNEEZY_MONITOR" || {
        error "Failed to start sneezy-monitor service - game will not restart automatically"
    }

    # Give monitor a moment to detect and start the container
    info "Waiting for monitor to detect and restart the game container..."
    sleep "$MONITOR_STARTUP_WAIT"

    # Verify the game container is running
    if is_container_running "$CONTAINER_SNEEZY"; then
        success "Monitor service started and game container is running"
    else
        warning "Monitor started but game container not yet running - check monitor logs if needed"
    fi
}

stop_game_safely() {
    info "Safely stopping the game"

    if is_container_running "$CONTAINER_SNEEZY"; then
        # Must stop game process before database restore to prevent corruption
        info "Stopping sneezy container to prevent data corruption"
        $COMPOSE_CMD stop "$CONTAINER_SNEEZY"
    fi

    # Keep container alive without starting game to allow file operations
    info "Starting container in safe mode"
    $COMPOSE_CMD run -d --name "$CONTAINER_SNEEZY_RESTORE" "$CONTAINER_SNEEZY" tail -f /dev/null

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

    # Older backups contained the entire lib folder, so allow for both possibilities
    [[ -d "$TEMP_DIR/mutable" || -d "$TEMP_DIR/lib/mutable" ]] || error "Mutable directory not found in backup"

    if [[ -d "$TEMP_DIR/mutable" ]]; then
        MUTABLE_DIR="$TEMP_DIR/mutable"
    else
        MUTABLE_DIR="$TEMP_DIR/lib/mutable"
    fi

    success "Backup extracted successfully"
}

restore_database() {
    info "Restoring database"

    if ! is_container_running "$CONTAINER_SNEEZY_DB"; then
        info "Starting database container"
        $COMPOSE_CMD up -d "$CONTAINER_SNEEZY_DB"

        # Database needs time to initialize before accepting connections
        info "Waiting for database to be ready"
        for i in $(seq 1 $DB_STARTUP_TIMEOUT); do
            if docker exec "$CONTAINER_SNEEZY_DB" mariadb-admin ping -u "$DB_USER" -p"$DB_PASSWORD" --silent; then
                break
            fi
            if [[ $i -eq $DB_STARTUP_TIMEOUT ]]; then
                error "Database failed to start within $DB_STARTUP_TIMEOUT seconds"
            fi
            sleep 1
        done
    fi

    # Must clear existing databases to avoid conflicts with backup data
    info "Clearing existing databases"
    for database in $DATABASES; do
        mariadb_exec "DROP DATABASE IF EXISTS \`$database\`"
        mariadb_exec "CREATE DATABASE \`$database\`"
    done

    info "Importing database dump (might take a while...)"
    docker exec -i "$CONTAINER_SNEEZY_DB" mariadb -u "$DB_USER" -p"$DB_PASSWORD" < "$TEMP_DIR/dbdump.sql" || error "Failed to import database dump"

    success "Database restored successfully"
}

restore_game_files() {
    info "Restoring game files"

    # Clear contents of mutable directory (including hidden files) and copy backup contents in
    # Don't remove the directory itself as it's a mount point
    docker exec --user root "$CONTAINER_SNEEZY_RESTORE" sh -c 'rm -rf /home/sneezy/lib/mutable/* /home/sneezy/lib/mutable/.[!.]* 2>/dev/null || true'
    docker cp "$MUTABLE_DIR/." "$CONTAINER_SNEEZY_RESTORE":/home/sneezy/lib/mutable/ || error "Failed to copy mutable directory contents"

    # Container processes run as sneezy user, so files must be owned correctly
    docker exec --user root "$CONTAINER_SNEEZY_RESTORE" chown -R sneezy:sneezy /home/sneezy/lib/mutable || error "Failed to set ownership on restored files"

    success "Game files restored successfully"
}

cleanup_restore_container() {
    info "Cleaning up restore container"
    docker stop "$CONTAINER_SNEEZY_RESTORE" && docker rm "$CONTAINER_SNEEZY_RESTORE"
    success "Restore container cleaned up"
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
    echo

    validate_requirements

    local backup_file
    backup_file=$(get_backup_file "$1")

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

    echo
    info "=== STOPPING SERVICES ==="
    stop_monitor_service
    stop_game_safely

    if [[ "$create_backup" == true ]]; then
        echo
        create_safety_backup
    fi

    echo
    info "=== RESTORING DATA ==="
    restore_database
    restore_game_files
    cleanup_restore_container

    echo
    info "=== RESTARTING SERVICES ==="
    start_monitor_service

    echo
    success "Backup restore completed successfully!"
    info "Monitor service is now managing the game container with restored data"
}

main "$@"
