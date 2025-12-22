#!/bin/bash
#
# SneezyMUD Nginx Setup - Simple HTTPS setup and domain management for SneezyMUD
#
set -e

info() { echo "→ $1"; }
success() { echo "✓ $1"; }
error() { echo "✗ $1" >&2; exit 1; }
warn() { echo "⚠ $1" >&2; }

# Store domain list separately to enable domain management operations
DOMAINS_FILE="/etc/nginx/sneezy-domains.txt"

OPERATION=""
TARGET_DOMAIN=""

case "${1:-}" in
    "--undo")
        OPERATION="undo"
        ;;
    "--add-domain")
        OPERATION="add"
        TARGET_DOMAIN="${2:-}"
        [[ -n "$TARGET_DOMAIN" ]] || error "Domain name required: $0 --add-domain example.com"
        ;;
    "--remove-domain")
        OPERATION="remove"
        TARGET_DOMAIN="${2:-}"
        [[ -n "$TARGET_DOMAIN" ]] || error "Domain name required: $0 --remove-domain example.com"
        ;;
    "--update-services")
        OPERATION="update-services"
        ;;
    "--list-services")
        OPERATION="list-services"
        ;;
    "--service-status")
        OPERATION="service-status"
        ;;
    "--help"|"-h")
        echo "SneezyMUD Nginx Setup, Domain and Service Management"
        echo "Usage:"
        echo "  sudo $0                          # Initial setup or management menu"
        echo "  sudo $0 --add-domain DOMAIN      # Add domain to existing setup"
        echo "  sudo $0 --remove-domain DOMAIN   # Remove domain from setup"
        echo "  sudo $0 --update-services        # Update nginx config from services.json"
        echo "  sudo $0 --list-services          # List configured services"
        echo "  sudo $0 --service-status         # Check service status"
        echo "  sudo $0 --undo                   # Remove entire setup"
        echo "  sudo $0 --help                   # Show this help"
        echo ""
        echo "Service Management Workflow:"
        echo "  1. Add/remove service from Docker Compose"
        echo "  2. Update scripts/nginx/services.json"
        echo "  3. Run: sudo $0 --update-services"
        echo ""
        echo "Backup API Configuration:"
        echo "  Set BACKUP_API_KEY in .env file to enable /sneezybackups/ endpoint"
        exit 0
        ;;
    "")
        OPERATION="auto"
        ;;
    *)
        error "Unknown option: $1. Use --help for usage information."
        ;;
esac

[[ $EUID -eq 0 ]] || error "Must run with sudo"
command -v apt-get &> /dev/null || error "Requires Ubuntu/Debian"

# Install jq dependency for JSON processing - avoids requiring manual installation
if ! command -v jq &> /dev/null; then
    info "Installing jq for service management"
    apt-get update -qq
    apt-get install -y jq
fi

detect_existing_setup() {
    # Both domain registry and nginx config must exist for management operations
    [[ -f "$DOMAINS_FILE" ]] && [[ -f "/etc/nginx/sites-available/sneezy-nginx" ]]
}

load_domains() {
    if [[ -f "$DOMAINS_FILE" ]]; then
        cat "$DOMAINS_FILE"
    fi
}

save_domains() {
    local domains=("$@")
    # Store one domain per line for easy parsing and management
    printf "%s\n" "${domains[@]}" > "$DOMAINS_FILE"
}

validate_domain() {
    local domain="$1"
    # Prevent common user input errors that would cause SSL certificate failures
    [[ "$domain" =~ ^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$ ]] || error "Invalid domain format: $domain"
}

get_config() {
    if [[ -z "${DOMAIN_NAME:-}" ]]; then
        read -p "Domain name: " DOMAIN_NAME
    fi
    validate_domain "$DOMAIN_NAME"

    if [[ -z "${EMAIL:-}" ]]; then
        read -p "Email for Let's Encrypt: " EMAIL
    fi
    [[ -n "$DOMAIN_NAME" && -n "$EMAIL" ]] || error "Domain and email required"
}

get_email_config() {
    if [[ -z "${EMAIL:-}" ]]; then
        read -p "Email for Let's Encrypt: " EMAIL
    fi
    [[ -n "$EMAIL" ]] || error "Email required"
}


