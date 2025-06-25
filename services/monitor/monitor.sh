#!/bin/bash
#
# SneezyMUD Container Monitor - Automatic image updates on container exit
#
set -e

CONTAINER_NAME="${CONTAINER_NAME:-sneezy}"
IMAGE_NAME="${IMAGE_NAME:-sneezymud/sneezymud:latest}"
CHECK_INTERVAL=5

info() { echo "→ $(date '+%Y-%m-%d %H:%M:%S') $1"; }
success() { echo "✓ $(date '+%Y-%m-%d %H:%M:%S') $1"; }
error() { echo "✗ $(date '+%Y-%m-%d %H:%M:%S') $1" >&2; }

send_discord_notification() {
    local message="$1"
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -X POST "$DISCORD_WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{\"content\": \"$message\"}" \
             >/dev/null 2>&1 || true
    fi
}

is_container_running() {
    docker ps --filter "name=$CONTAINER_NAME" --filter "status=running" --format "{{.Names}}" | grep -q "^$CONTAINER_NAME$"
}

container_exists() {
    docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "^$CONTAINER_NAME$"
}

get_container_status() {
    if container_exists; then
        docker ps -a --filter "name=$CONTAINER_NAME" --format "{{.Status}}"
    else
        echo "not found"
    fi
}

check_for_image_update() {
    info "Checking for image updates"

    local current_image_id=""
    if container_exists; then
        current_image_id=$(docker inspect "$CONTAINER_NAME" --format='{{.Image}}' 2>/dev/null || echo "")
    fi

    info "Pulling latest image: $IMAGE_NAME"
    docker pull "$IMAGE_NAME" >/dev/null 2>&1

    local latest_image_id=$(docker inspect "$IMAGE_NAME" --format='{{.Id}}' 2>/dev/null || echo "")

    if [ "$current_image_id" != "$latest_image_id" ] && [ -n "$latest_image_id" ]; then
        info "New image available (current: ${current_image_id:0:12}, latest: ${latest_image_id:0:12})"
        return 0
    else
        info "Image is up to date"
        return 1
    fi
}

recreate_container() {
    info "Recreating container with latest image"

    cd /workspace

    info "Recreating container with latest image"
    docker compose -f compose.yaml -f compose.prod.yaml up -d --force-recreate --no-deps sneezy

    sleep 3

    if is_container_running; then
        success "Container recreated and started successfully"
        return 0
    else
        error "Failed to start container"
        return 1
    fi
}

handle_container_restart() {
    info "Container stopped - checking for updates"

    if check_for_image_update; then
        info "Update available - recreating container with new image"
        send_discord_notification "🔄 SneezyMUD updating to latest version..."
        if recreate_container; then
            success "Container updated and restarted successfully"
            send_discord_notification "✅ SneezyMUD updated to latest version successfully!"
        else
            error "Failed to recreate container - attempting simple restart"
            send_discord_notification "❌ SneezyMUD update failed - falling back to previous version"
            docker compose -f compose.yaml -f compose.prod.yaml up -d sneezy
        fi
    else
        info "No updates available - restarting with current image"
        docker compose -f compose.yaml -f compose.prod.yaml up -d sneezy
    fi
}

ensure_container_running() {
    if ! is_container_running; then
        if container_exists; then
            local status=$(get_container_status)
            info "Container exists but not running (status: $status)"
            handle_container_restart
        else
            info "Container does not exist - starting initial container"
            docker compose -f compose.yaml -f compose.prod.yaml up -d sneezy
        fi
    fi
}

main() {
    info "Starting SneezyMUD container monitor"
    info "Monitoring container: $CONTAINER_NAME"
    info "Check interval: ${CHECK_INTERVAL}s"

    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        info "Discord notifications enabled for updates"
    else
        info "Discord notifications disabled (no webhook URL configured)"
    fi

    ensure_container_running

    local was_running=false
    if is_container_running; then
        was_running=true
        info "Container is currently running"
    fi

    while true; do
        sleep $CHECK_INTERVAL

        local is_running=false
        if is_container_running; then
            is_running=true
        fi

        if [ "$was_running" = true ] && [ "$is_running" = false ]; then
            info "Container stopped - triggering restart with update check"
            handle_container_restart
        elif [ "$was_running" = false ] && [ "$is_running" = false ]; then
            info "Container should be running but isn't - ensuring it's started"
            ensure_container_running
        fi

        was_running=$is_running
    done
}

trap 'info "Monitor shutting down"; exit 0' SIGTERM SIGINT

main
