#!/bin/bash
set -e

echo "→ Configuring Docker socket access..."

# Get the GID of the docker socket
if ! DOCKER_GID=$(stat -c '%g' /var/run/docker.sock 2>/dev/null); then
    echo "✗ Error: Cannot access Docker socket at /var/run/docker.sock"
    echo "  Make sure the Docker socket is mounted: -v /var/run/docker.sock:/var/run/docker.sock"
    exit 1
fi

echo "→ Detected Docker socket GID: $DOCKER_GID"

# Create or update docker group with the correct GID
if getent group docker >/dev/null 2>&1; then
    echo "→ Docker group exists, checking GID..."
    CURRENT_GID=$(getent group docker | cut -d: -f3)
    if [ "$CURRENT_GID" != "$DOCKER_GID" ]; then
        echo "→ Updating docker group GID from $CURRENT_GID to $DOCKER_GID"
        groupmod -g "$DOCKER_GID" docker 2>/dev/null || {
            echo "→ Cannot change docker group GID (likely in use), creating docker$DOCKER_GID group instead"
            addgroup -g "$DOCKER_GID" "docker$DOCKER_GID"
            DOCKER_GROUP="docker$DOCKER_GID"
        }
    else
        echo "→ Docker group already has correct GID: $DOCKER_GID"
    fi
else
    echo "→ Creating docker group with GID: $DOCKER_GID"
    addgroup -g "$DOCKER_GID" docker
fi

# Determine which docker group to use
DOCKER_GROUP=${DOCKER_GROUP:-docker}

# Add monitor user to the docker group
echo "→ Adding monitor user to $DOCKER_GROUP group"
adduser monitor "$DOCKER_GROUP" 2>/dev/null || true

echo "✓ Docker socket access configured"

# Switch to monitor user and run the monitor script
echo "→ Starting monitor as user 'monitor'..."
exec su -c "/usr/local/bin/monitor.sh" monitor
