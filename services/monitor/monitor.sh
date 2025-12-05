#!/bin/bash
#
# SneezyMUD Container Monitor - Automatic image updates on container exit
#
# Monitors the sneezy container and automatically pulls/applies image updates
# when the container stops, ensuring minimal downtime and seamless updates
#
set -e

# Configuration
readonly CONTAINER_NAME="${CONTAINER_NAME:-sneezy}"
readonly IMAGE_NAME="${IMAGE_NAME:-sneezymud/sneezymud:latest}"
readonly CHECK_INTERVAL=5
readonly MONITOR_CONTAINER_NAME="${MONITOR_CONTAINER_NAME:-sneezy-monitor}"
readonly LOG_ARCHIVE_DIR="${LOG_ARCHIVE_DIR:-/logs}"
readonly MAX_LOG_FILES="${MAX_LOG_FILES:-20}"
readonly STARTUP_VALIDATION_DELAY="${STARTUP_VALIDATION_DELAY:-15}"  # Seconds to wait before checking container status
readonly STARTUP_RETRY_ATTEMPTS="${STARTUP_RETRY_ATTEMPTS:-3}"      # Number of startup attempts before rollback
readonly STARTUP_RETRY_DELAY="${STARTUP_RETRY_DELAY:-10}"           # Seconds between retry attempts

# Global state for rollback functionality
PREVIOUS_IMAGE_ID=""
LAST_FAILED_IMAGE_ID=""  # Track failed images to avoid retry loops
SKIP_IMAGE_PULL=false    # Skip pull after rollback to prevent loop

# Logging functions with consistent timestamp format
info() { echo "→ $(date '+%Y-%m-%d %H:%M:%S') $1"; }
success() { echo "✓ $(date '+%Y-%m-%d %H:%M:%S') $1"; }
error() { echo "✗ $(date '+%Y-%m-%d %H:%M:%S') $1" >&2; }

# Sends Discord notification if webhook URL is configured
# Failures are silently ignored to prevent monitor disruption
send_discord_notification() {
    local message="$1"
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -X POST "$DISCORD_WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{\"content\": \"$message\"}" \
             >/dev/null 2>&1 || true
    fi
}

# Container state checking functions
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

# Checks for image updates and preserves previous version for rollback
# Returns 0 if update available, 1 if current image is latest
check_for_image_update() {
    # Skip pull if we just rolled back to avoid retry loop
    if [ "$SKIP_IMAGE_PULL" = true ]; then
        info "Skipping image pull after recent rollback"
        SKIP_IMAGE_PULL=false
        return 1
    fi

    info "Checking for image updates"

    local current_image_id=""
    if container_exists; then
        current_image_id=$(docker inspect "$CONTAINER_NAME" --format='{{.Image}}' 2>/dev/null || echo "")
    fi

    # Store current latest image ID before pulling - enables rollback if new version fails
    local current_latest_id=$(docker inspect "$IMAGE_NAME" --format='{{.Id}}' 2>/dev/null || echo "")

    info "Pulling latest image: $IMAGE_NAME"
    if ! docker pull "$IMAGE_NAME" >/dev/null 2>&1; then
        error "Failed to pull latest image"
        return 1
    fi

    local latest_image_id=$(docker inspect "$IMAGE_NAME" --format='{{.Id}}' 2>/dev/null || echo "")

    # Don't try an image we know recently failed
    if [ -n "$LAST_FAILED_IMAGE_ID" ] && [ "$latest_image_id" = "$LAST_FAILED_IMAGE_ID" ]; then
        info "Latest image matches recently failed image (${latest_image_id:0:12}) - skipping update"
        return 1
    fi

    if [ "$current_image_id" != "$latest_image_id" ] && [ -n "$latest_image_id" ]; then
        info "New image available (current: ${current_image_id:0:12}, latest: ${latest_image_id:0:12})"
        PREVIOUS_IMAGE_ID="$current_latest_id"
        return 0
    else
        info "Image is up to date"
        return 1
    fi
}

# Rolls back to previous image version by re-tagging
# Critical for recovery when new image versions fail to start properly
rollback_image() {
    if [ -n "$PREVIOUS_IMAGE_ID" ]; then
        info "Rolling back to previous image: ${PREVIOUS_IMAGE_ID:0:12}"
        if docker tag "$PREVIOUS_IMAGE_ID" "$IMAGE_NAME" 2>/dev/null; then
            success "Successfully rolled back to previous image"
            return 0
        else
            error "Failed to rollback image - previous image may have been removed"
            return 1
        fi
    else
        error "No previous image available for rollback"
        return 1
    fi
}

# Ensures volume ownership matches container user to prevent permission errors
# SneezyMUD container runs as UID 1000, but Docker volumes default to root
fix_volume_permissions() {
    info "Ensuring sneezy-mutable volume has correct ownership"
    docker run --rm \
        -v sneezymud-docker_sneezy-mutable:/mnt \
        alpine:latest \
        chown -R 1000:1000 /mnt 2>/dev/null || {
        info "Volume ownership already correct or unable to change"
    }
}