load_services() {
    local script_dir="$(dirname "${BASH_SOURCE[0]}")"
    local services_file="$script_dir/services.json"

    if [[ -f "$services_file" ]]; then
        cat "$services_file"
    else
        error "Services file not found: $services_file"
    fi
}

update_services_from_repo() {
    local script_dir="$(dirname "${BASH_SOURCE[0]}")"
    local services_file="$script_dir/services.json"

    if [[ ! -f "$services_file" ]]; then
        error "Services file not found: $services_file"
    fi

    info "Updating nginx configuration from services.json"

    # Validate JSON to prevent nginx configuration corruption
    if ! jq empty "$services_file" 2>/dev/null; then
        error "Invalid JSON in services file: $services_file"
    fi

    # Apply changes immediately if nginx is already configured
    if detect_existing_setup; then
        local domains=()
        mapfile -t domains < <(load_domains)
        update_nginx_config "${domains[@]}"
        test_setup
    else
        error "No existing nginx setup found. Run initial setup first: sudo $0"
    fi

    success "Nginx configuration updated from services.json"
}

list_services() {
    local services_json=$(load_services)

    echo
    echo "SneezyMUD Nginx Service Configuration"
    echo "====================================="
    echo


    local http_services=$(echo "$services_json" | jq -r '.services[] | select(.type == "http") | "\(.name)|\(.path)|\(.port)|\(.description)"')
    local websocket_services=$(echo "$services_json" | jq -r '.services[] | select(.type == "websocket") | "\(.name)|\(.path)|\(.port)|\(.description)"')

    if [[ -n "$http_services" ]]; then
        echo "HTTP Services:"
        while IFS='|' read -r name path port desc; do
            printf "  %-12s %-12s → %-25s (%s)\n" "$name" "$path" "localhost:$port" "$desc"
        done <<< "$http_services"
        echo
    fi

    if [[ -n "$websocket_services" ]]; then
        echo "WebSocket Services:"
        while IFS='|' read -r name path port desc; do
            printf "  %-12s %-12s → %-25s (%s)\n" "$name" "$path" "localhost:$port" "$desc"
        done <<< "$websocket_services"
        echo
    fi

    if [[ -z "$http_services" && -z "$websocket_services" ]]; then
        echo "No services configured."
        echo
    fi
}

service_status() {
    local services_json=$(load_services)

    echo
    echo "SneezyMUD Service Status Check"
    echo "=============================="
    echo


    if ! detect_existing_setup; then
        echo "❌ Nginx not configured. Run initial setup first."
        return 1
    fi


    echo "$services_json" | jq -r '.services[] | "\(.name)|\(.port)"' | while IFS='|' read -r name port; do
        if timeout 2 bash -c "echo >/dev/tcp/localhost/$port" 2>/dev/null; then
            printf "✓ %-12s localhost:%-5s (reachable)\n" "$name" "$port"
        else
            printf "❌ %-12s localhost:%-5s (unreachable)\n" "$name" "$port"
        fi
    done
    echo
}

install_packages() {
    info "Installing Nginx and Certbot"
    apt-get update -qq
    apt-get install -y nginx certbot python3-certbot-nginx
    systemctl enable nginx
    success "Packages installed"
}

generate_service_locations() {
    local services_json=$(load_services)

    # Load .env file if it exists
    if [[ -f ".env" ]]; then
        source .env
    fi

    local backup_api_key="${BACKUP_API_KEY:-}"

    # Generate backup API endpoint if API key is configured
    if [[ -n "$backup_api_key" ]]; then
        cat << EOF
    location /sneezybackups/ {
        alias /opt/backups/sneezy/;
        if (\$arg_api_key != "$backup_api_key") {
            return 403;
        }
    }

EOF
    fi

    # Sort services by path length (descending) to ensure proper nginx location matching
    echo "$services_json" | jq -r '.services | sort_by(.path | length) | reverse | .[] | "\(.path)|\(.port)|\(.type)"' | while IFS='|' read -r path port type; do
        local target="http://localhost:$port"
        # Match nginx proxy_pass behavior for trailing slashes
        if [[ "$path" != "/" && "$path" =~ /$ ]]; then
            target="$target/"
        fi

        if [[ "$type" == "websocket" ]]; then
            cat << EOF
    location $path {
        proxy_pass $target;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
    }

EOF
        else
            cat << EOF
    location $path {
        proxy_pass $target;
        proxy_set_header Host \$host;
    }

EOF
        fi
    done
}

