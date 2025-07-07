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

## Technical Details

The monitor service runs in a privileged container with access to the Docker socket, allowing it to manage other containers. It uses Docker-in-Docker techniques to:

- Inspect and manage the game container lifecycle
- Pull new Docker images and compare versions
- Handle bind mount path resolution for configuration files
- Provide rollback capabilities when updates fail

For implementation details, see the `monitor.sh` script in this directory.