# Saves container logs to timestamped archive file before removal
# Critical for preserving crash logs that would otherwise be lost
save_container_logs() {
    if ! container_exists; then
        return 0
    fi

    # Ensure log directory exists
    mkdir -p "$LOG_ARCHIVE_DIR" || {
        error "Failed to create log archive directory: $LOG_ARCHIVE_DIR"
        return 1
    }

    local timestamp=$(date '+%Y%m%d-%H%M%S')
    local log_file="$LOG_ARCHIVE_DIR/sneezy-${timestamp}.log"

    info "Saving container logs to ${log_file##*/}"

    # Save logs with error handling - don't fail if logs are empty or inaccessible
    # Use touch to test write permissions first
    if ! touch "$log_file" 2>/dev/null; then
        error "Cannot write to log directory: $LOG_ARCHIVE_DIR (check permissions)"
        return 1
    fi

    if docker logs "$CONTAINER_NAME" > "$log_file" 2>&1; then
        # Only keep the file if it has content (more than just whitespace)
        if [ -s "$log_file" ] && grep -q '[^[:space:]]' "$log_file" 2>/dev/null; then
            success "Container logs saved ($(wc -l < "$log_file") lines)"
            rotate_old_logs
        else
            # Remove empty or whitespace-only log files
            rm -f "$log_file"
            info "No meaningful logs to save"
        fi
    else
        error "Failed to save container logs"
        rm -f "$log_file"
        return 1
    fi
}

# Removes old log files to prevent disk space issues
# Keeps the most recent MAX_LOG_FILES files based on modification time
rotate_old_logs() {
    local log_count=$(find "$LOG_ARCHIVE_DIR" -name "sneezy-*.log" -type f | wc -l)

    if [ "$log_count" -gt "$MAX_LOG_FILES" ]; then
        local files_to_remove=$((log_count - MAX_LOG_FILES))
        info "Rotating logs: removing $files_to_remove old files (keeping $MAX_LOG_FILES most recent)"

        # Remove oldest files, keeping the most recent MAX_LOG_FILES
        find "$LOG_ARCHIVE_DIR" -name "sneezy-*.log" -type f -printf '%T@ %p\n' | \
            sort -n | \
            head -n "$files_to_remove" | \
            cut -d' ' -f2- | \
            xargs rm -f
    fi
}

# Removes existing container to ensure clean state for recreation
remove_existing_container() {
    if container_exists; then
        save_container_logs
        info "Removing existing container"
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
    fi
}

# Detects host project directory to resolve Docker-in-Docker bind mount path issues
# When monitor runs docker-compose from inside container, relative paths in compose files
# must be resolved relative to host filesystem, not container filesystem
get_host_project_directory() {
    docker inspect "$MONITOR_CONTAINER_NAME" \
        --format '{{ range .Mounts }}{{ if eq .Destination "/workspace" }}{{ .Source }}{{ end }}{{ end }}' \
        2>/dev/null || echo ""
}

# Executes docker compose with proper path resolution for bind mounts
# Uses host project directory for path resolution while accessing compose files from container
execute_compose_command() {
    cd /workspace || {
        error "Failed to change to workspace directory"
        return 1
    }

    local host_project_dir=$(get_host_project_directory)

    if [ -n "$host_project_dir" ]; then
        # Critical: Use host path for --project-directory to resolve bind mounts correctly
        # but access compose files from /workspace where monitor can read them
        docker compose \
            --project-directory "$host_project_dir" \
            -f /workspace/compose.yaml \
            -f /workspace/compose.prod.yaml \
            -p sneezymud-docker \
            up -d --force-recreate --no-deps sneezy
    else
        error "Unable to detect host project directory - bind mounts may not work correctly"
        return 1
    fi
}

# Centralized container startup with all necessary preparation steps
# Ensures consistent setup across all container start scenarios
start_container_with_prep() {
    remove_existing_container
    fix_volume_permissions
    execute_compose_command
}

# Starts container and validates it's running properly
# Includes startup delay to allow container initialization
start_and_validate_container() {
    local success_msg="${1:-Container started successfully}"
    local failure_msg="${2:-Failed to start container}"

    if execute_compose_command; then
        # Container needs more time to initialize before status check is reliable
        info "Waiting ${STARTUP_VALIDATION_DELAY}s for container to initialize..."
        sleep "$STARTUP_VALIDATION_DELAY"

        if is_container_running; then
            success "$success_msg"
            return 0
        fi
    fi

    error "$failure_msg"
    return 1
}