create_initial_config() {
    local domains=("$@")
    local server_names=$(printf "%s " "${domains[@]}")

    info "Creating initial HTTP configuration"

    cat > /etc/nginx/sites-available/sneezy-nginx << EOF
server {
    listen 80;
    server_name ${server_names% };

    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }

$(generate_service_locations)
}
EOF

    ln -sf /etc/nginx/sites-available/sneezy-nginx /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # Test and reload nginx to apply the new configuration before SSL certificate request
    nginx -t || error "Nginx configuration invalid"
    systemctl reload nginx || error "Nginx reload failed"

    success "Initial HTTP configuration created"
}

get_ssl() {
    local domains=("$@")
    local domain_args=""
    local expand_flag=""

    # Multi-domain certificates reduce complexity vs separate certs per domain
    for domain in "${domains[@]}"; do
        domain_args="$domain_args -d $domain"
    done

    # Check if there are existing certificates - if so, use --expand to add domains
    # to the existing certificate without prompting
    if [[ -d "/etc/letsencrypt/live" ]] && [[ -n "$(ls -A /etc/letsencrypt/live/ 2>/dev/null)" ]]; then
        expand_flag="--expand"
        info "Expanding existing SSL certificate for: ${domains[*]}"
    else
        info "Getting SSL certificate for: ${domains[*]}"
    fi

    mkdir -p /var/www/letsencrypt
    chown www-data:www-data /var/www/letsencrypt

    systemctl start nginx

    # Use --webroot plugin instead of --nginx plugin for certificate acquisition
    #
    # Reasoning:
    #
    # This script manages multiple services (webclient, buildertools, websockets) and
    # allows you to add/remove domains and update service configurations on the fly.
    # The --nginx plugin would automatically modify our nginx configs, which would:
    #
    # - Break when you add/remove domains (--add-domain, --remove-domain commands)
    # - Conflict when you update services (--update-services from services.json)
    # - Make the --undo feature unpredictable (can't cleanly remove unknown changes)
    # - Interfere with our custom websocket and HTTP service routing
    #
    # With --webroot we get reliable domain and service management that works
    # predictably every time.
    #
    # Trade-off: We handle nginx reloads ourselves (see setup_renewal function)
    if certbot certonly --webroot -w /var/www/letsencrypt \
       --email "$EMAIL" --agree-tos --no-eff-email \
       $domain_args $expand_flag --non-interactive; then
        success "SSL certificate obtained"
    else
        error "SSL certificate failed - check that domains point to this server: ${domains[*]}"
    fi
}

create_https_config() {
    local domains=("$@")
    local server_names=$(printf "%s " "${domains[@]}")
    # Certbot stores multi-domain certificates under the first domain's directory
    local primary_domain="${domains[0]}"

    info "Creating HTTPS configuration"

    cat > /etc/nginx/sites-available/sneezy-nginx << EOF
# HTTP server - redirect to HTTPS (except ACME challenges)
server {
    listen 80;
    server_name ${server_names% };
    location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 301 https://\$host\$request_uri; }
}

# HTTPS server - all services
server {
    listen 443 ssl;
    server_name ${server_names% };

    ssl_certificate /etc/letsencrypt/live/$primary_domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$primary_domain/privkey.pem;

$(generate_service_locations)
}
EOF

    # Replace the HTTP-only config with the combined HTTP/HTTPS config
    rm -f /etc/nginx/sites-enabled/sneezy-nginx
    ln -sf /etc/nginx/sites-available/sneezy-nginx /etc/nginx/sites-enabled/

    # Test and reload nginx to apply the HTTPS configuration
    nginx -t || error "Nginx HTTPS configuration invalid"
    systemctl reload nginx || error "Nginx reload failed"

    success "HTTPS configuration created"
}

