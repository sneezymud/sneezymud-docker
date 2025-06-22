#!/bin/bash
#
# SneezyMUD Nginx Setup - Simple HTTPS setup for SneezyMUD
#
set -e

info() { echo "→ $1"; }
success() { echo "✓ $1"; }
error() { echo "✗ $1" >&2; exit 1; }

if [[ "${1:-}" == "--undo" ]]; then
    UNDO_MODE=true
elif [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    echo "SneezyMUD Nginx Setup"
    echo "Usage: sudo $0 [--undo]"
    exit 0
else
    UNDO_MODE=false
fi

[[ $EUID -eq 0 ]] || error "Must run with sudo"
command -v apt-get &> /dev/null || error "Requires Ubuntu/Debian"

get_config() {
    if [[ -z "${DOMAIN_NAME:-}" ]]; then
        read -p "Domain name: " DOMAIN_NAME
    fi
    if [[ -z "${EMAIL:-}" ]]; then
        read -p "Email for Let's Encrypt: " EMAIL
    fi
    [[ -n "$DOMAIN_NAME" && -n "$EMAIL" ]] || error "Domain and email required"
}

install_packages() {
    info "Installing Nginx and Certbot"
    apt-get update -qq
    apt-get install -y nginx certbot python3-certbot-nginx
    systemctl enable nginx
    success "Packages installed"
}

create_initial_config() {
    info "Creating initial HTTP configuration"

    cat > /etc/nginx/sites-available/sneezy-http << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
    }

    location /build/ {
        proxy_pass http://localhost:5001/;
        proxy_set_header Host \$host;
    }

    location /ws {
        proxy_pass http://localhost:7901;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
    }
}
EOF

    ln -sf /etc/nginx/sites-available/sneezy-http /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    success "Initial HTTP configuration created"
}

get_ssl() {
    info "Getting SSL certificate"
    mkdir -p /var/www/letsencrypt
    chown www-data:www-data /var/www/letsencrypt

    systemctl start nginx

    if certbot certonly --webroot -w /var/www/letsencrypt \
       --email "$EMAIL" --agree-tos --no-eff-email \
       --domains "$DOMAIN_NAME" --non-interactive; then
        success "SSL certificate obtained"
    else
        error "SSL certificate failed - check that $DOMAIN_NAME points to this server"
    fi
}

create_https_config() {
    info "Creating HTTPS configuration"

    cat > /etc/nginx/sites-available/redirect-to-https << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    location /.well-known/acme-challenge/ { root /var/www/letsencrypt; }
    location / { return 301 https://\$host\$request_uri; }
}
EOF

    cat > /etc/nginx/sites-available/sneezy-webclient << EOF
server {
    listen 443 ssl;
    server_name $DOMAIN_NAME;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
    }

    location /build/ {
        proxy_pass http://localhost:5001/;
        proxy_set_header Host \$host;
    }

    location /ws {
        proxy_pass http://localhost:7901;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
    }
}
EOF

    rm -f /etc/nginx/sites-enabled/sneezy-http
    ln -sf /etc/nginx/sites-available/redirect-to-https /etc/nginx/sites-enabled/
    ln -sf /etc/nginx/sites-available/sneezy-webclient /etc/nginx/sites-enabled/

    success "HTTPS configuration created"
}

setup_renewal() {
    info "Setting up certificate renewal"
    cat > /etc/cron.d/certbot-renewal << 'EOF'
0 */12 * * * root certbot renew --quiet && systemctl reload nginx
EOF
    success "Auto-renewal configured"
}

test_setup() {
    info "Testing setup"
    nginx -t || error "Nginx configuration invalid"
    systemctl reload nginx || error "Nginx reload failed"
    systemctl is-active --quiet nginx || error "Nginx not running"
    success "Setup complete!"
}

show_results() {
    echo
    echo "✓ SneezyMUD Nginx setup complete!"
    echo "  Your site: https://$DOMAIN_NAME"
    echo "  Certificates renew automatically"
    echo
}

undo_setup() {
    info "Removing Nginx setup"

    rm -f /etc/nginx/sites-enabled/redirect-to-https
    rm -f /etc/nginx/sites-enabled/sneezy-webclient
    rm -f /etc/nginx/sites-enabled/sneezy-http
    rm -f /etc/nginx/sites-available/redirect-to-https
    rm -f /etc/nginx/sites-available/sneezy-webclient
    rm -f /etc/nginx/sites-available/sneezy-http
    rm -f /etc/cron.d/certbot-renewal

    # Restore default Nginx behavior
    if [[ -f /etc/nginx/sites-available/default ]]; then
        ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
    fi

    nginx -t && systemctl reload nginx
    success "Nginx setup removed"
}

if [[ "$UNDO_MODE" == true ]]; then
    undo_setup
else
    info "Starting SneezyMUD Nginx setup"
    get_config
    install_packages
    create_initial_config
    get_ssl
    create_https_config
    setup_renewal
    test_setup
    show_results
fi