# Attempts to start container with retry logic
# Returns 0 on success, 1 if all attempts fail
start_container_with_retries() {
    local attempt=1

    while [ $attempt -le "$STARTUP_RETRY_ATTEMPTS" ]; do
        if [ $attempt -gt 1 ]; then
            info "Startup attempt $attempt of $STARTUP_RETRY_ATTEMPTS (waiting ${STARTUP_RETRY_DELAY}s before retry)"
            sleep "$STARTUP_RETRY_DELAY"
        else
            info "Starting container (attempt $attempt of $STARTUP_RETRY_ATTEMPTS)"
        fi

        # Full cleanup on each attempt ensures no stale container state or volume
        # permission issues persist between retries
        remove_existing_container
        fix_volume_permissions

        if execute_compose_command; then
            info "Waiting ${STARTUP_VALIDATION_DELAY}s for container to initialize..."
            sleep "$STARTUP_VALIDATION_DELAY"

            if is_container_running; then
                success "Container started successfully on attempt $attempt"
                return 0
            else
                error "Container failed to start on attempt $attempt"
            fi
        else
            error "Failed to execute compose command on attempt $attempt"
        fi

        attempt=$((attempt + 1))
    done

    error "Container failed to start after $STARTUP_RETRY_ATTEMPTS attempts"
    return 1
}

# Handles rollback scenario when new image fails to start
# Ensures service availability by falling back to known-good version
handle_rollback_scenario() {
    local failed_image_id=$(docker inspect "$IMAGE_NAME" --format='{{.Id}}' 2>/dev/null || echo "")

    error "Failed to recreate container with new image - rolling back to previous version"
    send_discord_notification "❌ SneezyMUD update failed - rolling back to previous version"

    # Track the failed image to prevent retry loops
    if [ -n "$failed_image_id" ]; then
        LAST_FAILED_IMAGE_ID="$failed_image_id"
        info "Marking image ${failed_image_id:0:12} as failed to prevent retry loops"
    fi

    if rollback_image; then
        # Skip next image pull to avoid immediately retrying the failed image
        SKIP_IMAGE_PULL=true

        info "Attempting to start container with previous image"

        if start_container_with_retries; then
            success "Successfully started container with previous image"
            send_discord_notification "✅ SneezyMUD rollback successful - running previous version"
        else
            error "Failed to start container even with previous image after $STARTUP_RETRY_ATTEMPTS attempts"
            send_discord_notification "❌ SneezyMUD rollback failed - manual intervention required"
        fi
    else
        error "Rollback failed - manual intervention required"
        send_discord_notification "❌ SneezyMUD rollback failed - manual intervention required"
    fi
}

# Main restart handler - checks for updates and manages rollback on failure
# Prioritizes service availability over running latest version
handle_container_restart() {
    info "Container stopped - checking for updates"

    if check_for_image_update; then
        info "Update available - recreating container with new image"
        send_discord_notification "🔄 SneezyMUD updating to latest version..."

        if start_container_with_retries; then
            success "Container updated and restarted successfully"
            send_discord_notification "✅ SneezyMUD updated to latest version successfully!"
            # Clear failed image tracking on success
            LAST_FAILED_IMAGE_ID=""
        else
            handle_rollback_scenario
        fi
    else
        info "No updates available - restarting with current image"
        if ! start_container_with_retries; then
            error "Failed to restart container with current image after $STARTUP_RETRY_ATTEMPTS attempts"
            send_discord_notification "❌ SneezyMUD failed to restart - manual intervention required"
        fi
    fi
}

# Ensures container is running, handling both missing and stopped states
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

# Initializes monitor and displays configuration
initialize_monitor() {
    info "Starting SneezyMUD container monitor"
    info "Monitoring container: $CONTAINER_NAME"
    info "Check interval: ${CHECK_INTERVAL}s"
    info "Startup validation delay: ${STARTUP_VALIDATION_DELAY}s"
    info "Startup retry attempts: $STARTUP_RETRY_ATTEMPTS (${STARTUP_RETRY_DELAY}s between retries)"
    info "Log archive directory: $LOG_ARCHIVE_DIR (keeping $MAX_LOG_FILES files)"

    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        info "Discord notifications enabled for updates"
    else
        info "Discord notifications disabled (no webhook URL configured)"
    fi
}

# Main monitoring loop - detects state changes to trigger appropriate actions
# Uses state tracking to avoid unnecessary operations on stable containers
run_monitoring_loop() {
    local was_running=false
    if is_container_running; then
        was_running=true
        info "Container is currently running"
    fi

    while true; do
        sleep "$CHECK_INTERVAL"

        local is_running=false
        if is_container_running; then
            is_running=true
        fi

        # State transition: running -> stopped (normal restart scenario)
        if [ "$was_running" = true ] && [ "$is_running" = false ]; then
            info "Container stopped - triggering restart with update check"
            handle_container_restart
        # State: stopped -> stopped (failure recovery scenario)
        elif [ "$was_running" = false ] && [ "$is_running" = false ]; then
            info "Container should be running but isn't - ensuring it's started"
            ensure_container_running
        fi

        was_running=$is_running
    done
}

# Main entry point
main() {
    initialize_monitor
    ensure_container_running
    run_monitoring_loop
}

# Graceful shutdown handling
trap 'info "Monitor shutting down"; exit 0' SIGTERM SIGINT

main