setup_renewal() {
    info "Configuring certificate renewal"

    # Modern Certbot automatically sets up a systemd timer for certificate renewal,
    # but since we use the --webroot plugin (see explanation above), Certbot does NOT
    # automatically reload nginx after renewal, meaning nginx would continue to serve
    # the old expired certificates from memory for a while after a successful renewal.
    #
    # Certbot automatically executes any executable scripts in /etc/letsencrypt/renewal-hooks/deploy/
    # after a successful renewal, so we add a simple script there to ensure the
    # nginx config is reloaded after renewal to pick up the new certificates.

    # Remove any existing hook to ensure clean installation and avoid duplicates
    if [[ -f /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh ]]; then
        rm -f /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh
    fi

    mkdir -p /etc/letsencrypt/renewal-hooks/deploy
    cat > /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh << 'EOF'
#!/bin/bash
# This hook runs after successful certificate renewal to ensure nginx
# picks up the new certificates from disk instead of serving expired ones from memory
systemctl reload nginx
EOF
    chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh

    success "Auto-renewal configured (using Certbot's built-in timer + nginx reload hook)"
}

test_setup() {
    info "Testing setup"
    nginx -t || error "Nginx configuration invalid"
    systemctl reload nginx || error "Nginx reload failed"
    systemctl is-active --quiet nginx || error "Nginx not running"
    success "Setup complete!"
}

show_results() {
    local domains=("$@")
    echo
    echo "✓ SneezyMUD Nginx setup complete!"
    for domain in "${domains[@]}"; do
        echo "  Your site: https://$domain"
    done
    echo "  Certificates renew automatically"
    echo
}
show_management_menu() {
    # Interactive menu for users who prefer guided operations over command-line flags
    local current_domains=()
    mapfile -t current_domains < <(load_domains)

    echo
    echo "SneezyMUD Nginx Domain Management"
    echo "================================="
    echo
    echo "Currently configured domains:"
    if [[ ${#current_domains[@]} -eq 0 ]]; then
        echo "  (none)"
    else
        for domain in "${current_domains[@]}"; do
            echo "  • $domain"
        done
    fi
    echo
    echo "Options:"
    echo "  1) Add domain"
    echo "  2) Remove domain"
    echo "  3) Update services from repository"
    echo "  4) List services"
    echo "  5) Service status"
    echo "  6) Reconfigure (re-run initial setup)"
    echo "  7) Remove entire setup"
    echo "  8) Exit"
    echo

    while true; do
        read -p "Choose option (1-8): " choice
        case $choice in
            1) add_domain_interactive; break ;;
            2) remove_domain_interactive; break ;;
            3) update_services_from_repo; break ;;
            4) list_services; break ;;
            5) service_status; break ;;
            6) reconfigure_setup; break ;;
            7) undo_setup; break ;;
            8) echo "Exiting."; exit 0 ;;
            *) echo "Invalid choice. Please enter 1-8." ;;
        esac
    done
}

add_domain_interactive() {
    echo
    read -p "Domain name to add: " new_domain
    validate_domain "$new_domain"
    get_email_config
    add_domain "$new_domain"
}

