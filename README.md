# sneezymud-docker

A Docker Compose configuration for easy, containerized deployment of SneezyMUD and its related services and/or developing against the SneezyMUD codebase.

## Quick Start

### Production Server

1. Install Docker & git, ensure they're available via CLI

2. Configure firewall

   - Allow all outgoing traffic
   - Block all incoming traffic
   - Open incoming ports 22, 80, 443, 7900, 7901, 8080, and 5001

3. Clone and navigate to repo:

   ```bash
   git clone --config core.autocrlf=input https://github.com/sneezymud/sneezymud-docker
   cd sneezymud-docker
   ```

4. Init database container (first time only):

   ```bash
   docker compose -f compose.yaml -f compose.prod.yaml up sneezy-db
   # Wait for database to finish loading data, then Ctrl+C to stop container
   ```

5. Start all services in background:

   ```bash
   docker compose -f compose.yaml -f compose.prod.yaml up -d
   ```

6. Connect to the game

   - Telnet/MUD client: `<server_IP>:7900`
   - Web client: Navigate to `http://<server_IP>:8080` in a browser

### Development

1. Install Docker & git on your local machine, ensure they're available via CLI

2. Clone repo to local machine:

   ```bash
   git clone --config core.autocrlf=input --recursive https://github.com/sneezymud/sneezymud-docker
   ```

3. Open `sneezymud-docker/services/sneezymud` directory in IDE of choice and develop as normal

4. When ready to compile and test changes, run the following command from the `sneezymud-docker` directory:

   ```bash
   docker compose -f compose.yaml -f compose.dev.yaml up -d
   ```

5. Connect and test in-game:

   - Telnet/MUD client: `localhost:7900`
   - Web browser: Navigate to `http://localhost:8080`

For detailed instructions, see sections below.

## Project Structure

The repository is organized as follows:

- `compose.yaml` - Base Docker Compose configuration shared between environments
- `compose.prod.yaml` - Production environment overrides and image specifications
- `compose.dev.yaml` - Development environment overrides with local builds
- `/services` - All service implementations and configurations
  - `/db` - Database service
    - `init.sql` - Database initialization script
    - `my.cnf` - MySQL configuration
    - `setup_mysql.sh` - Database setup script
  - `/sneezymud` - Git submodule containing the main Sneezy codebase
    - `Dockerfile` - Production build configuration
    - `dev.Dockerfile` - Development build configuration
  - `/monitor` - Container monitoring service for automatic updates
  - `/buildertools` - Builder tools web interface (Flask application)
  - `/webclient` - Web client service
    - `/connectificator` - Git submodule containing the Connectificator web client
- `/scripts` - Helper scripts and utilities
  - `/backups` - Automated backup system setup and management
    - `init-backups.sh` - Initialize, remove, or reconfigure backup system
  - `/nginx` - nginx configuration helpers
    - `init-nginx.sh` - Initialize or remove a fully-featured HTTPS configuration for nginx
  - `/tintin++` - TinTin++-related configuration files

### Service Components

- **sneezy-db**: MySQL database storing game world data, player information, and builder content
- **sneezy**: Main game server accepting direct telnet connections on port 7900
- **sneezy-monitor**: Service that monitors the game container, applying updates when available and ensuring it restarts after crashes/in-game shutdowns (production only)
- **websockify**: Proxy service converting WebSocket connections to TCP for web client compatibility
- **webclient**: Browser-based MUD client (Connectificator) served via nginx
- **buildertools**: Flask-based web interface for area, mob, and object creation/editing

All services communicate through the shared database, with the web client connecting through the websockify proxy to maintain compatibility with traditional MUD protocols.

## Creating/Managing A Production Server

### Server Requirements

When using Docker the host server can run any OS that Docker supports. That said, some flavor of Linux will likely provide the best results unless you have a specific reason to use something else. This README assumes you're using Linux.

Hosting on a physical server should work fine, but a cloud provider will probably be the easiest and most reliable method.

Most cloud server providers' lowest tiers will meet the requirements for running Sneezy decently these days, but some bare minimum specs to look for would be:

- 2+ CPU cores of 4 GHz or faster
- 8+ GB of RAM
- 20+ GB of disk space
- Static IP address

> [!TIP]
> Finding a provider that offers servers with solid-state hard drives is **highly recommended**. Without, you'll likely have noticeable game lag when periods of file I/O occur.

