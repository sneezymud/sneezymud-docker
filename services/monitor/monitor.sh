#!/bin/bash
#
# SneezyMUD Container Monitor - Automatic image updates on container exit
#
# Monitors the sneezy container and automatically pulls/applies image updates
# when the container stops, ensuring minimal downtime and seamless updates
#
set -e

CONTAINER_NAME="${CONTAINER_NAME:-sneezy}"
IMAGE_NAME="${IMAGE_NAME:-sneezymud/sneezymud:latest}"
CHECK_INTERVAL=5
# Force project name to ensure containers are created in the correct compose project
UP_CMD="docker-compose -f compose.yaml -f compose.prod.yaml -p sneezymud-docker up -d --force-recreate --no-deps sneezy"
# Stores previous image ID to enable rollback when updates fail
PREVIOUS_IMAGE_ID=""

info() { echo "→ $(date '+%Y-%m-%d %H:%M:%S') $1"; }
success() { echo "✓ $(date '+%Y-%m-%d %H:%M:%S') $1"; }
error() { echo "✗ $(date '+%Y-%m-%d %H:%M:%S') $1" >&2; }

send_discord_notification() {
    local message="$1"
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        # Suppress output to avoid cluttering logs with curl responses
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

    # Preserve current image ID before pulling to enable rollback if new image fails
    local current_latest_id=$(docker inspect "$IMAGE_NAME" --format='{{.Id}}' 2>/dev/null || echo "")

    info "Pulling latest image: $IMAGE_NAME"
    docker pull "$IMAGE_NAME" >/dev/null 2>&1

    local latest_image_id=$(docker inspect "$IMAGE_NAME" --format='{{.Id}}' 2>/dev/null || echo "")

    if [ "$current_image_id" != "$latest_image_id" ] && [ -n "$latest_image_id" ]; then
        info "New image available (current: ${current_image_id:0:12}, latest: ${latest_image_id:0:12})"
        PREVIOUS_IMAGE_ID="$current_latest_id"
        return 0
    else
        info "Image is up to date"
        return 1
    fi
}

rollback_image() {
    if [ -n "$PREVIOUS_IMAGE_ID" ]; then
        info "Rolling back to previous image: ${PREVIOUS_IMAGE_ID:0:12}"
        # Restore previous image by re-tagging it as :latest
        docker tag "$PREVIOUS_IMAGE_ID" "$IMAGE_NAME" 2>/dev/null || {
            error "Failed to rollback image - previous image may have been removed"
            return 1
        }
        success "Successfully rolled back to previous image"
        return 0
    else
        error "No previous image available for rollback"
        return 1
    fi
}

fix_volume_permissions() {
    info "Ensuring sneezy-mutable volume has correct ownership"
    # Docker volumes default to root ownership, but sneezy container runs as UID 1000
    # This prevents filesystem permission errors during game startup
    docker run --rm \
        -v sneezymud-docker_sneezy-mutable:/mnt \
        alpine:latest \
        chown -R 1000:1000 /mnt 2>/dev/null || {
        info "Volume ownership already correct or unable to change"
    }
}

remove_existing_container() {
    if container_exists; then
        info "Removing existing container"
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
    fi
}

execute_compose_command() {
    cd /workspace
    eval "${UP_CMD}"
}

start_container_with_prep() {
    remove_existing_container
    fix_volume_permissions
    execute_compose_command
}

start_and_validate_container() {
    local success_msg="${1:-Container started successfully}"
    local failure_msg="${2:-Failed to start container}"

    if execute_compose_command; then
        # Allow container time to initialize before checking status
        sleep 3
        if is_container_running; then
            success "$success_msg"
            return 0
        fi
    fi

    error "$failure_msg"
    return 1
}

recreate_container() {
    info "Recreating container with latest image"
    remove_existing_container
    fix_volume_permissions
    info "Starting container with latest image"
    start_and_validate_container "Container recreated and started successfully" "Failed to start container"
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
            error "Failed to recreate container with new image - rolling back to previous version"
            send_discord_notification "❌ SneezyMUD update failed - rolling back to previous version"

            if rollback_image; then
                info "Attempting to start container with previous image"
                remove_existing_container

                if execute_compose_command; then
                    success "Successfully started container with previous image"
                    send_discord_notification "✅ SneezyMUD rollback successful - running previous version"
                else
                    error "Failed to start container even with previous image"
                    send_discord_notification "❌ SneezyMUD rollback failed - manual intervention required"
                fi
            else
                error "Rollback failed - manual intervention required"
                send_discord_notification "❌ SneezyMUD rollback failed - manual intervention required"
            fi
        fi
    else
        info "No updates available - restarting with current image"
        start_container_with_prep
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
            start_container_with_prep
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

    # Main monitoring loop - detects container state changes to trigger updates
    while true; do
        sleep $CHECK_INTERVAL

        local is_running=false
        if is_container_running; then
            is_running=true
        fi

        # Container stopped - check for updates and restart
        if [ "$was_running" = true ] && [ "$is_running" = false ]; then
            info "Container stopped - triggering restart with update check"
            handle_container_restart
        # Container failed to start or crashed - ensure it's running
        elif [ "$was_running" = false ] && [ "$is_running" = false ]; then
            info "Container should be running but isn't - ensuring it's started"
            ensure_container_running
        fi

        was_running=$is_running
    done
}

trap 'info "Monitor shutting down"; exit 0' SIGTERM SIGINT

main
