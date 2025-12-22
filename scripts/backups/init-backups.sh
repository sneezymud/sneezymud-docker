#!/bin/bash
#
# SneezyMUD Backup Setup - Simple automated backups for SneezyMUD
#
set -e

info() { echo "→ $1"; }
success() { echo "✓ $1"; }
error() { echo "✗ $1" >&2; exit 1; }

if [[ "${1:-}" == "--undo" ]]; then
    UNDO_MODE=true
elif [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    echo "SneezyMUD Backup Setup"
    echo "Usage: sudo $0 [--undo]"
    exit 0
else
    UNDO_MODE=false
fi

[[ $EUID -eq 0 ]] || error "Must run with sudo"
command -v docker &> /dev/null || error "Requires Docker"
systemctl is-active --quiet docker || error "Docker not running"

get_config() {
    BACKUPS_USER="${BACKUPS_USER:-sneezy-backups}"
    BACKUPS_DIR="${BACKUPS_DIR:-/opt/backups/sneezy}"
    RETENTION_DAYS="${RETENTION_DAYS:-30}"

    # Use SneezyMUD Docker defaults
    DB_USER="${DB_USER:-sneezy}"
    DB_PASSWORD="${DB_PASSWORD:-password}"

    info "Using backup directory: $BACKUPS_DIR"
    info "Using retention period: $RETENTION_DAYS days"
    info "Using database credentials: $DB_USER (set DB_USER/DB_PASSWORD env vars to override)"
}

setup_backup_user() {
    info "Setting up backup user and directory"

    if ! id -u "$BACKUPS_USER" &>/dev/null; then
        useradd --system --create-home --shell /bin/bash "$BACKUPS_USER"
        success "Created user $BACKUPS_USER"
    fi

    usermod -aG docker "$BACKUPS_USER"
    mkdir -p "$BACKUPS_DIR"
    chown "$BACKUPS_USER:$BACKUPS_USER" "$BACKUPS_DIR"
    chmod 750 "$BACKUPS_DIR"

    # Verify Docker access
    if ! sudo -u "$BACKUPS_USER" docker ps &>/dev/null; then
        error "Backup user cannot access Docker - may need to log out/in or restart Docker service"
    fi

    success "Backup user and directory ready"
}

create_backup_script() {
    info "Creating backup script"

    cat > /usr/local/bin/sneezy-backup.sh << EOF
#!/bin/bash
set -e

FILENAME="sneezy-backup-\$(date +'%Y%m%d-%H%M%S').tar"
LOW_PRIORITY="ionice -c idle nice -n19"

# Check that required containers are running
if ! docker ps --format "{{.Names}}" | grep -qx "sneezy-db"; then
    echo "ERROR: sneezy-db container is not running" >&2
    exit 1
fi

if ! docker ps --format "{{.Names}}" | grep -qx "sneezy"; then
    echo "ERROR: sneezy container is not running" >&2
    exit 1
fi

\$LOW_PRIORITY docker exec sneezy-db mariadb-dump --single-transaction -u $DB_USER -p$DB_PASSWORD --databases sneezy immortal > /tmp/dbdump.sql
\$LOW_PRIORITY docker exec sneezy tar -c --exclude='core' -C /home/sneezy/lib mutable > /tmp/"\${FILENAME}"
\$LOW_PRIORITY tar -rf /tmp/"\${FILENAME}" -C /tmp dbdump.sql
\$LOW_PRIORITY xz /tmp/"\${FILENAME}"

mv /tmp/"\${FILENAME}.xz" $BACKUPS_DIR/

if [ ! -f "$BACKUPS_DIR/\${FILENAME}.xz" ]; then
    echo "ERROR: Backup creation failed!" >&2
    exit 1
fi

ln -sf "\${FILENAME}.xz" "$BACKUPS_DIR/latest.tar.xz"
rm -f /tmp/dbdump.sql

find $BACKUPS_DIR -name "sneezy-backup-*.tar.xz" -type f -mtime +$RETENTION_DAYS -delete
EOF

    chmod 755 /usr/local/bin/sneezy-backup.sh
    success "Backup script created"
}

create_systemd_services() {
    info "Creating systemd service and timer"

    cat > /etc/systemd/system/sneezy-backup.service << EOF
[Unit]
Description=SneezyMUD Backup Service
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/sneezy-backup.sh
User=$BACKUPS_USER
ProtectSystem=full
PrivateTmp=true
ProtectHome=true
EOF

    cat > /etc/systemd/system/sneezy-backup.timer << EOF
[Unit]
Description=Daily SneezyMUD backup

[Timer]
OnCalendar=*-*-* 08:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    success "Systemd services created"
}

enable_backup_service() {
    info "Enabling backup service"

    systemctl daemon-reload
    systemctl enable --now sneezy-backup.timer

    success "Backup service enabled and ready"
}

show_results() {
    echo
    echo "✓ SneezyMUD backup setup complete!"
    echo "  Backups stored in: $BACKUPS_DIR"
    echo "  Runs daily automatically"
    echo "  Test manually: sudo -u $BACKUPS_USER /usr/local/bin/sneezy-backup.sh"
    echo
}

undo_setup() {
    info "Removing backup setup"

    BACKUPS_USER="${BACKUPS_USER:-sneezy-backups}"

    systemctl stop sneezy-backup.timer 2>/dev/null || true
    systemctl disable sneezy-backup.timer 2>/dev/null || true
    rm -f /etc/systemd/system/sneezy-backup.service
    rm -f /etc/systemd/system/sneezy-backup.timer
    rm -f /usr/local/bin/sneezy-backup.sh
    systemctl daemon-reload

    if id -u "$BACKUPS_USER" &>/dev/null; then
        gpasswd -d "$BACKUPS_USER" docker 2>/dev/null || true
        userdel "$BACKUPS_USER"
    fi

    success "Backup setup removed (backup files preserved)"
}

if [[ "$UNDO_MODE" == true ]]; then
    undo_setup
else
    info "Starting SneezyMUD backup setup"
    get_config
    setup_backup_user
    create_backup_script
    create_systemd_services
    enable_backup_service
    show_results
fi