remove_domain_interactive() {
    local current_domains=()
    mapfile -t current_domains < <(load_domains)

    if [[ ${#current_domains[@]} -eq 0 ]]; then
        error "No domains configured"
    fi

    # Removing the last domain would leave nginx in a broken state, so offer full removal instead
    if [[ ${#current_domains[@]} -eq 1 ]]; then
        echo
        warn "This is the last domain. Removing it will disable the entire setup."
        read -p "Continue? (y/N): " confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            undo_setup
        else
            echo "Cancelled."
        fi
        return
    fi

    echo
    echo "Select domain to remove:"
    for i in "${!current_domains[@]}"; do
        echo "  $((i+1))) ${current_domains[i]}"
    done
    echo

    while true; do
        read -p "Choose domain (1-${#current_domains[@]}): " choice
        if [[ "$choice" =~ ^[0-9]+$ ]] && [[ $choice -ge 1 ]] && [[ $choice -le ${#current_domains[@]} ]]; then
            local domain_to_remove="${current_domains[$((choice-1))]}"
            remove_domain "$domain_to_remove"
            break
        else
            echo "Invalid choice. Please enter a number between 1 and ${#current_domains[@]}."
        fi
    done
}



add_domain() {
    local new_domain="$1"
    local current_domains=()
    mapfile -t current_domains < <(load_domains)

    # Prevent duplicate domains which would cause certificate errors
    for domain in "${current_domains[@]}"; do
        if [[ "$domain" == "$new_domain" ]]; then
            error "Domain $new_domain is already configured"
        fi
    done

    info "Adding domain: $new_domain"

    current_domains+=("$new_domain")
    save_domains "${current_domains[@]}"

    # Certificate must be regenerated to include the new domain
    update_certificates "${current_domains[@]}"
    update_nginx_config "${current_domains[@]}"
    test_setup

    success "Domain $new_domain added successfully"
    show_results "${current_domains[@]}"
}

remove_domain() {
    local domain_to_remove="$1"
    local current_domains=()
    mapfile -t current_domains < <(load_domains)
    local new_domains=()


    for domain in "${current_domains[@]}"; do
        if [[ "$domain" != "$domain_to_remove" ]]; then
            new_domains+=("$domain")
        fi
    done

    if [[ ${#new_domains[@]} -eq ${#current_domains[@]} ]]; then
        error "Domain $domain_to_remove not found in current configuration"
    fi

    info "Removing domain: $domain_to_remove"

    save_domains "${new_domains[@]}"

    # Certificate must be regenerated to exclude the removed domain
    update_certificates "${new_domains[@]}"
    update_nginx_config "${new_domains[@]}"
    test_setup

    success "Domain $domain_to_remove removed successfully"
    show_results "${new_domains[@]}"
}

update_certificates() {
    local domains=("$@")

    if [[ ${#domains[@]} -eq 0 ]]; then
        return
    fi

    info "Updating SSL certificates"

    # Nginx must be stopped to avoid port conflicts during certificate renewal
    systemctl stop nginx

    get_ssl "${domains[@]}"
}

update_nginx_config() {
    local domains=("$@")

    if [[ ${#domains[@]} -eq 0 ]]; then
        return
    fi

    info "Updating nginx configuration"
    create_https_config "${domains[@]}"
}

reconfigure_setup() {
    echo
    warn "This will reconfigure the entire nginx setup."
    read -p "Continue? (y/N): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        # Clean slate approach is simpler than trying to preserve partial state
        rm -f "$DOMAINS_FILE"
        undo_setup
        echo
        info "Starting fresh setup"
        get_config
        initial_setup "$DOMAIN_NAME"
    else
        echo "Cancelled."
    fi
}

undo_setup() {
    info "Removing Nginx setup"

    # Remove current configuration files
    rm -f /etc/nginx/sites-enabled/sneezy-nginx
    rm -f /etc/nginx/sites-available/sneezy-nginx

    # Clean up renewal hook and domain registry
    rm -f /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh
    rm -f "$DOMAINS_FILE"

    # Restore default Nginx behavior
    if [[ -f /etc/nginx/sites-available/default ]]; then
        ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
    fi

    if nginx -t; then
        systemctl reload nginx || warn "Nginx reload failed - you may need to restart nginx manually"
    else
        warn "Nginx config test failed - you may need to fix the configuration manually"
    fi
    success "Nginx setup removed"
}

initial_setup() {
    local domain="$1"

    info "Starting SneezyMUD Nginx setup for: $domain"

    install_packages
    create_initial_config "$domain"
    get_ssl "$domain"
    create_https_config "$domain"
    setup_renewal
    test_setup

    # Enable domain management for future operations
    save_domains "$domain"

    show_results "$domain"
}

# Route to appropriate operation based on current system state and user intent
case "$OPERATION" in
    "undo")
        undo_setup
        ;;
    "add")
        if ! detect_existing_setup; then
            error "No existing setup found. Run initial setup first: sudo $0"
        fi
        validate_domain "$TARGET_DOMAIN"
        get_email_config
        add_domain "$TARGET_DOMAIN"
        ;;
    "remove")
        if ! detect_existing_setup; then
            error "No existing setup found"
        fi
        remove_domain "$TARGET_DOMAIN"
        ;;
    "update-services")
        update_services_from_repo
        ;;
    "list-services")
        list_services
        ;;
    "service-status")
        service_status
        ;;
    "auto")
        if detect_existing_setup; then
            show_management_menu
        else
            info "No existing setup detected - starting initial setup"
            get_config
            initial_setup "$DOMAIN_NAME"
        fi
        ;;
esac
