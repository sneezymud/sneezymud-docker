# Automatic Container Updates

When using the production Compose setup, the `sneezy-monitor` container is responsible for restarting the main `sneezy` container when it exits for any reason.

Before restarting the game, `sneezy-monitor` will check if a new Docker image is available, downloading the image and recreating the `sneezy` container if so.

This keeps the game up to date with the latest changes without requiring someone to log into the server and manually perform the update process, and allows imms to apply updates without needing to know how to connect to the server and use Docker.

## Discord Notifications

Optionally, you can configure a `.env` file on the server to enable Discord notifications via webhook from the monitor when new updates are applied. See the next section for details.

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

3. **Restart the services**:

   ```bash
   docker compose -f compose.yaml -f compose.prod.yaml up -d
   ```

The system will now send notifications for:

- When a new Docker image is available and updating begins
- Update success or failure status

**Note**: The game container itself handles notifications for normal shutdowns and restarts. The monitor only notifies about image updates.

**Note**: The `.env` file is automatically excluded from git to keep your webhook URL private.

## Manual Control

Force an immediate update check:

```bash
# Stop the game container
docker compose -f compose.yaml -f compose.prod.yaml stop sneezy

# Monitor will automatically detect and handle the restart
```

Restart just the monitor service:

```bash
docker compose -f compose.yaml -f compose.prod.yaml restart sneezy-monitor
```
