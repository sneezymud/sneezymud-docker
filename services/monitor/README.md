# SneezyMUD Monitor Service

Provides automatic container management and updates for production SneezyMUD deployments.

## Overview

When using the production Compose setup, the `sneezy-monitor` container is responsible for restarting the main `sneezy` container when it exits for any reason.

Before restarting the game, `sneezy-monitor` will check if a new Docker image is available, downloading the image and recreating the `sneezy` container if so.

The main benefit of this service is in automating the application of new updates to the game without requiring someone log into the server and manually perform the update process, and allowing imms to apply updates from in-game without needing to know how to connect to the server and use Docker.

## Discord Notifications

Optionally, you can configure a `.env` file on the server to enable Discord notifications via webhook from the monitor when new updates are applied.

To receive Discord notifications for server events:

1. **Create a Discord webhook** in your server settings:
   - Go to Server Settings → Integrations → Webhooks
   - Click "New Webhook"
   - Choose a channel and copy the webhook URL it creates

2. **Configure the webhook**:

   ```bash
   # On the server, copy the example file:
   cp .env.example .env

   # Edit the new .env file and set the webhook URL:
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE
   ```

3. **Restart the service**:

   ```bash
   docker compose -f compose.yaml -f compose.prod.yaml up -d sneezy-monitor --force-recreate --no-deps
   ```

The system will now send notifications for:

- When a new Docker image is available and updating begins
- Update success or failure status

> [!TIP]
> The game container itself handles notifications for normal shutdowns and restarts. The monitor only notifies about image updates.

## Manual Control

If you need to disable automatic restarts for some reason, just stop the monitor service:

```bash
docker compose -f compose.yaml -f compose.prod.yaml down sneezy-monitor
```

From then on you'll have to manage the game container manually. To re-enable automatic restarts, just bring the monitor service back up:

```bash
docker compose -f compose.yaml -f compose.prod.yaml up -d sneezy-monitor
```

## Crash Log Preservation

The monitor service automatically preserves container logs before recreating the sneezy container, primarily to make crash logs available for debugging purposes. Logs get rotated automatically to prevent disk space issues, retaining the most recent 20 log files. This number can be changed by modifying `monitor.sh` and recreating the monitor container.

### Viewing Archived Logs

Crash logs are stored in `/var/tmp/sneezymud-logs/` on the host server via bind mount and can be accessed with standard commands:

```bash
# List all available log archives
ls -la /var/tmp/sneezymud-logs/

# View the most recent log file
ls -t /var/tmp/sneezymud-logs/sneezy-*.log | head -1 | xargs cat

# View a specific log file by timestamp
cat /var/tmp/sneezymud-logs/sneezy-20250107-143022.log

# Search for specific errors across all logs
grep -r "segmentation fault" /var/tmp/sneezymud-logs/
```

## Technical Details

The monitor service runs in a privileged container with access to the Docker socket, allowing it to manage other containers. It uses Docker-in-Docker techniques to:

- Inspect and manage the game container lifecycle
- Pull new Docker images and compare versions
- Handle bind mount path resolution for configuration files
- Provide rollback capabilities when updates fail
- Archive container logs before recreation to preserve crash information

### Retry and Rollback Logic

The monitor implements sophisticated retry logic to handle container startup issues (added October 2025):

**Startup Configuration (environment variables with defaults):**

- `STARTUP_VALIDATION_DELAY` (default: 15) - Seconds to wait before checking if container is running
- `STARTUP_RETRY_ATTEMPTS` (default: 3) - Number of startup attempts before triggering rollback
- `STARTUP_RETRY_DELAY` (default: 10) - Seconds between retry attempts

**Update Flow:**

1. Container stops (shutdown command or crash)
2. Monitor checks Docker Hub for new image
3. If update available, pulls new image and saves previous image ID
4. Attempts to start container with up to 3 retries
5. On success: clears failure tracking
6. On failure: triggers automatic rollback

**Rollback Protection:**

- Failed image IDs are tracked to prevent retry loops
- After rollback, next image pull is skipped to avoid immediate retry of failed image
- Rollback itself uses same retry logic (3 attempts with delays)
- Discord notifications sent at each major state transition

This prevents scenarios where a slow-starting container triggers unnecessary rollbacks, while still protecting against genuinely broken images. The system prioritizes service availability over running the absolute latest version.

For implementation details, see the `monitor.sh` script in this directory.