### Server Configuration

- Connect to your server as a user with `sudo` privileges

- Make sure the OS and packages are updated/upgraded

  - For example, on Debian/Ubuntu: `sudo apt update && sudo apt upgrade -y`

- Set up additional user accounts with SSH access and sudo permissions for anyone who will be involved in maintaining the server

- If you have a custom domain name (hopefully you do), create an `A` record through your domain registrar's DNS management console pointing the domain to your server's static IP

- Enable and configure a firewall of your choice (for example, `ufw` on Ubuntu)
  - A good starting point is to allow all outgoing traffic, block all incoming traffic, then then explicitly allow incoming traffic to ports:
    - 22 (SSH)
    - 80 (HTTP)
    - 443 (HTTPS)
    - 7900 (Sneezy telnet port)
    - 7901 (Websocket)
    - 8080 (Webclient)
    - 5001 (Web builder tools interface)

> [!WARNING]
> Don't use the default `docker` package provided by your distro's package manager. It's often outdated and can cause issues. Follow the official Docker installation instructions linked below.

> [!IMPORTANT]
> Make sure to follow Docker's [post-installation instructions](https://docs.docker.com/engine/install/linux-postinstall/)

- Install [Docker Engine](https://docs.docker.com/engine/install/)

- Install [git](https://git-scm.com/downloads/linux)

- Clone this repo to your home directory:

  ```bash
  cd ~
  git clone --config core.autocrlf=input https://github.com/sneezymud/sneezymud-docker
  ```

> [!TIP]
> Each server user should clone the repo to their own home directory and run any necessary Docker commands from there.

### Managing The Game/Service Containers

> [!NOTE]
> All Docker Compose commands should be executed from the `~/sneezymud-docker` directory:
>
> ```bash
> cd ~/sneezymud-docker
> ```

> [!TIP]
> Use `make help` to see all available commands. The Makefile provides convenient shortcuts for common Docker Compose operations.

- **First-time setup only:** On a fresh server, initialize the database before starting all services:

  ```bash
  make prod-init-db
  # Wait for "Db setup done" message, then Ctrl+C to stop container
  ```

- Run the game and other services by starting all containers in the background:

  ```bash
  make prod-up
  ```

> [!IMPORTANT]
> In production mode, after the initial startup of the containers, the `sneezy-monitor` service automatically manages the game container by monitoring its status and restarting it after crashes or in-game shutdowns. Before starting the `sneezy` container the monitor service will check for new Docker images and apply them, with rollback protection on failure.

## Accessing Services

> [!TIP]
> If you set up the optional nginx HTTPS configuration, you can use URL version instead of the port numbers below and get the benefits of HTTPS connections.
> See the [HTTPS Setup with Nginx](#https-setup-with-nginx) section below for more information.

### Game

- **Telnet**: `your-server:7900` (any MUD client: MUSHclient, Mudlet, TinTin++)
- **Web Browser**: `http://your-server:8080` or `https://your-server` with nginx (Connectificator web client)

### Builder Tools Web Interface

- **Web Browser**: `http://your-server:5001` or `https://your-server/build` with nginx

## Helpful Commands

> [!NOTE]
> Run `make help` to see all available commands. All commands must be executed from the `~/sneezymud-docker` directory.

```bash
# View live game logs
make logs

# Find crash stack traces
make logs-crash

# Open shell in sneezy container
make shell

# Open MariaDB shell
make db-shell

# Check container status
make status

# Stop all production containers
make prod-down

# Restart sneezy container (applies updates)
make prod-restart

# Run container without starting game (for maintenance/debugging)
make prod-maintenance
```

> [!WARNING]
> Restarting containers immediately ends the running game process. Ensure all players are logged out and the game world is saved before updating.

### Code Updates

New Docker images are automatically built and pushed to Docker Hub when code changes are merged to the [main Sneezy repo](https://github.com/sneezymud/sneezymud). See "Updates & Maintenance" above for update commands.

## Automatic Updates

Using the production `compose.prod.yaml` file enables automatic Docker image updates that trigger when the game server shuts down via the `sneezy-monitor` container.

A Discord webhook can optionally be configured via `.env` file to receive notifications when the game is updated.

See [services/monitor/README.md](services/monitor/README.md) for more info.

## Discord Integration

Sneezy supports Discord webhook integration for in-game events like player deaths, achievements, and system messages.

To enable Discord integration:

1. **Create Discord webhooks** for the channels you want to receive notifications

2. **Create a `discord.cfg` file** in the project root:

   ```bash
   cp services/sneezymud/code/discord-example.cfg discord.cfg
   ```

3. **Edit `discord.cfg`** and add your webhook URLs. See the file contents for details.

4. **Restart the game container** to load the new configuration

The game will automatically use the configuration file when it starts.

> [!IMPORTANT]
> In production mode, the `discord.cfg` file **must exist** or the container will fail to start. If you don't want Discord notifications, simply create an empty file (`touch discord.cfg`) or copy the example file without adding webhook URLs.

## Automated Backup System

For production servers it's highly recommended to set up automated backups of your important game data. This repo includes a script to help with this. See [`scripts/backups/README.md`](scripts/backups/README.md) for more information.

> [!IMPORTANT]
> The backup script only saves the backups to the server itself, which is much better than nothing but could still result in data loss in the event of a server failure. It's recommended to configure a secondary backup service that copies the backups to another location as well, but that's outside the scope of the script.

## HTTPS Setup with Nginx

For production servers, you may want to set up HTTPS to provide secure, encrypted connections and cleaner URLs for your web services. This repo includes a script that automatically configures Nginx as a reverse proxy with SSL certificates from Let's Encrypt. The script will prompt for your domain name and email, then automatically set up HTTPS with certificate auto-renewal.

> [!TIP]
> This is optional - the game and web services work fine without HTTPS, but many modern browsers show warnings for unencrypted connections.

See [`scripts/nginx/README.md`](scripts/nginx/README.md) for more information.

## Developing Using Docker

> [!TIP]
> For developing in WSL or Linux without using Docker, see [this guide](<https://github.com/sneezymud/sneezymud/wiki/Setting-Up-A-Sneezy-Development-Environment-(non%E2%80%90Docker,-Linux-or-Windows-WSL)>) in the Sneezy wiki

Developing against the main Sneezy codebase using Docker is a bit different than running a production instance, as you need to be able to make and test code changes immediately in a non-production environment.

> [!NOTE]
> Development mode uses `compose.dev.yaml` which excludes the automatic update monitor service. You'll need to manually restart containers to test changes.

This repo comes pre-configured to support this workflow, via:

1. Having the [main Sneezy repo](https://github.com/sneezymud/sneezymud) configured as a git submodule of this repo (the `services/sneezymud` subdirectory)
2. Defining a separate Docker Compose file (`compose.dev.yaml`) for use during development, which does the following:
   - Bind mounts the `services/sneezymud` subdirectory into the `sneezy` container
   - Uses the Dockerfile located at `services/sneezymud/Dockerfile` to build the `sneezy` container locally
   - Configures the `sneezy` container to compile the code contained in the bind mounted `services/sneezymud` directory and then run the resulting binary

This ensures that any changes made to the code on the host machine are immediately reflected in the container, and will be re-compiled and re-run automatically when the container is restarted.

### Development Setup

> [!NOTE]
> You'll want to do this on your own, local machine (not the server), and it should work on any OS that Docker supports.

> [!IMPORTANT]
> You'll need Docker Engine or Docker Desktop and git installed on your local machine (see instructions for the production server above)

- Clone the repo and required submodules:

  ```bash
  git clone --config core.autocrlf=input --recursive https://github.com/sneezymud/sneezymud-docker
  ```

- Update the `services/sneezymud` submodule to pull down any new commits and ensure you're developing against the most recent changes:

  ```bash
  git submodule update --remote
  ```

### Workflow

Open the `services/sneezymud` subdirectory in your IDE of choice. Modify code and use git as you normally would.

When ready to compile and test changes, start the containers:

```bash
make dev-up
```

If the containers are already running and you want to re-compile the code, simply restart the `sneezy` container:

```bash
make dev-rebuild
```

Then connect to the game via whatever client you normally use at `localhost:7900`.

> [!TIP]
> The only two containers _required_ for the game to successfully run are `sneezy` and `sneezy-db`. If you don't need to test or develop against the others, you can simply comment those container definitions out in the `compose.dev.yaml` file to simplify and speed things up a bit.

### Debugging

To debug using `gdb` inside the `sneezy` container, either run a new container with:

```bash
make dev-debug
```

Or attach to a running container with:

```bash
make dev-attach
```
